// Client side of the race: shows server state (lobby / countdown / racing / results), detects gate crossings
// (only forward, in order) and reports them to the server, which validates and decides the official times.
const fmt = ms => { if (!ms || ms < 0) ms = 0; const m = Math.floor(ms / 60000), s = Math.floor(ms / 1000) % 60, c = Math.floor(ms % 1000 / 10); return `${m}:${String(s).padStart(2, '0')}.${String(c).padStart(2, '0')}`; };
const ord = n => n === 1 ? '1st' : n === 2 ? '2nd' : n + 'th';

export class Race {
  /** hooks: { onGrid(slot), setNextGate(i), peerPos() -> {x,z}|null, inGarden() -> bool, vehicle() -> kind, myName() } */
  constructor({ net, track, toast, audio, hooks }) {
    const $ = id => document.getElementById(id); Object.assign(this, { $, net, track, toast, audio, hooks });
    this.st = null; this.offset = 0; this.seenId = -1; this.goPerf = null; this.next = 1; this.prevAlong = null; this.lapStart = 0; this.lastLap = 0; this.hudT = 0; this.lastCount = -1; this.dismissed = -1; this.goShownAt = 0; this.sending = false;
    $('rbar-join').onclick = () => this.join(); $('rbar-no').onclick = () => { this.dismissed = this.st?.id ?? -1; this.refreshBar(); };
    $('rr-rematch').onclick = () => this.rematch(); $('rr-close').onclick = () => { $('race-result').hidden = true; this.dismissed = this.st?.id ?? -1; };
    $('rh-leave').onclick = () => this.leave();
    net.on('race-state', s => this.handle(s));
  }
  get me() { const s = this.st; return s && s.you >= 0 ? s.players[s.you] : null; }
  /** I take part in the current countdown / race (and haven't left) */
  get active() { const s = this.st, m = this.me; return !!(s && m && !m.dnf && (s.phase === 'countdown' || s.phase === 'racing')); }
  get serverNow() { return Date.now() + this.offset; }
  /** frozen on the grid until GO */
  get locked() { return !!(this.active && this.st.phase === 'countdown' && this.serverNow < this.st.startAt) || !!(this.active && this.st.phase === 'racing' && this.goPerf === null); }
  get busy() { const p = this.st?.phase; return p === 'lobby' || p === 'countdown' || p === 'racing'; }

  /* ---------- actions ---------- */
  async start() { const r = await this.net.request('race-start', { veh: this.hooks.vehicle() }); if (r?.error) this.toast(r.error, 'err'); }
  async join() { const r = await this.net.request('race-join', { veh: this.hooks.vehicle() }); if (r?.error) this.toast(r.error, 'err'); }
  async rematch() { const r = await this.net.request('race-rematch'); if (r?.error) this.toast(r.error, 'err'); }
  leave() { this.net.send('race-leave'); if (this.me) this.me.dnf = true; this.hooks.setNextGate(-1); this.$('race-hud').hidden = true; this.$('race-count').hidden = true; this.toast('You left the race'); }
  async resync() { const s = await this.net.request('race-sync'); if (s && !s.error) this.handle(s); }

  /* ---------- server state ---------- */
  handle(s) {
    this.st = s; this.offset = s.now - Date.now();
    const m = this.me;
    if (s.phase === 'countdown' && s.id !== this.seenId && m) { // new race: go to the grid
      this.seenId = s.id; this.goPerf = null; this.next = 1; this.prevAlong = null; this.lapStart = 0; this.lastLap = 0; this.lastCount = -1; this.$('race-result').hidden = true; this.hooks.onGrid(s.you, m.veh); this.hooks.setNextGate(1);
    }
    if (s.phase === 'racing' && m && !m.dnf && s.players[s.you].next !== this.next && !this.sending && s.players[s.you].lap >= 0) { /* server is the authority on the expected gate */ this.next = s.players[s.you].next; this.hooks.setNextGate(this.next); this.prevAlong = null; }
    if (s.phase === 'finished' && s.id !== this.dismissed) this.showResult();
    if (s.phase === 'idle' || s.phase === 'finished') { this.hooks.setNextGate(-1); this.$('race-hud').hidden = true; this.$('race-count').hidden = true; }
    else if (this.active) this.$('race-hud').hidden = false;
    this.refreshBar(); if (s.phase === 'finished') this.refreshResult();
  }
  refreshBar() {
    const s = this.st, bar = this.$('race-bar'); const show = !!(s && s.phase === 'lobby' && s.you < 0 && this.hooks.inGarden() && this.dismissed !== s.id);
    bar.hidden = !show; if (show) this.$('rbar-text').textContent = `🏁 ${s.players[0]?.name || 'Your partner'} started a race!`;
    if (s && s.phase === 'lobby' && s.you >= 0) { this.$('race-count').hidden = false; this.$('race-count').textContent = 'Waiting for your partner…'; this.$('race-count').className = 'wait'; }
  }
  showResult() { this.$('race-result').hidden = false; this.refreshResult(); }
  refreshResult() {
    const s = this.st; if (!s?.results) return; const me = this.hooks.myName(), w = s.results[0], $ = this.$;
    const win = w && !w.dnf; $('rr-title').textContent = !win ? 'Race over' : w.name === me ? '🏆 You win!' : `🏆 ${w.name} wins!`;
    $('rr-list').innerHTML = s.results.map(r => `<li class="${r.name === me ? 'me' : ''}"><b>${r.dnf ? '—' : ord(r.pos)}</b><span>${r.name}</span><em>${r.dnf ? 'did not finish' : fmt(r.total)}</em><small>${r.best ? 'best ' + fmt(r.best) : ''}</small></li>`).join('');
    $('rr-record').textContent = s.record ? `Track record: ${s.record.name} · ${fmt(s.record.ms)}` : '';
    const my = this.me, other = s.players.find(p => p !== my); const b = $('rr-rematch');
    b.disabled = !!my?.rematch; b.textContent = my?.rematch ? 'Waiting for partner…' : other?.rematch ? 'Rematch — partner is ready!' : '↻ Rematch';
  }

  /* ---------- per frame ---------- */
  update(dt, P) {
    const s = this.st; if (!s) return; const $ = this.$, now = this.serverNow;
    if (this.active && s.phase === 'countdown') {
      const left = s.startAt - now, n = Math.ceil(left / 1000); $('race-hud').hidden = false;
      if (left > 0) { if (n !== this.lastCount) { this.lastCount = n; this.audio.beep(520, .12); } const c = $('race-count'); c.hidden = false; c.className = ''; c.textContent = n > 3 ? 'Get ready…' : String(n); }
    }
    if (this.active && s.phase === 'racing' && this.goPerf === null) { this.goPerf = performance.now() - Math.max(0, now - s.startAt); this.goShownAt = performance.now(); this.audio.beep(880, .45); const c = $('race-count'); c.hidden = false; c.className = 'go'; c.textContent = 'GO!'; this.hooks.setNextGate(this.next); }
    if (this.active && s.phase === 'countdown' && now >= s.startAt && this.goPerf === null) { this.goPerf = performance.now() - (now - s.startAt); this.goShownAt = performance.now(); this.audio.beep(880, .45); const c = $('race-count'); c.hidden = false; c.className = 'go'; c.textContent = 'GO!'; }
    if (this.goShownAt && performance.now() - this.goShownAt > 1100) { $('race-count').hidden = true; this.goShownAt = 0; }
    const m = this.me; if (!(s.phase === 'racing' && m && !m.dnf && !m.finished && this.goPerf !== null)) { this.prevAlong = null; this.hudTick(dt, P, false); return; }
    const t = performance.now() - this.goPerf, g = this.track.cps[this.next];
    const along = (P.x - g.x) * g.fx + (P.z - g.z) * g.fz, lat = (P.x - g.x) * g.fz - (P.z - g.z) * g.fx;
    if (this.prevAlong !== null && this.prevAlong < 0 && along >= 0 && along < 12 && Math.abs(lat) <= this.track.width / 2 + 3) this.cross(g, Math.round(t), P);
    this.prevAlong = along; this.hudTick(dt, P, true, t);
  }
  async cross(g, t, P) {
    const i = this.next; this.next = (i + 1) % this.track.cps.length; this.prevAlong = null; this.hooks.setNextGate(this.next); this.audio.beep(i === 0 ? 700 : 600, .09);
    if (i === 0) { this.lastLap = t - this.lapStart; this.lapStart = t; }
    this.sending = true; const r = await this.net.request('race-cp', { i, t, x: Math.round(P.x * 10) / 10, z: Math.round(P.z * 10) / 10 }); this.sending = false;
    if (r?.error) { console.warn('[race] checkpoint rejected:', r.error); await this.resync(); }
  }
  hudTick(dt, P, racing, t = 0) {
    this.hudT += dt; if (this.hudT < .1) return; this.hudT = 0; const s = this.st, m = this.me, $ = this.$; if (!m || $('race-hud').hidden) return;
    const lapNo = Math.min(s.laps, (m.lap || 0) + 1); $('rh-lap').textContent = m.finished ? 'FINISHED' : `${lapNo}/${s.laps}`;
    $('rh-time').textContent = racing ? fmt(t) : m.finished ? fmt(m.total) : '0:00.00';
    $('rh-cur').textContent = racing ? fmt(t - this.lapStart) : '–';
    $('rh-best').textContent = m.best ? fmt(m.best) : this.lastLap ? fmt(this.lastLap) : '–';
    const o = s.players.find(p => p !== m); let pos = '', other = '';
    if (o) { other = `${o.name}: ${o.finished ? 'finished ' + fmt(o.total) : o.dnf ? 'left' : `lap ${Math.min(s.laps, o.lap + 1)}/${s.laps}`}`; if (racing && !o.dnf) pos = ord(this.rank(m, o, P)) + ' / 2'; }
    $('rh-pos').textContent = pos; $('rh-other').textContent = other;
  }
  /** 1 if I'm ahead of o, else 2 */
  rank(m, o, P) {
    const N = this.track.cps.length, adj = p => p.lap * N + (p.next === 0 ? N : p.next);
    if (adj(m) !== adj(o)) return adj(m) > adj(o) ? 1 : 2; const pp = this.hooks.peerPos(); if (!pp) return 1;
    const g = this.track.cps[this.next], dm = Math.hypot(P.x - g.x, P.z - g.z), dp = Math.hypot(pp.x - g.x, pp.z - g.z); return dm <= dp ? 1 : 2;
  }
}
export { fmt as fmtTime };
