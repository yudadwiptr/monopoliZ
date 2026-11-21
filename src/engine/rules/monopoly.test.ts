import { describe, expect, it } from 'vitest';
import { act, newGame, ofType, own, rollTo } from './testkit';

describe('monopoly wins', () => {
  it('Monopoli Wisata: all 4 tourist tiles', () => {
    const g = newGame();
    [11, 21, 27].forEach((t) => own(g, t, 'p1'));
    const r = act(rollTo(g, 5).state, { type: 'BUY', level: 0 });
    expect(r.state.winner).toEqual({ playerId: 'p1', reason: 'monopoli_wisata' });
    expect(r.state.pending).toEqual({ kind: 'game_over' });
    expect(r.events[r.events.length - 1]).toEqual({ type: 'game_over', winnerId: 'p1', reason: 'monopoli_wisata' });
  });

  it('Monopoli Jalur: all 6 properties of one side', () => {
    const g = newGame();
    [1, 2, 4, 5, 6].forEach((t) => own(g, t, 'p1'));
    const r = act(rollTo(g, 7).state, { type: 'BUY', level: 0 });
    expect(r.state.winner).toEqual({ playerId: 'p1', reason: 'monopoli_jalur' });
  });

  it('Monopoli Triple Warna: 3 complete colour groups', () => {
    const g = newGame();
    [1, 2, 9, 10, 17].forEach((t) => own(g, t, 'p1'));
    const r = act(rollTo(g, 18).state, { type: 'BUY', level: 1 });
    expect(r.state.winner).toEqual({ playerId: 'p1', reason: 'monopoli_warna' });
  });

  it('an acquisition can complete a monopoly', () => {
    const g = newGame();
    [11, 21, 27].forEach((t) => own(g, t, 'p1'));
    own(g, 5, 'p2');
    const r = rollTo(g, 5);
    expect(r.state.pending.kind).toBe('acquire');
    const r2 = act(r.state, { type: 'ACQUIRE' });
    expect(r2.state.winner).toEqual({ playerId: 'p1', reason: 'monopoli_wisata' });
    expect(r2.state.pending).toEqual({ kind: 'game_over' });
  });

  it('no win while a group/side/tourist set is incomplete', () => {
    const g = newGame();
    [1, 2, 9, 10].forEach((t) => own(g, t, 'p1'));
    const r = act(rollTo(g, 17).state, { type: 'BUY', level: 0 });
    expect(r.state.winner).toBeNull();
  });
});

describe('monopoly alerts', () => {
  it('alerts once when a player becomes one tile away', () => {
    const g = newGame();
    own(g, 11, 'p1');
    own(g, 21, 'p1');
    const r = act(rollTo(g, 27).state, { type: 'BUY', level: 0 });
    expect(ofType(r.events, 'monopoly_alert')).toEqual([
      { type: 'monopoly_alert', playerId: 'p1', reason: 'monopoli_wisata', missing: [5] },
    ]);
    // another ownership change: the same threat is not announced again
    const s = r.state;
    s.current = 0;
    s.pending = { kind: 'roll' };
    const r2 = act(rollTo(s, 4).state, { type: 'BUY', level: 0 });
    expect(ofType(r2.events, 'monopoly_alert')).toEqual([]);
  });

  it('re-alerts after the threat disappeared and came back', () => {
    const g = newGame();
    own(g, 11, 'p1');
    own(g, 21, 'p1');
    let r = act(rollTo(g, 27).state, { type: 'BUY', level: 0 });
    expect(ofType(r.events, 'monopoly_alert')).toHaveLength(1);
    // p2 takes Raja Ampat away
    let s = r.state;
    s.current = 1;
    s.players[1].cash = 5000;
    s.pending = { kind: 'roll' };
    r = act(rollTo(s, 27).state, { type: 'ACQUIRE' });
    expect(ofType(r.events, 'monopoly_alert')).toEqual([]);
    // p1 takes it back → new alert
    s = r.state;
    s.current = 0;
    s.players[0].cash = 5000;
    s.pending = { kind: 'roll' };
    r = act(rollTo(s, 27).state, { type: 'ACQUIRE' });
    expect(ofType(r.events, 'monopoly_alert')).toEqual([
      { type: 'monopoly_alert', playerId: 'p1', reason: 'monopoli_wisata', missing: [5] },
    ]);
  });

  it('alerts the side and colour threats too', () => {
    const g = newGame();
    [1, 2, 4, 5].forEach((t) => own(g, t, 'p1'));
    const r = act(rollTo(g, 6).state, { type: 'BUY', level: 0 });
    const alerts = ofType(r.events, 'monopoly_alert');
    expect(alerts).toContainEqual({ type: 'monopoly_alert', playerId: 'p1', reason: 'monopoli_jalur', missing: [7] });

    const g2 = newGame();
    [1, 2, 9, 10].forEach((t) => own(g2, t, 'p1'));
    const r2 = act(rollTo(g2, 17).state, { type: 'BUY', level: 0 });
    expect(ofType(r2.events, 'monopoly_alert')).toEqual([
      { type: 'monopoly_alert', playerId: 'p1', reason: 'monopoli_warna', missing: [18] },
    ]);
  });
});
