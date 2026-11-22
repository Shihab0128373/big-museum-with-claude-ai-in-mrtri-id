// Server-authoritative race manager (one race per room). The server owns the phase, the countdown clock and the
// official times: every checkpoint a client reports is validated for order, position, physical plausibility and clock.
const SPEED = { bubble: 24, racer: 30, buggy: 25, moto: 28 }; // keep in sync with public/js/vehicles.js (`top`)
const LOBBY_MS = 12000, COUNT_MS = 4500, FINISH_GRACE_MS = 20000, MAX_RACE_MS = 8 * 60e3;

module.exports = function createRace(TRACK, deps) {
  const { send, now = Date.now, setT = setTimeout, clearT = clearTimeout } = deps;
  const N = TRACK.cps.length, L = TRACK.length, HW = TRACK.width / 2, LAPS = TRACK.laps || 3;
  const seg = i => i === 1 ? TRACK.cps[1].s + 10 : ((TRACK.cps[i].s - TRACK.cps[i - 1].s) % L + L) % L; // metres to travel to reach gate i
  const nameOf = (room, tk) => room.members[tk]?.name || 'Player';
  const fresh = () => ({ phase: 'idle', id: 0, laps: LAPS, startAt: 0, players: {}, order: [], results: null, rematch: {}, timers: {} });
  const R = room => room.race || (room.race = fresh());
  const clearTimers = r => { for (const k of Object.keys(r.timers)) { clearT(r.timers[k]); delete r.timers[k]; } };
  const mkPlayer = veh => ({ veh: SPEED[veh] ? veh : 'bubble', next: 1, lap: 0, lapStart: 0, lastT: 0, laps: [], total: 0, finished: false, dnf: false, best: 0 });
  const inGarden = (room, tk) => { const m = room.members[tk]; return !!(m && m.sid && m.loc === 'garden'); };

  function publicState(room, forToken) {
    const r = R(room), list = r.order.map((tk, slot) => { const p = r.players[tk]; return { slot, name: nameOf(room, tk), veh: p.veh, lap: p.lap, next: p.next, finished: p.finished, total: p.total, best: p.best, dnf: p.dnf, rematch: !!r.rematch[tk] }; });
    return { phase: r.phase, id: r.id, laps: r.laps, startAt: r.startAt, now: now(), nGates: N, you: r.order.indexOf(forToken), players: list, results: r.results, record: room.raceRecord || null };
  }
  function broadcast(room) { for (const [tk, m] of Object.entries(room.members)) if (m.sid) send(room, tk, 'race-state', publicState(room, tk)); }

  function beginCountdown(room) {
    const r = R(room); clearTimers(r); r.id++; r.phase = 'countdown'; r.results = null; r.rematch = {}; r.startAt = now() + COUNT_MS;
    for (const tk of r.order) { const keep = r.players[tk].veh; r.players[tk] = mkPlayer(keep); }
    r.timers.go = setT(() => { r.phase = 'racing'; delete r.timers.go; r.timers.max = setT(() => finish(room), MAX_RACE_MS); broadcast(room); }, COUNT_MS);
    broadcast(room);
  }
  function finish(room) {
    const r = R(room); if (r.phase !== 'racing' && r.phase !== 'countdown') return; clearTimers(r);
    const rows = r.order.map(tk => ({ tk, p: r.players[tk] })), done = rows.filter(x => x.p.finished).sort((a, b) => a.p.total - b.p.total), rest = rows.filter(x => !x.p.finished);
    r.results = done.concat(rest).map((x, i) => ({ pos: x.p.finished ? i + 1 : 0, name: nameOf(room, x.tk), veh: x.p.veh, total: x.p.finished ? x.p.total : 0, best: x.p.best, laps: x.p.laps, dnf: !x.p.finished }));
    r.phase = 'finished'; broadcast(room);
  }
  function maybeEnd(room) { const r = R(room), act = r.order.filter(tk => !r.players[tk].dnf);
    if (!act.length) { clearTimers(r); r.phase = 'idle'; r.order = []; r.players = {}; broadcast(room); return; }
    if (act.every(tk => r.players[tk].finished)) finish(room); }

  return {
    state: publicState,
    start(room, tk, veh) {
      const r = R(room); if (r.phase === 'lobby' || r.phase === 'countdown' || r.phase === 'racing') return { error: 'A race is already running.' };
      if (!inGarden(room, tk)) return { error: 'Go to the garden race track first.' };
      clearTimers(r); Object.assign(r, fresh()); r.players[tk] = mkPlayer(veh); r.order = [tk];
      const others = Object.keys(room.members).filter(t => t !== tk && inGarden(room, t));
      if (!others.length) { beginCountdown(room); return { ok: true }; }
      r.phase = 'lobby'; r.timers.lobby = setT(() => beginCountdown(room), LOBBY_MS); broadcast(room); return { ok: true };
    },
    join(room, tk, veh) {
      const r = R(room); if (r.phase !== 'lobby') return { error: 'No race to join right now.' }; if (!inGarden(room, tk)) return { error: 'Go to the garden race track first.' };
      if (!r.players[tk]) { r.players[tk] = mkPlayer(veh); r.order.push(tk); }
      if (Object.keys(room.members).filter(t => inGarden(room, t)).every(t => r.players[t])) beginCountdown(room); else broadcast(room); return { ok: true };
    },
    cp(room, tk, m) {
      const r = R(room), p = r.players[tk]; if (!p || r.phase !== 'racing' || p.finished || p.dnf || !m) return { error: 'not racing' };
      const i = m.i | 0, t = +m.t; if (i !== p.next) return { error: 'wrong gate' }; if (!Number.isFinite(t) || t < 0) return { error: 'bad time' };
      const el = now() - r.startAt; if (t > el + 400) return { error: 'time from the future' };
      const g = TRACK.cps[i]; if (!Number.isFinite(m.x) || !Number.isFinite(m.z) || Math.hypot(m.x - g.x, m.z - g.z) > HW + 14) return { error: 'not at the gate' };
      const dist = i === 0 ? L - TRACK.cps[N - 1].s : seg(i), need = dist / (SPEED[p.veh] * 1.1) * 1000 * .85; // cannot cover the distance faster than top speed
      if (t - p.lastT < need) return { error: 'too fast' };
      const official = Math.max(t, el - 2500); // cannot claim to be much earlier than the server's own clock
      p.lastT = official; p.next = (i + 1) % N;
      if (i === 0) { const lt = official - p.lapStart; p.laps.push(lt); p.lapStart = official; p.lap++; if (!p.best || lt < p.best) p.best = lt; if (!room.raceRecord || lt < room.raceRecord.ms) room.raceRecord = { name: nameOf(room, tk), ms: Math.round(lt) };
        if (p.lap >= r.laps) { p.finished = true; p.total = official; if (!r.timers.grace) r.timers.grace = setT(() => finish(room), FINISH_GRACE_MS); if (r.order.filter(t2 => !r.players[t2].dnf).every(t2 => r.players[t2].finished)) { finish(room); return { ok: true }; } } }
      broadcast(room); return { ok: true };
    },
    leave(room, tk) { const r = room.race; if (!r || !r.players[tk]) return;
      if (r.phase === 'lobby') { delete r.players[tk]; r.order = r.order.filter(t => t !== tk); if (!r.order.length) { clearTimers(r); r.phase = 'idle'; broadcast(room); } else broadcast(room); return; }
      if (r.phase === 'countdown' || r.phase === 'racing') { r.players[tk].dnf = true; maybeEnd(room); if (r.phase !== 'idle' && r.phase !== 'finished') broadcast(room); } },
    rematch(room, tk) { const r = room.race; if (!r || r.phase !== 'finished' || !r.players[tk]) return { error: 'no finished race' };
      r.rematch[tk] = true; const need = r.order.filter(t => inGarden(room, t)); if (need.every(t => r.rematch[t])) beginCountdown(room); else broadcast(room); return { ok: true }; },
    /** player left the garden / disconnected */
    gone(room, tk) { this.leave(room, tk); }
  };
};
