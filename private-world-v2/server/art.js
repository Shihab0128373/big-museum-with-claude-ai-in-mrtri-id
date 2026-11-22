// Shared drawing board per room (the easel in the museum). Strokes are validated, stored in memory and
// persisted (debounced) to DATA/art/<ROOM>.json so a drawing survives restarts when a disk is mounted.
const fs = require('fs'), path = require('path');
const W = 1200, H = 900, MAX_STROKES = 500, MAX_NUMS = 160000, MAX_STROKE_NUMS = 8000, MAX_CHUNK = 400;
const HEX = /^#[0-9a-fA-F]{6}$/, ID = /^[A-Za-z0-9_-]{4,24}$/;

module.exports = function createArt(DATA) {
  const DIR = path.join(DATA, 'art'); fs.mkdirSync(DIR, { recursive: true });
  const boards = new Map(), timers = new Map(), file = id => path.join(DIR, String(id).replace(/[^A-Za-z0-9]/g, '') + '.json');
  function board(id) {
    let b = boards.get(id); if (b) return b; b = { strokes: [], nums: 0 };
    try { const j = JSON.parse(fs.readFileSync(file(id), 'utf8')); if (Array.isArray(j.strokes)) { b.strokes = j.strokes.filter(s => s && ID.test(s.id) && Array.isArray(s.p)); b.nums = b.strokes.reduce((n, s) => n + s.p.length, 0); } } catch {}
    boards.set(id, b); return b;
  }
  function persist(id) { if (timers.has(id)) return; timers.set(id, setTimeout(() => { timers.delete(id); const b = boards.get(id); if (b) fs.writeFile(file(id), JSON.stringify({ strokes: b.strokes }), () => {}); }, 2500).unref?.() ?? 0); }
  const clamp = (v, a, z) => Math.max(a, Math.min(z, v));
  return {
    W, H,
    snapshot: id => board(id).strokes.map(({ id, c, s, e, p }) => ({ id, c, s, e, p })),
    /** returns { ok, chunk } (chunk = sanitised message to relay) or { error } */
    stroke(roomId, token, m) {
      if (!m || typeof m !== 'object' || !ID.test(m.id || '')) return { error: 'bad stroke' };
      const b = board(roomId), p = Array.isArray(m.p) ? m.p : null; if (!p || p.length < 2 || p.length > MAX_CHUNK || p.length % 2) return { error: 'bad points' };
      const pts = p.map((v, i) => Math.round(clamp(+v || 0, 0, i % 2 ? H : W)));
      let s = b.strokes.find(x => x.id === m.id);
      if (!s) {
        if (!HEX.test(m.c || '')) return { error: 'bad colour' }; if (b.strokes.length >= MAX_STROKES || b.nums + pts.length > MAX_NUMS) return { error: 'The canvas is full — clear it or hang it in the museum.' };
        s = { id: m.id, by: token, c: m.c.toLowerCase(), s: clamp(Math.round(+m.s || 6), 1, 80), e: m.e ? 1 : 0, p: [] }; b.strokes.push(s);
      } else if (s.by !== token) return { error: 'not your stroke' };
      if (s.p.length + pts.length > MAX_STROKE_NUMS) return { error: 'stroke too long' };
      s.p.push(...pts); b.nums += pts.length; persist(roomId);
      return { ok: true, chunk: { id: s.id, c: s.c, s: s.s, e: s.e, p: pts } };
    },
    undo(roomId, token, id) { const b = board(roomId), i = b.strokes.findIndex(s => s.id === id && s.by === token); if (i < 0) return false; b.nums -= b.strokes[i].p.length; b.strokes.splice(i, 1); persist(roomId); return true; },
    clear(roomId) { const b = board(roomId); b.strokes = []; b.nums = 0; persist(roomId); }
  };
};
