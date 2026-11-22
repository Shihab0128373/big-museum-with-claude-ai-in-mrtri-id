// Shared easel: both players draw on ONE canvas in real time (strokes relayed by the server), with colours, brush size,
// eraser, per-player undo, clear, and "Hang in museum" (renders a PNG and uploads it as a photo into the Our Art gallery).
// The same strokes are also drawn onto a small preview canvas that is the texture of the easel in the 3D museum.
import { ART_SECTION } from './sections.js';

const W = 1200, H = 900, PAPER = '#fffdf8';
const COLORS = ['#1b1b1f', '#ffffff', '#e8403a', '#ff8f3a', '#ffd23a', '#7bd152', '#2fb36d', '#3ac7d8', '#3a7bff', '#7a4dff', '#d94fd0', '#ff7aa8', '#8a5a34', '#9aa0ab'];
const uid = () => (Date.now().toString(36) + Math.random().toString(36).slice(2, 8)).slice(-20);

export class ArtStudio {
  constructor({ net, gallery, toast, easel, onOpenChange = () => {} }) {
    const $ = id => document.getElementById(id); this.$ = $; Object.assign(this, { net, gallery, toast, easel, onOpenChange });
    this.root = $('art'); this.cv = $('art-canvas'); this.ctx = this.cv.getContext('2d'); this.cv.width = W; this.cv.height = H;
    this.strokes = []; this.byId = new Map(); this.cur = null; this.open = false; this.dirty = true; this.previewT = 0; this.synced = false;
    this.color = COLORS[2]; this.size = 10; this.eraser = false; this.sentT = 0; this.busy = false;
    this.fill(this.ctx); this.buildUI(); this.bindPointer(); this.bindNet();
    addEventListener('resize', () => this.layout());
  }
  /* ---------- drawing primitives ---------- */
  fill(g) { g.fillStyle = PAPER; g.fillRect(0, 0, W, H); }
  paint(g, s, from) { // draw the points of stroke s from index `from` (in points) onward
    const p = s.p, col = s.e ? PAPER : s.c; g.lineCap = g.lineJoin = 'round'; g.strokeStyle = g.fillStyle = col; g.lineWidth = s.s;
    if (p.length === 2 && from === 0) { g.beginPath(); g.arc(p[0], p[1], s.s / 2, 0, Math.PI * 2); g.fill(); return; }
    g.beginPath(); let i = Math.max(0, from - 1); g.moveTo(p[i * 2], p[i * 2 + 1]); if (from === 0 && p.length === 4 && p[0] === p[2] && p[1] === p[3]) { g.arc(p[0], p[1], s.s / 2, 0, Math.PI * 2); g.fill(); return; }
    for (i = Math.max(1, from); i < p.length / 2; i++) g.lineTo(p[i * 2], p[i * 2 + 1]); g.stroke();
  }
  redraw(g = this.ctx) { this.fill(g); for (const s of this.strokes) this.paint(g, s, 0); this.dirty = true; }
  /* ---------- UI ---------- */
  buildUI() {
    const $ = this.$, sw = $('art-colors');
    COLORS.forEach(c => { const b = document.createElement('button'); b.className = 'sw'; b.style.background = c; b.dataset.c = c; b.title = c; b.onclick = () => { this.color = c; this.eraser = false; this.refreshUI(); }; sw.appendChild(b); });
    $('art-custom').oninput = e => { this.color = e.target.value; this.eraser = false; this.refreshUI(); };
    $('art-size').oninput = e => { this.size = +e.target.value; this.refreshUI(); };
    $('art-eraser').onclick = () => { this.eraser = !this.eraser; this.refreshUI(); };
    $('art-undo').onclick = () => this.undo(); $('art-clear').onclick = () => this.clear(); $('art-hang').onclick = () => this.hang(); $('art-close').onclick = () => this.close();
    addEventListener('keydown', e => { if (!this.open) return; if (e.key === 'Escape') this.close(); if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); this.undo(); } });
    this.refreshUI();
  }
  refreshUI() {
    const $ = this.$; document.querySelectorAll('#art-colors .sw').forEach(b => b.classList.toggle('on', !this.eraser && b.dataset.c === this.color));
    $('art-eraser').classList.toggle('on', this.eraser); const dot = $('art-dot'); dot.style.width = dot.style.height = Math.max(4, Math.min(34, this.size * .9)) + 'px'; dot.style.background = this.eraser ? '#fff' : this.color; dot.style.outline = this.eraser ? '2px dashed #888' : 'none';
    $('art-undo').disabled = !this.strokes.some(s => s.mine);
  }
  layout() { // fit a 4:3 canvas into the stage
    const st = this.$('art-stage'), r = st.getBoundingClientRect(), w = Math.max(100, r.width - 8), h = Math.max(100, r.height - 8), k = Math.min(w / W, h / H);
    this.cv.style.width = Math.floor(W * k) + 'px'; this.cv.style.height = Math.floor(H * k) + 'px';
  }
  async openStudio() {
    if (this.open) return; this.open = true; this.root.hidden = false; document.body.classList.add('art-open'); this.onOpenChange(true); requestAnimationFrame(() => this.layout()); this.layout();
    await this.sync(); this.refreshUI();
  }
  close() { if (!this.open) return; this.flush(true); this.cur = null; this.open = false; this.root.hidden = true; document.body.classList.remove('art-open'); this.onOpenChange(false); }
  /* ---------- pointer input ---------- */
  pt(e) { const r = this.cv.getBoundingClientRect(); return [Math.max(0, Math.min(W, Math.round((e.clientX - r.left) * W / r.width))), Math.max(0, Math.min(H, Math.round((e.clientY - r.top) * H / r.height)))]; }
  bindPointer() {
    const cv = this.cv;
    cv.addEventListener('pointerdown', e => {
      if (e.button > 0 || this.cur) return; e.preventDefault(); cv.setPointerCapture(e.pointerId);
      const [x, y] = this.pt(e), s = { id: uid(), c: this.color, s: this.size, e: this.eraser ? 1 : 0, p: [x, y], mine: true, sent: 0 };
      this.cur = s; this.strokes.push(s); this.byId.set(s.id, s); this.paint(this.ctx, s, 0); this.dirty = true; this.refreshUI(); this.flush(false);
    });
    cv.addEventListener('pointermove', e => {
      const s = this.cur; if (!s) return; e.preventDefault(); const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
      const from = s.p.length / 2; for (const ev of (evs.length ? evs : [e])) { const [x, y] = this.pt(ev), n = s.p.length; if (Math.hypot(x - s.p[n - 2], y - s.p[n - 1]) >= 2) { if (n < 7800) s.p.push(x, y); } }
      if (s.p.length / 2 > from) { this.paint(this.ctx, s, from); this.dirty = true; } this.flush(false);
    });
    const end = e => { const s = this.cur; if (!s) return; this.cur = null; if (s.p.length === 2) s.p.push(s.p[0], s.p[1]); this.flush(true, s); };
    cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end); cv.addEventListener('contextmenu', e => e.preventDefault());
  }
  /* ---------- networking ---------- */
  flush(force, stroke = this.cur) {
    const s = stroke; if (!s || !s.mine) return; const now = performance.now(); if (!force && now - this.sentT < 60) return;
    while (s.sent < s.p.length) { const chunk = s.p.slice(s.sent, s.sent + 360); s.sent += chunk.length; this.sentT = now;
      this.net.request('art-stroke', { id: s.id, c: s.c, s: s.s, e: s.e, p: chunk }).then(r => { if (r?.error && !s.err) { s.err = 1; this.toast(r.error, 'err'); } }); }
  }
  async sync() {
    const r = await this.net.request('art-sync'); if (!r || r.error || !r.strokes) return;
    const mine = new Set(this.strokes.filter(s => s.mine && (s.sent || 0) >= s.p.length).map(s => s.id)); // keep ownership flags for undo
    this.strokes = r.strokes.map(s => ({ ...s, mine: mine.has(s.id) })); this.byId = new Map(this.strokes.map(s => [s.id, s])); this.synced = true; this.redraw(); this.refreshUI();
  }
  bindNet() {
    this.net.on('art-stroke', c => {
      let s = this.byId.get(c.id), from;
      if (!s) { s = { id: c.id, c: c.c, s: c.s, e: c.e, p: [], mine: false }; this.strokes.push(s); this.byId.set(s.id, s); from = 0; } else from = s.p.length / 2;
      s.p.push(...c.p); this.paint(this.ctx, s, from); this.dirty = true;
    });
    this.net.on('art-remove', id => { const s = this.byId.get(id); if (!s) return; this.strokes = this.strokes.filter(x => x !== s); this.byId.delete(id); this.redraw(); this.refreshUI(); });
    this.net.on('art-clear', () => { this.strokes = []; this.byId.clear(); this.redraw(); this.refreshUI(); this.toast('The canvas was cleared'); });
  }
  undo() { for (let i = this.strokes.length - 1; i >= 0; i--) { const s = this.strokes[i]; if (s.mine) { if (this.cur === s) this.cur = null; this.strokes.splice(i, 1); this.byId.delete(s.id); this.net.request('art-undo', s.id); this.redraw(); this.refreshUI(); return; } } }
  clear() { if (!this.strokes.length || !confirm('Clear the whole canvas for both of you?')) return; this.strokes = []; this.byId.clear(); this.net.request('art-clear'); this.redraw(); this.refreshUI(); }
  /** render full-size PNG and hang it in the "Our Art" gallery */
  async hang() {
    if (this.busy) return; if (!this.strokes.length) return this.toast('Draw something first', 'err');
    this.busy = true; const b = this.$('art-hang'); b.disabled = true; b.textContent = 'Hanging…';
    try {
      const c = document.createElement('canvas'); c.width = W; c.height = H; this.redraw(c.getContext('2d'));
      const blob = await new Promise(res => c.toBlob(res, 'image/png')); if (!blob) throw new Error('Could not render the picture');
      const fd = new FormData(); fd.append('photos', blob, 'drawing.png');
      const r = await this.gallery.api(`/api/photos?room=${ART_SECTION}`, { method: 'POST', body: fd });
      if (r.errors?.length && !r.added?.length) throw new Error(r.errors[0]);
      const p = r.added[0], d = new Date(); await this.gallery.api(`/api/photos/${p.id}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ caption: `Drawn together · ${d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}` }) }).catch(() => {});
      this.toast('Hung in the museum ♥ — see it in the “Our Art” gallery'); await this.gallery.refresh();
      if (confirm('Start a fresh blank canvas?')) { this.strokes = []; this.byId.clear(); this.net.request('art-clear'); this.redraw(); this.refreshUI(); }
    } catch (e) { this.toast(e.message || 'Could not hang the picture', 'err'); }
    b.disabled = false; b.textContent = 'Hang in museum'; this.busy = false;
  }
  /** call every frame: keeps the 3D easel texture up to date (cheap, throttled) */
  tick(dt) {
    this.previewT += dt; if (!this.dirty || this.previewT < .45 || !this.easel) return; this.previewT = 0; this.dirty = false;
    const g = this.easel.canvas.getContext('2d'); g.drawImage(this.cv, 0, 0, W, H, 0, 0, this.easel.canvas.width, this.easel.canvas.height); this.easel.tex.needsUpdate = true;
  }
}
