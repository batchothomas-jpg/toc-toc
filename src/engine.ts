export type Suit = "♠" | "♣" | "♥" | "♦";
export type Card = { id: string; rank: number; suit: Suit };
export type Player = {
  id: string;
  name: string;
  human: boolean;
  cards: (Card | null)[];
  known: (Card | null)[];
  score: number;
  color: string;
};
export type Phase =
  "peek" | "play" | "discard" | "power" | "round" | "gameover";
export type Game = {
  players: Player[];
  deck: Card[];
  discard: Card[];
  current: number;
  phase: Phase;
  peekLeft: number;
  drawn: Card | null;
  effect: "look" | "blind" | "sight" | null;
  actor: number;
  target: number | null;
  slot: number | null;
  message: string;
  round: number;
  lastFastValue: number | null;
  roundWinner: number | null;
  tocCaller: number | null;
  settings: { speed: boolean; sound: boolean };
};
export const cardValue = (c: Card) =>
  c.rank === 1
    ? 1
    : c.rank <= 10
      ? c.rank
      : c.rank === 11 || c.rank === 12 || c.rank === 13
        ? c.suit === "♥" || c.suit === "♦"
          ? c.rank
          : 0
        : 0;
export const face = (c: Card) =>
  c.rank === 1
    ? "A"
    : c.rank === 11
      ? "J"
      : c.rank === 12
        ? "Q"
        : c.rank === 13
          ? "K"
          : String(c.rank);
export const red = (c: Card) => c.suit === "♥" || c.suit === "♦";
export function shuffled<T>(items: T[], random = Math.random): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
export function makeDeck(random = Math.random): Card[] {
  return shuffled(
    (["♠", "♣", "♥", "♦"] as Suit[]).flatMap((suit) =>
      Array.from({ length: 13 }, (_, i) => ({
        id: `${suit}${i + 1}`,
        rank: i + 1,
        suit,
      })),
    ),
    random,
  );
}
export function startGame(
  names = ["Vous", "Léonie", "Marcel", "Iris"],
  random = Math.random,
): Game {
  const deck = makeDeck(random);
  const players = names.map((name, i) => {
    const cards = Array.from({ length: 4 }, () => deck.pop()!);
    return {
      id: `p${i}`,
      name,
      human: i === 0,
      cards,
      known: cards.map((c, j) => (i !== 0 && j < 2 ? c : null)),
      score: 0,
      color: ["#d7aa66", "#a7c1b2", "#c48c92", "#9d9bd3"][i],
    };
  });
  const discard = [deck.pop()!];
  return {
    players,
    deck,
    discard,
    current: 0,
    phase: "peek",
    peekLeft: 2,
    drawn: null,
    effect: null,
    actor: 0,
    target: null,
    slot: null,
    message: "Regardez deux de vos cartes. Elles resteront secrètes.",
    round: 1,
    lastFastValue: null,
    roundWinner: null,
    tocCaller: null,
    settings: { speed: true, sound: true },
  };
}
export function scorePlayer(p: Player) {
  return p.cards.reduce((sum, c) => sum + (c ? cardValue(c) : 0), 0);
}
export function revealRound(g: Game, caller: number | null): Game {
  const totals = g.players.map(scorePlayer);
  let winner: number;
  if (caller === null) {
    winner = g.players.findIndex((p) => p.cards.every((c) => !c));
  } else {
    const own = totals[caller];
    winner = totals.every((n, i) => i === caller || own < n) ? caller : -1;
  }
  const callerPenalty =
    caller !== null && winner !== caller
      ? totals
          .filter((_, i) => i !== caller)
          .reduce((sum, score) => sum + score, 0)
      : 0;
  const players = g.players.map((p, i) => ({
    ...p,
    score: p.score + totals[i] + (i === caller ? callerPenalty : 0),
  }));
  return {
    ...g,
    players,
    phase: players.some((p) => p.score >= 100) ? "gameover" : "round",
    roundWinner: winner,
    tocCaller: caller,
    message:
      caller === null
        ? "Manche terminée — toutes les cartes sont révélées."
        : winner === caller
          ? "TOC TOC réussi — vous marquez vos points."
          : "TOC TOC manqué — vous récupérez les points des autres.",
  };
}
export function nextRound(g: Game, random = Math.random): Game {
  if (g.phase === "gameover") return g;
  const deck = makeDeck(random);
  const players = g.players.map((p) => {
    const cards = Array.from({ length: 4 }, () => deck.pop()!);
    return {
      ...p,
      cards,
      known: cards.map((c, j) => (!p.human && j < 2 ? c : null)),
    };
  });
  return {
    ...g,
    players,
    deck,
    discard: [deck.pop()!],
    current: 0,
    phase: "peek",
    peekLeft: 2,
    drawn: null,
    effect: null,
    actor: 0,
    target: null,
    slot: null,
    message: "Regardez deux de vos cartes.",
    round: g.round + 1,
    lastFastValue: null,
    roundWinner: null,
    tocCaller: null,
  };
}
export function rememberCard(g: Game, player: number, slot: number): Game {
  const card = g.players[player].cards[slot];
  if (!card) return g;
  return {
    ...g,
    players: g.players.map((p, i) =>
      i === player
        ? { ...p, known: p.known.map((c, j) => (j === slot ? card : c)) }
        : p,
    ),
  };
}
export function draw(g: Game): Game {
  if (g.phase !== "play" || !g.players[g.current].human) return g;
  const deck = [...g.deck];
  const c = deck.pop();
  return c
    ? {
        ...g,
        deck,
        drawn: c,
        lastFastValue: null,
        phase: "discard",
        message: "Échangez cette carte ou défaussez-la.",
      }
    : { ...g, message: "La pioche est vide." };
}
export function takeDrawn(g: Game, slot: number): Game {
  if (
    g.phase !== "discard" ||
    !g.drawn ||
    g.players[g.current].cards[slot] === null
  )
    return g;
  const players = g.players.map((p, i) =>
    i === g.current
      ? {
          ...p,
          cards: p.cards.map((c, j) => (j === slot ? g.drawn : c)),
          known: p.known.map((c, j) => (j === slot ? g.drawn : c)),
        }
      : p,
  );
  const discard = [...g.discard, g.players[g.current].cards[slot]!];
  const next = { ...g, players, discard, drawn: null };
  return resolvePower(next, g.current, slot, g.drawn);
}
export function discardDrawn(g: Game): Game {
  if (g.phase !== "discard" || !g.drawn) return g;
  const next = {
    ...g,
    discard: [...g.discard, g.drawn],
    drawn: null,
    lastFastValue: null,
    phase: "play" as Phase,
    message: "Carte défaussée. À vous de poser une paire ou de terminer.",
  };
  return next;
}
function resolvePower(g: Game, player: number, slot: number, c: Card): Game {
  if (c.rank === 11)
    return {
      ...g,
      phase: "power",
      effect: "look",
      actor: player,
      slot,
      message:
        "Valet : regardez une carte à vous, puis remettez-la face cachée.",
    };
  if (c.rank === 12)
    return {
      ...g,
      phase: "power",
      effect: "blind",
      actor: player,
      slot,
      message:
        "Dame : échangez une carte à vous avec celle d’un adversaire, sans les regarder.",
    };
  if (c.rank === 13)
    return {
      ...g,
      phase: "power",
      effect: "sight",
      actor: player,
      slot,
      message:
        "Roi : regardez votre carte et celle récupérée à la fin de l’échange.",
    };
  return {
    ...g,
    phase: "play",
    message: "Carte échangée. Posez éventuellement une paire ou terminez.",
  };
}
export function finishLook(g: Game, slot: number): Game {
  return g.phase === "power" && g.effect === "look"
    ? {
        ...g,
        players: g.players.map((p, i) =>
          i === g.actor
            ? {
                ...p,
                known: p.known.map((c, j) => (j === slot ? p.cards[slot] : c)),
              }
            : p,
        ),
        phase: "play",
        effect: null,
        message: `Vous avez mémorisé ${face(g.players[g.actor].cards[slot]!)} ${g.players[g.actor].cards[slot]!.suit}. Carte remise face cachée.`,
      }
    : g;
}
export function swap(
  g: Game,
  own: number,
  targetPlayer: number,
  targetSlot: number,
): Game {
  if (g.phase !== "power" || !g.effect) return g;
  const players = g.players.map((p) => ({
    ...p,
    cards: [...p.cards],
    known: [...p.known],
  }));
  const my = players[g.actor].cards[own],
    theirs = players[targetPlayer].cards[targetSlot];
  if (!my || !theirs) return g;
  players[g.actor].cards[own] = theirs;
  players[targetPlayer].cards[targetSlot] = my;
  players[g.actor].known[own] = g.effect === "sight" ? theirs : null;
  players[targetPlayer].known[targetSlot] = null;
  return {
    ...g,
    players,
    phase: "play",
    effect: null,
    message:
      g.effect === "sight"
        ? `Roi : vous avez vu ${face(my)} ${my.suit} partir et ${face(theirs)} ${theirs.suit} revenir.`
        : "Échange effectué à l’aveugle.",
  };
}
export function playPair(
  g: Game,
  slots: number[],
  player = g.current,
  fast = false,
): Game {
  if (slots.length < 2 || slots.length > 4) return g;
  const cards = slots.map((s) => g.players[player].cards[s]);
  if (
    cards.some((c) => !c) ||
    new Set(cards.map((c) => cardValue(c!))).size !== 1
  )
    return g;
  const value = cardValue(cards[0]!);
  const players = g.players.map((p, i) =>
    i === player
      ? {
          ...p,
          cards: p.cards.map((c, j) => (slots.includes(j) ? null : c)),
          known: p.known.map((c, j) => (slots.includes(j) ? null : c)),
        }
      : p,
  );
  const next = {
    ...g,
    players,
    discard: [...g.discard, ...(cards as Card[])],
    lastFastValue: value,
    message: fast
      ? `Pose rapide ! ${slots.length} cartes de valeur ${value}.`
      : `${slots.length} cartes posées — valeur ${value}.`,
  };
  if (players[player].cards.every((c) => !c)) return revealRound(next, null);
  return next;
}
export function callToc(g: Game): Game {
  return g.phase === "play" ? revealRound(g, g.current) : g;
}
export function endTurn(g: Game): Game {
  if (g.phase !== "play") return g;
  const current = (g.current + 1) % g.players.length;
  return {
    ...g,
    current,
    phase: "play",
    message: `Au tour de ${g.players[current].name}.`,
  };
}
export function quickPlay(g: Game, player: number, card: Card): Game {
  if (
    g.lastFastValue === null ||
    cardValue(card) !== g.lastFastValue ||
    g.phase === "round" ||
    g.phase === "gameover"
  )
    return g;
  const slot = g.players[player].cards.findIndex((c) => c?.id === card.id);
  if (slot < 0) return g;
  const players = g.players.map((p, i) =>
    i === player
      ? {
          ...p,
          cards: p.cards.map((c, j) => (j === slot ? null : c)),
          known: p.known.map((c, j) => (j === slot ? null : c)),
        }
      : p,
  );
  const next = {
    ...g,
    players,
    discard: [...g.discard, card],
    lastFastValue: null,
    message: `Pose rapide ! Une carte de valeur ${cardValue(card)} posée.`,
  };
  return players[player].cards.every((c) => !c)
    ? revealRound(next, null)
    : next;
}
export function aiTurn(g: Game, random = Math.random): Game {
  if (g.players[g.current].human || g.phase !== "play") return g;
  let game = g;
  if (game.lastFastValue !== null) {
    const knownMatch = game.players[game.current].known.find(
      (card) => card && cardValue(card) === game.lastFastValue,
    );
    if (knownMatch) game = quickPlay(game, game.current, knownMatch);
    if (game.phase !== "play") return game;
  }
  let p = game.players[game.current];
  const counts = new Map<number, number>();
  for (const c of p.known)
    if (c) {
      const v = cardValue(c);
      counts.set(v, (counts.get(v) || 0) + 1);
    }
  const pair = [...counts].find(([, n]) => n >= 2);
  if (pair) {
    const slots = p.known
      .flatMap((c, i) => (c && cardValue(c) === pair[0] ? [i] : []))
      .slice(0, pair[1]);
    game = playPair(game, slots);
    if (game.phase !== "play") return game;
  }
  p = game.players[game.current];
  const known = p.known
    .map((c, i) => (c && p.cards[i] ? i : -1))
    .filter((i) => i >= 0);
  const c = game.deck.pop();
  if (!c) return endTurn(game);
  game = { ...game, deck: game.deck, drawn: c, lastFastValue: null };
  const discardTop = game.discard.at(-1)!;
  if (cardValue(c) < cardValue(discardTop) || c.rank >= 11) {
    const available = p.cards.flatMap((card, i) => (card ? [i] : []));
    const slot =
      known.sort(
        (a, b) => cardValue(p.known[b]!) - cardValue(p.known[a]!),
      )[0] ?? available[Math.floor(random() * available.length)];
    if (slot === undefined)
      return endTurn({ ...game, phase: "play", drawn: null });
    game = { ...game, phase: "discard" };
    game = takeDrawn(game, slot);
    if (game.phase === "power" && game.effect === "look")
      game = finishLook(game, slot);
    else if (game.phase === "power") {
      const enemy = (game.current + 1) % game.players.length;
      const targetSlots = game.players[enemy].cards.flatMap((card, i) =>
        card ? [i] : [],
      );
      game = swap(
        game,
        slot,
        enemy,
        targetSlots[Math.floor(random() * targetSlots.length)],
      );
    }
  } else {
    game = { ...game, phase: "discard" };
    game = discardDrawn(game);
  }
  return endTurn(game);
}
