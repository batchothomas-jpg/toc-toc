import { describe, expect, it } from "vitest";
import {
  aiTurn,
  aiFastReaction,
  attemptQuickPlay,
  callToc,
  cardValue,
  Card,
  createCard,
  discardDrawn,
  draw,
  endTurn,
  finishLook,
  finishInitialPeek,
  makeDeck,
  playPair,
  quickPlay,
  matchValue,
  revealRound,
  restoreSavedGame,
  scorePlayer,
  selectSightCard,
  startGame,
  swap,
  takeDrawn,
  viewForPlayer,
} from "./engine";
const c = (rank: number, suit: Card["suit"] = "♠"): Card =>
  createCard(rank, suit);
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
    expect(c(13, "♣").power).toBe("sighted-swap");
    expect(c(12, "♠").scoreValue).toBe(0);
    expect(matchValue(c(12, "♠"))).toBe(matchValue(c(12, "♥")));
    expect(matchValue(c(12, "♠"))).not.toBe(matchValue(c(11, "♥")));
  });
  it("creates a complete deck and deals four cards to each player", () => {
    const g = startGame(undefined, () => 0.42);
    expect(makeDeck(() => 0.42)).toHaveLength(52);
    expect(g.players).toHaveLength(4);
    expect(g.players.every((p) => p.cards.length === 4)).toBe(true);
    expect(g.phase).toBe("peek");
    expect(g.discard).toHaveLength(0);
    expect(g.peekLeft).toBe(2);
    const view = viewForPlayer(g, 0);
    expect(view.players[0].occupied).toEqual([true, true, true, true]);
    expect(view.players[0].cards).toEqual([null, null, null, null]);
    expect(view.players[1].occupied).toEqual([true, true, true, true]);
    expect(view.players[1].cards).toEqual([null, null, null, null]);
  });
  it("fills unmemorized slots after the setup timer and picks a random opener", () => {
    const g = startGame(["Vous", "Léonie", "Marcel"], () => 0.42);
    const next = finishInitialPeek(g, () => 0.5);
    expect(next.phase).toBe("play");
    expect(next.players[0].known.filter(Boolean)).toHaveLength(2);
    expect(next.current).toBe(1);
    expect(next.tocAllowed).toBe(true);
    expect(finishInitialPeek(next)).toBe(next);
  });
  it("allows groups of matching values to be laid down", () => {
    const g = startGame();
    g.phase = "play";
    g.players[0].cards = [c(7), c(7, "♥"), c(2), c(3)];
    const next = playPair(g, [0, 1]);
    expect(next.players[0].cards.slice(0, 2)).toEqual([null, null]);
    expect(next.discard.slice(-2).map(cardValue)).toEqual([7, 7]);
  });
  it("allows three and four cards of the same rank to be laid together", () => {
    const g = startGame();
    g.phase = "play";
    g.players[0].cards = [c(13, "♠"), c(13, "♥"), c(13, "♦"), c(13, "♣")];
    expect(playPair(g, [0, 1, 2]).players[0].cards).toEqual([
      null,
      null,
      null,
      c(13, "♣"),
    ]);
    expect(playPair(g, [0, 1, 2, 3]).phase).toBe("round");
  });
  it("allows one matching card to be played immediately out of turn", () => {
    const g = startGame();
    g.lastFastMatchValue = 8;
    g.players[2].cards = [c(8, "♥"), c(3), c(4), c(5)];
    const next = quickPlay(g, 2, c(8, "♥"));
    expect(next.players[2].cards[0]).toBeNull();
    expect(next.discard.at(-1)).toEqual(c(8, "♥"));
    expect(next.lastFastMatchValue).toBe(8);
  });
  it("adds one hidden penalty card when a rapid-play guess is wrong", () => {
    const g = startGame();
    g.phase = "play";
    g.lastFastMatchValue = 8;
    g.players[0].cards = [c(4), c(2), c(3), c(5)];
    g.players[0].known = [null, null, null, null];
    const next = attemptQuickPlay(g, 0, 0);
    expect(next.players[0].cards).toHaveLength(5);
    expect(next.players[0].cards[0]).toEqual(c(4));
    expect(next.players[0].cards[4]).not.toBeNull();
    expect(next.players[0].known[4]).toBeNull();
    expect(next.lastFastMatchValue).toBeNull();
    expect(next.events.at(-1)?.type).toBe("penalty");
    expect(viewForPlayer(next, 0).players[0].occupied).toEqual([
      true,
      true,
      true,
      true,
      true,
    ]);
    expect(viewForPlayer(next, 0).players[0].cards[4]).toBeNull();
  });
  it("lets the player choose a hidden card and resolves the rank inside the engine", () => {
    const g = startGame();
    g.phase = "play";
    g.lastFastMatchValue = 8;
    g.players[0].cards = [c(2), c(8, "♥"), c(3), c(5)];
    g.players[0].known = [null, null, null, null];
    const next = attemptQuickPlay(g, 0, 1);
    expect(next.players[0].cards[1]).toBeNull();
    expect(next.discard.at(-1)).toEqual(c(8, "♥"));
    expect(next.events.at(-1)?.type).toBe("quick-play");
  });
  it("lets a knowledgeable AI react using its own memory", () => {
    const g = startGame();
    g.phase = "play";
    g.lastFastMatchValue = 9;
    g.players[1].known = [null, null, null, null];
    g.players[3].known = [null, null, null, null];
    g.players[2].cards[0] = c(9, "♦");
    g.players[2].known[0] = c(9, "♦");
    const next = aiFastReaction(g, () => 0);
    expect(next.players[2].cards[0]).toBeNull();
    expect(next.events.at(-1)?.actor).toBe(2);
  });
  it("ends the turn after a drawn card is refused", () => {
    const g = startGame();
    g.phase = "discard";
    g.drawn = c(4, "♦");
    const next = discardDrawn(g);
    expect(next.current).toBe(1);
    expect(next.phase).toBe("play");
    expect(next.discard.at(-1)).toEqual(c(4, "♦"));
  });
  it("ends the turn automatically after keeping a non-power card", () => {
    const g = startGame();
    g.phase = "discard";
    g.drawn = c(3, "♦");
    g.players[0].cards[0] = c(8);
    const next = takeDrawn(g, 0);
    expect(next.current).toBe(1);
    expect(next.phase).toBe("play");
    expect(next.discard.at(-1)).toEqual(c(8));
  });
  it("only allows TOC TOC at the start of a turn, before drawing", () => {
    const g = startGame();
    g.phase = "play";
    g.tocAllowed = true;
    g.players[0].cards = [c(1), c(1), c(1), c(1)];
    g.players[1].cards = [c(2), c(2), c(2), c(2)];
    g.players[2].cards = [c(3), c(3), c(3), c(3)];
    g.players[3].cards = [c(4), c(4), c(4), c(4)];
    expect(callToc(g).phase).toBe("round");
    const drawn = draw(g);
    expect(drawn.tocAllowed).toBe(false);
    expect(callToc(drawn)).toBe(drawn);
    drawn.phase = "play";
    expect(endTurn(drawn).tocAllowed).toBe(true);
  });
  it("keeps opponents' cards private in the player view", () => {
    const g = startGame();
    expect(viewForPlayer(g, 0).players[1].cards).toEqual([
      null,
      null,
      null,
      null,
    ]);
    g.players[0].known[0] = g.players[0].cards[0];
    g.players[0].known[1] = g.players[0].cards[1];
    expect(viewForPlayer(g, 0).players[0].cards.filter(Boolean)).toHaveLength(
      2,
    );
    g.phase = "round";
    expect(viewForPlayer(g, 0).players[1].cards.filter(Boolean)).toHaveLength(
      4,
    );
  });
  it("restores old saves and derives current card metadata", () => {
    const g = startGame();
    const legacy = JSON.parse(JSON.stringify(g));
    delete legacy.cardLocations;
    delete legacy.roundHistory;
    delete legacy.events;
    for (const card of [
      ...legacy.deck,
      ...legacy.discard,
      ...legacy.players.flatMap((p: { cards: unknown[] }) => p.cards),
    ]) {
      if (card) {
        delete card.color;
        delete card.scoreValue;
        delete card.matchValue;
        delete card.power;
      }
    }
    const restored = restoreSavedGame(legacy)!;
    expect(restored.cardLocations).toBeDefined();
    expect(matchValue(restored.players[0].cards[0]!)).toBe(
      restored.players[0].cards[0]!.rank,
    );
    expect(restored.roundHistory).toEqual([]);
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
    const sighted = selectSightCard(power, 0);
    const result = swap(sighted, 0, 1, 0);
    expect(result.players[0].known[0]).toEqual(c(3));
    expect(result.players[1].known[0]).toBeNull();
    expect(result.message).toContain("Roi");
    expect(result.current).toBe(1);
    expect(result.phase).toBe("play");
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
    expect(result.current).toBe(1);
    expect(result.phase).toBe("play");
  });
  it("does not let AI play a pair it has not memorized", () => {
    const g = startGame();
    g.current = 1;
    g.phase = "play";
    g.players[1].cards = [c(7), c(7, "♥"), c(3), c(4)];
    g.players[1].known = [null, null, null, null];
    const result = aiTurn(g, () => 0);
    expect(result.players[1].cards.filter(Boolean)).toHaveLength(4);
    expect(result.phase).toBe("discard");
    expect(result.current).toBe(1);
  });
  it("ends the hand when last cards are laid and awards each player their own total", () => {
    const g = startGame();
    g.phase = "play";
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
