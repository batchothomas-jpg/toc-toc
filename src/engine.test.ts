import { describe, expect, it } from "vitest";
import {
  aiTurn,
  cardValue,
  Card,
  finishLook,
  makeDeck,
  playPair,
  quickPlay,
  revealRound,
  scorePlayer,
  startGame,
  swap,
  takeDrawn,
} from "./engine";
const c = (rank: number, suit: Card["suit"] = "♠"): Card => ({
  id: `${suit}${rank}`,
  rank,
  suit,
});
describe("TOC TOC rules engine", () => {
  it("scores number cards and red and black figures as specified", () => {
    expect(cardValue(c(1))).toBe(1);
    expect(cardValue(c(10))).toBe(10);
    expect(cardValue(c(11, "♥"))).toBe(11);
    expect(cardValue(c(12, "♦"))).toBe(12);
    expect(cardValue(c(13, "♥"))).toBe(13);
    expect(cardValue(c(11, "♣"))).toBe(0);
    expect(cardValue(c(12, "♠"))).toBe(0);
    expect(cardValue(c(13, "♣"))).toBe(0);
  });
  it("creates a complete deck and deals four cards to each player", () => {
    const g = startGame(undefined, () => 0.42);
    expect(makeDeck(() => 0.42)).toHaveLength(52);
    expect(g.players).toHaveLength(4);
    expect(g.players.every((p) => p.cards.length === 4)).toBe(true);
    expect(g.phase).toBe("peek");
    expect(g.peekLeft).toBe(2);
  });
  it("allows groups of matching values to be laid down", () => {
    const g = startGame();
    g.players[0].cards = [c(7), c(7, "♥"), c(2), c(3)];
    const next = playPair(g, [0, 1]);
    expect(next.players[0].cards.slice(0, 2)).toEqual([null, null]);
    expect(next.discard.slice(-2).map(cardValue)).toEqual([7, 7]);
  });
  it("allows one matching card to be played immediately out of turn", () => {
    const g = startGame();
    g.lastFastValue = 8;
    g.players[2].cards = [c(8, "♥"), c(3), c(4), c(5)];
    const next = quickPlay(g, 2, c(8, "♥"));
    expect(next.players[2].cards[0]).toBeNull();
    expect(next.discard.at(-1)).toEqual(c(8, "♥"));
    expect(next.lastFastValue).toBeNull();
  });
  it("keeps black queens blind and forgets both cards after the exchange", () => {
    const g = startGame();
    g.phase = "discard";
    g.drawn = c(12, "♠");
    g.players[0].cards[0] = c(9);
    g.players[0].known[0] = c(9);
    g.players[1].cards[0] = c(3);
    g.players[1].known[0] = c(3);
    const power = takeDrawn(g, 0);
    expect(power.effect).toBe("blind");
    const result = swap(power, 0, 1, 0);
    expect(result.players[0].cards[0]).toEqual(c(3));
    expect(result.players[1].cards[0]).toEqual(c(12, "♠"));
    expect(result.players[0].known[0]).toBeNull();
    expect(result.players[1].known[0]).toBeNull();
  });
  it("lets a red king remember the returned card after a sighted exchange", () => {
    const g = startGame();
    g.phase = "discard";
    g.drawn = c(13, "♥");
    g.players[0].cards[0] = c(9);
    g.players[1].cards[0] = c(3);
    const power = takeDrawn(g, 0);
    const result = swap(power, 0, 1, 0);
    expect(result.players[0].known[0]).toEqual(c(3));
    expect(result.players[1].known[0]).toBeNull();
    expect(result.message).toContain("Roi");
  });
  it("lets a jack update the card the player has memorized", () => {
    const g = startGame();
    g.phase = "discard";
    g.drawn = c(11, "♦");
    g.players[0].cards[0] = c(9);
    g.players[0].cards[1] = c(6);
    const power = takeDrawn(g, 0);
    expect(power.effect).toBe("look");
    const result = finishLook(power, 1);
    expect(result.players[0].known[1]).toEqual(c(6));
  });
  it("does not let AI play a pair it has not memorized", () => {
    const g = startGame();
    g.current = 1;
    g.phase = "play";
    g.players[1].cards = [c(7), c(7, "♥"), c(3), c(4)];
    g.players[1].known = [null, null, null, null];
    const result = aiTurn(g, () => 0);
    expect(result.players[1].cards.filter(Boolean)).toHaveLength(4);
    expect(result.phase).toBe("play");
    expect(result.current).toBe(2);
  });
  it("ends the hand when last cards are laid and awards each player their own total", () => {
    const g = startGame();
    g.players.forEach((p) => (p.cards = [c(2), c(3), c(4), c(5)]));
    g.players[0].cards = [c(2), c(2, "♥"), null, null];
    const next = playPair(g, [0, 1]);
    expect(next.phase).toBe("round");
    expect(next.players.map((p) => p.score)).toEqual([0, 14, 14, 14]);
  });
  it("requires strict lowest score for a successful TOC TOC", () => {
    const g = startGame();
    g.players[0].cards = [c(1), c(1), c(1), c(1)];
    g.players[1].cards = [c(2), c(2), c(2), c(2)];
    g.players[2].cards = [c(3), c(3), c(3), c(3)];
    g.players[3].cards = [c(4), c(4), c(4), c(4)];
    expect(revealRound(g, 0).players.map((p) => p.score)).toEqual([
      4, 8, 12, 16,
    ]);
    g.players[1].cards = [c(1), c(1), c(1), c(1)];
    expect(revealRound(g, 0).players.map((p) => p.score)).toEqual([
      36, 4, 12, 16,
    ]);
  });
  it("chooses lowest cumulative score as winner once the threshold is crossed", () => {
    const g = startGame();
    g.players[0].score = 99;
    g.players[0].cards = [c(1), c(1), c(1), c(1)];
    g.players[1].cards = [c(2), c(2), c(2), c(2)];
    g.players[2].cards = [c(3), c(3), c(3), c(3)];
    g.players[3].cards = [c(4), c(4), c(4), c(4)];
    expect(revealRound(g, 0).phase).toBe("gameover");
    expect(scorePlayer(g.players[1])).toBe(8);
  });
});
