export type Suit = "♠" | "♣" | "♥" | "♦";
export type CardColor = "red" | "black";
export type CardPower = "look" | "blind-swap" | "sighted-swap" | null;
export type Difficulty = "easy" | "normal" | "hard" | "expert";
export type Card = {
  id: string;
  rank: number;
  suit: Suit;
  color: CardColor;
  scoreValue: number;
  matchValue: number;
  power: CardPower;
};
export type Player = {
  id: string;
  name: string;
  human: boolean;
  difficulty: Difficulty | null;
  cards: (Card | null)[];
  known: (Card | null)[];
  score: number;
  color: string;
};
export type Phase =
  "peek" | "play" | "discard" | "power" | "round" | "gameover";
export type Game = {
  players: Player[];
  cardLocations: Record<string, CardLocation>;
  roundHistory: RoundRecord[];
  events: GameEvent[];
  deck: Card[];
  discard: Card[];
  current: number;
  phase: Phase;
  peekLeft: number;
  drawn: Card | null;
  effect: "look" | "blind" | "sight" | "sight-target" | null;
  actor: number;
  target: number | null;
  slot: number | null;
  message: string;
  round: number;
  lastFastMatchValue: number | null;
  tocAllowed: boolean;
  roundWinner: number | null;
  tocCaller: number | null;
  settings: { speed: boolean; sound: boolean };
};
export type CardLocation = {
  zone: "deck" | "hand" | "drawn" | "discard";
  owner: number | null;
  position: number;
};
export type RoundRecord = {
  round: number;
  deltas: number[];
  totals: number[];
  reason: "toc" | "empty-hand";
  caller: number | null;
  tocSucceeded: boolean | null;
  finisher: number | null;
};
export type GameEvent = {
  id: number;
  round: number;
  type:
    | "deal"
    | "draw"
    | "exchange"
    | "discard"
    | "look"
    | "swap"
    | "pair"
    | "quick-play"
    | "toc"
    | "round-end";
  actor: number;
  target?: number;
  slots?: number[];
  cardIds?: string[];
};
export type PlayerView = {
  id: string;
  name: string;
  human: boolean;
  difficulty: Difficulty | null;
  score: number;
  color: string;
  cards: (Card | null)[];
  cardCount: number;
};
export type GameView = {
  players: PlayerView[];
  current: number;
  phase: Phase;
  round: number;
  deckCount: number;
  discard: Card[];
  drawn: Card | null;
  effect: Game["effect"];
  message: string;
  peekLeft: number;
  lastFastMatchValue: number | null;
  tocAllowed: boolean;
  roundHistory: RoundRecord[];
  events: GameEvent[];
  roundWinner: number | null;
  tocCaller: number | null;
};
export function createCard(rank: number, suit: Suit): Card {
  const color = suit === "♥" || suit === "♦" ? "red" : "black";
  const power: CardPower =
    rank === 11
      ? "look"
      : rank === 12
        ? "blind-swap"
        : rank === 13
          ? "sighted-swap"
          : null;
  return {
    id: `${suit}${rank}`,
    rank,
    suit,
    color,
    scoreValue: rank <= 10 ? rank : color === "red" ? rank : 0,
    matchValue: rank,
    power,
  };
}
export const cardValue = (c: Card) => c.scoreValue;
export const matchValue = (c: Card) => c.matchValue;
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
function recordEvent(game: Game, event: Omit<GameEvent, "id" | "round">): Game {
  const next = {
    ...game,
    events: [
      ...game.events,
      { ...event, id: game.events.length + 1, round: game.round },
    ],
  };
  return { ...next, cardLocations: locateCards(next) };
}
function locateCards(
  game: Pick<Game, "players" | "deck" | "drawn" | "discard" | "current">,
): Record<string, CardLocation> {
  const locations: Record<string, CardLocation> = {};
  game.deck.forEach((card, position) => {
    locations[card.id] = { zone: "deck", owner: null, position };
  });
  game.players.forEach((player, owner) =>
    player.cards.forEach((card, position) => {
      if (card) locations[card.id] = { zone: "hand", owner, position };
    }),
  );
  game.discard.forEach((card, position) => {
    locations[card.id] = { zone: "discard", owner: null, position };
  });
  if (game.drawn)
    locations[game.drawn.id] = {
      zone: "drawn",
      owner: game.current,
      position: 0,
    };
  return locations;
}
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
      Array.from({ length: 13 }, (_, i) => createCard(i + 1, suit)),
    ),
    random,
  );
}
export function startGame(
  names = ["Vous", "Léonie", "Marcel", "Iris"],
  random = Math.random,
  difficulty: Difficulty = "normal",
): Game {
  const deck = makeDeck(random);
  const players = names.map((name, i) => {
    const cards = Array.from({ length: 4 }, () => deck.pop()!);
    return {
      id: `p${i}`,
      name,
      human: i === 0,
      difficulty: i === 0 ? null : difficulty,
      cards,
      known: cards.map((c, j) => (i !== 0 && j < 2 ? c : null)),
      score: 0,
      color: ["#d7aa66", "#a7c1b2", "#c48c92", "#9d9bd3"][i],
    };
  });
  const discard = [deck.pop()!];
  const game: Omit<Game, "cardLocations"> = {
    players,
    roundHistory: [],
    events: [{ id: 1, round: 1, type: "deal", actor: -1 }],
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
    lastFastMatchValue: null,
    tocAllowed: false,
    roundWinner: null,
    tocCaller: null,
    settings: { speed: true, sound: true },
  };
  return { ...game, cardLocations: locateCards(game) };
}
/** Restore saves from earlier app versions while re-deriving card metadata safely. */
export function restoreSavedGame(value: unknown): Game | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Partial<Game> & { lastFastValue?: number | null };
  if (
    !Array.isArray(raw.players) ||
    !Array.isArray(raw.deck) ||
    !Array.isArray(raw.discard)
  )
    return null;
  const restoreCard = (card: unknown): Card | null => {
    if (!card || typeof card !== "object") return null;
    const candidate = card as Partial<Card>;
    if (
      typeof candidate.rank !== "number" ||
      !["♠", "♣", "♥", "♦"].includes(candidate.suit ?? "")
    )
      return null;
    return createCard(candidate.rank, candidate.suit as Suit);
  };
  const players = raw.players.map((player, index) => {
    const p = player as Partial<Player>;
    const cards = Array.isArray(p.cards) ? p.cards.map(restoreCard) : [];
    if (
      cards.length !== 4 ||
      cards.some((card, slot) => p.cards?.[slot] !== null && !card)
    )
      return null;
    const known = Array.isArray(p.known)
      ? p.known.slice(0, 4).map(restoreCard)
      : cards.map(() => null);
    while (known.length < 4) known.push(null);
    return {
      id: p.id ?? `p${index}`,
      name: p.name ?? (index === 0 ? "Vous" : `IA ${index}`),
      human: p.human ?? index === 0,
      difficulty: p.human ? null : (p.difficulty ?? "normal"),
      cards,
      known: known.map((card, slot) => (cards[slot] ? card : null)),
      score: Number.isFinite(p.score) ? p.score! : 0,
      color: p.color ?? ["#d7aa66", "#a7c1b2", "#c48c92", "#9d9bd3"][index % 4],
    } satisfies Player;
  });
  if (players.length < 2 || players.some((player) => !player)) return null;
  const restoredPlayers = players as Player[];
  const deck = raw.deck.map(restoreCard);
  const discard = raw.discard.map(restoreCard);
  if (deck.some((card) => !card) || discard.some((card) => !card)) return null;
  const game = {
    ...raw,
    players: restoredPlayers,
    deck: deck as Card[],
    discard: discard as Card[],
    drawn: restoreCard(raw.drawn),
    current: Math.max(
      0,
      Math.min(restoredPlayers.length - 1, raw.current ?? 0),
    ),
    phase: raw.phase ?? "peek",
    peekLeft: raw.peekLeft ?? 2,
    effect: raw.effect ?? null,
    actor: raw.actor ?? 0,
    target: raw.target ?? null,
    slot: raw.slot ?? null,
    message: raw.message ?? "La partie reprend.",
    round: raw.round ?? 1,
    lastFastMatchValue: raw.lastFastMatchValue ?? raw.lastFastValue ?? null,
    tocAllowed: raw.tocAllowed ?? (raw.phase === "play" && !raw.drawn),
    roundWinner: raw.roundWinner ?? null,
    tocCaller: raw.tocCaller ?? null,
    settings: raw.settings ?? { speed: true, sound: true },
    roundHistory: raw.roundHistory ?? [],
    events: raw.events ?? [],
  } as Game;
  return { ...game, cardLocations: locateCards(game) };
}
export function scorePlayer(p: Player) {
  return p.cards.reduce((sum, c) => sum + (c ? cardValue(c) : 0), 0);
}
export function viewForPlayer(game: Game, viewer: number): GameView {
  const reveal = game.phase === "round" || game.phase === "gameover";
  return {
    players: game.players.map((player, index) => ({
      id: player.id,
      name: player.name,
      human: player.human,
      difficulty: player.difficulty,
      score: player.score,
      color: player.color,
      cardCount: player.cards.filter(Boolean).length,
      cards: reveal
        ? [...player.cards]
        : index === viewer
          ? [...player.known]
          : player.cards.map(() => null),
    })),
    current: game.current,
    phase: game.phase,
    round: game.round,
    deckCount: game.deck.length,
    discard: [...game.discard],
    drawn: game.current === viewer ? game.drawn : null,
    effect: game.effect,
    message: game.message,
    peekLeft: game.peekLeft,
    lastFastMatchValue: game.lastFastMatchValue,
    tocAllowed: game.tocAllowed,
    roundHistory: [...game.roundHistory],
    events: game.events.map((event) => ({
      ...event,
      cardIds:
        event.actor === viewer ||
        event.type === "pair" ||
        event.type === "quick-play" ||
        event.type === "discard"
          ? event.cardIds
          : undefined,
    })),
    roundWinner: game.roundWinner,
    tocCaller: game.tocCaller,
  };
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
  const deltas = totals.map(
    (score, i) => score + (i === caller ? callerPenalty : 0),
  );
  const players = g.players.map((p, i) => ({
    ...p,
    score: p.score + deltas[i],
  }));
  const next = recordEvent(g, {
    type: "round-end",
    actor: caller ?? winner,
  });
  const record: RoundRecord = {
    round: g.round,
    deltas,
    totals,
    reason: caller === null ? "empty-hand" : "toc",
    caller,
    tocSucceeded: caller === null ? null : winner === caller,
    finisher: caller === null ? winner : null,
  };
  return {
    ...next,
    players,
    roundHistory: [...g.roundHistory, record],
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
  const next: Game = {
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
    lastFastMatchValue: null,
    tocAllowed: false,
    roundWinner: null,
    tocCaller: null,
    events: [
      ...g.events,
      {
        id: g.events.length + 1,
        round: g.round + 1,
        type: "deal" as const,
        actor: -1,
      },
    ],
  };
  return { ...next, cardLocations: locateCards(next) };
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
    ? recordEvent(
        {
          ...g,
          deck,
          drawn: c,
          lastFastMatchValue: null,
          phase: "discard",
          tocAllowed: false,
          message: "Échangez cette carte ou défaussez-la.",
        },
        {
          type: "draw",
          actor: g.current,
          cardIds: [c.id],
        },
      )
    : { ...g, message: "La pioche est vide." };
}
export function takeDrawn(g: Game, slot: number): Game {
  if (
    g.phase !== "discard" ||
    !g.drawn ||
    !Number.isInteger(slot) ||
    slot < 0 ||
    slot >= g.players[g.current].cards.length ||
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
  const next = recordEvent(
    { ...g, players, discard, drawn: null },
    {
      type: "exchange",
      actor: g.current,
      slots: [slot],
      cardIds: [g.drawn.id, g.players[g.current].cards[slot]!.id],
    },
  );
  return resolvePower(next, g.current, slot, g.drawn);
}
export function discardDrawn(g: Game): Game {
  if (g.phase !== "discard" || !g.drawn) return g;
  const current = (g.current + 1) % g.players.length;
  const next = recordEvent(
    {
      ...g,
      current,
      tocAllowed: true,
      discard: [...g.discard, g.drawn],
      drawn: null,
      lastFastMatchValue: null,
      phase: "play" as Phase,
      message: `Carte défaussée. Au tour de ${g.players[current].name}.`,
    },
    { type: "discard", actor: g.current, cardIds: [g.drawn.id] },
  );
  return next;
}
function resolvePower(g: Game, player: number, slot: number, c: Card): Game {
  if (c.power === "look")
    return {
      ...g,
      phase: "power",
      effect: "look",
      actor: player,
      slot,
      message:
        "Valet : regardez une carte à vous, puis remettez-la face cachée.",
    };
  if (c.power === "blind-swap")
    return {
      ...g,
      phase: "power",
      effect: "blind",
      actor: player,
      slot,
      message:
        "Dame : échangez une carte à vous avec celle d’un adversaire, sans les regarder.",
    };
  if (c.power === "sighted-swap")
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
  return g.phase === "power" &&
    g.effect === "look" &&
    Number.isInteger(slot) &&
    !!g.players[g.actor].cards[slot]
    ? recordEvent(
        {
          ...g,
          players: g.players.map((p, i) =>
            i === g.actor
              ? {
                  ...p,
                  known: p.known.map((c, j) =>
                    j === slot ? p.cards[slot] : c,
                  ),
                }
              : p,
          ),
          phase: "play",
          effect: null,
          message: `Vous avez mémorisé ${face(g.players[g.actor].cards[slot]!)} ${g.players[g.actor].cards[slot]!.suit}. Carte remise face cachée.`,
        },
        {
          type: "look",
          actor: g.actor,
          slots: [slot],
          cardIds: [g.players[g.actor].cards[slot]!.id],
        },
      )
    : g;
}
export function selectSightCard(g: Game, slot: number): Game {
  if (
    g.phase !== "power" ||
    g.effect !== "sight" ||
    !Number.isInteger(slot) ||
    slot < 0 ||
    slot >= g.players[g.actor].cards.length
  )
    return g;
  const card = g.players[g.actor].cards[slot];
  if (!card) return g;
  return recordEvent(
    {
      ...g,
      players: g.players.map((p, i) =>
        i === g.actor
          ? { ...p, known: p.known.map((c, j) => (j === slot ? card : c)) }
          : p,
      ),
      effect: "sight-target",
      slot,
      message: `Roi : votre ${face(card)} ${card.suit} est mémorisé. Choisissez une carte adverse.`,
    },
    { type: "look", actor: g.actor, slots: [slot], cardIds: [card.id] },
  );
}
export function swap(
  g: Game,
  own: number,
  targetPlayer: number,
  targetSlot: number,
): Game {
  if (
    g.phase !== "power" ||
    (g.effect !== "blind" && g.effect !== "sight-target") ||
    !Number.isInteger(targetPlayer) ||
    targetPlayer < 0 ||
    targetPlayer >= g.players.length ||
    targetPlayer === g.actor ||
    !Number.isInteger(targetSlot) ||
    targetSlot < 0 ||
    targetSlot >= (g.players[targetPlayer]?.cards.length ?? 0)
  )
    return g;
  const players = g.players.map((p) => ({
    ...p,
    cards: [...p.cards],
    known: [...p.known],
  }));
  const ownSlot = g.effect === "sight-target" ? g.slot : own;
  if (ownSlot === null) return g;
  const my = players[g.actor].cards[ownSlot],
    theirs = players[targetPlayer].cards[targetSlot];
  if (!my || !theirs) return g;
  players[g.actor].cards[ownSlot] = theirs;
  players[targetPlayer].cards[targetSlot] = my;
  players[g.actor].known[ownSlot] = g.effect === "sight-target" ? theirs : null;
  players[targetPlayer].known[targetSlot] = null;
  return recordEvent(
    {
      ...g,
      players,
      phase: "play",
      effect: null,
      message:
        g.effect === "sight-target"
          ? `Roi : vous avez vu ${face(my)} ${my.suit} partir et ${face(theirs)} ${theirs.suit} revenir.`
          : "Échange effectué à l’aveugle.",
    },
    {
      type: "swap",
      actor: g.actor,
      target: targetPlayer,
      slots: [ownSlot, targetSlot],
      cardIds: [my.id, theirs.id],
    },
  );
}
export function playPair(
  g: Game,
  slots: number[],
  player = g.current,
  fast = false,
): Game {
  if (
    g.phase !== "play" ||
    player < 0 ||
    player >= g.players.length ||
    slots.length < 2 ||
    slots.length > 4 ||
    new Set(slots).size !== slots.length ||
    slots.some(
      (slot) =>
        !Number.isInteger(slot) ||
        slot < 0 ||
        slot >= g.players[player].cards.length,
    )
  )
    return g;
  const cards = slots.map((s) => g.players[player].cards[s]);
  if (
    cards.some((c) => !c) ||
    new Set(cards.map((c) => matchValue(c!))).size !== 1
  )
    return g;
  const players = g.players.map((p, i) =>
    i === player
      ? {
          ...p,
          cards: p.cards.map((c, j) => (slots.includes(j) ? null : c)),
          known: p.known.map((c, j) => (slots.includes(j) ? null : c)),
        }
      : p,
  );
  const next = recordEvent(
    {
      ...g,
      players,
      discard: [...g.discard, ...(cards as Card[])],
      tocAllowed: fast ? g.tocAllowed : false,
      lastFastMatchValue: matchValue(cards[0]!),
      message: fast
        ? `Pose rapide ! ${slots.length} cartes de rang ${face(cards[0]!)}.`
        : `${slots.length} cartes posées — rang ${face(cards[0]!)}.`,
    },
    {
      type: fast ? "quick-play" : "pair",
      actor: player,
      slots,
      cardIds: (cards as Card[]).map((card) => card.id),
    },
  );
  if (players[player].cards.every((c) => !c)) return revealRound(next, null);
  return next;
}
export function callToc(g: Game): Game {
  return g.phase === "play" && g.tocAllowed
    ? revealRound(recordEvent(g, { type: "toc", actor: g.current }), g.current)
    : g;
}
export function endTurn(g: Game): Game {
  if (g.phase !== "play") return g;
  const current = (g.current + 1) % g.players.length;
  return {
    ...g,
    current,
    tocAllowed: true,
    phase: "play",
    message: `Au tour de ${g.players[current].name}.`,
  };
}
export function quickPlay(g: Game, player: number, card: Card): Game {
  if (
    player < 0 ||
    player >= g.players.length ||
    g.lastFastMatchValue === null ||
    matchValue(card) !== g.lastFastMatchValue ||
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
  const next = recordEvent(
    {
      ...g,
      players,
      discard: [...g.discard, card],
      lastFastMatchValue: matchValue(card),
      message: `Pose rapide ! Un ${face(card)} posé.`,
    },
    { type: "quick-play", actor: player, slots: [slot], cardIds: [card.id] },
  );
  return players[player].cards.every((c) => !c)
    ? revealRound(next, null)
    : next;
}
export function closeFastPlayWindow(
  g: Game,
  value = g.lastFastMatchValue,
): Game {
  return value === null || g.lastFastMatchValue !== value
    ? g
    : { ...g, lastFastMatchValue: null };
}
/** Resolve one rapid-play attempt using only cards each AI has memorized. */
export function aiFastReaction(g: Game, random = Math.random): Game {
  if (
    g.lastFastMatchValue === null ||
    g.phase === "round" ||
    g.phase === "gameover"
  )
    return g;
  const priorActor = g.events.at(-1)?.actor ?? g.current;
  const order = Array.from(
    { length: g.players.length },
    (_, offset) => (priorActor + 1 + offset) % g.players.length,
  );
  for (const playerIndex of order) {
    const player = g.players[playerIndex];
    if (
      player.human ||
      random() >
        { easy: 0.45, normal: 0.8, hard: 0.95, expert: 1 }[
          player.difficulty ?? "normal"
        ]
    )
      continue;
    const card = player.known.find(
      (candidate) =>
        candidate && matchValue(candidate) === g.lastFastMatchValue,
    );
    if (card) return quickPlay(g, playerIndex, card);
  }
  return g;
}
function tocWinProbability(game: Game, actor: number, random: () => number) {
  const player = game.players[actor];
  const knownIds = new Set([
    ...game.discard.map((card) => card.id),
    ...player.known.flatMap((card) => (card ? [card.id] : [])),
  ]);
  const unseen = makeDeck(() => 0).filter((card) => !knownIds.has(card.id));
  const ownKnownScore = player.known.reduce(
    (sum, card) => sum + (card ? cardValue(card) : 0),
    0,
  );
  const ownUnknownCount = player.cards.filter(
    (card, slot) => card && !player.known[slot],
  ).length;
  let wins = 0;
  const samples = 96;
  for (let sample = 0; sample < samples; sample++) {
    const cards = shuffled(unseen, random);
    let cursor = 0;
    const ownScore =
      ownKnownScore +
      cards
        .slice(cursor, cursor + ownUnknownCount)
        .reduce((sum, card) => sum + cardValue(card), 0);
    cursor += ownUnknownCount;
    let succeeds = true;
    for (let other = 0; other < game.players.length - 1; other++) {
      const opponent = game.players.filter((_, i) => i !== actor)[other];
      const count = opponent.cards.filter(Boolean).length;
      const score = cards
        .slice(cursor, cursor + count)
        .reduce((sum, card) => sum + cardValue(card), 0);
      cursor += count;
      if (ownScore >= score) succeeds = false;
    }
    if (succeeds) wins++;
  }
  return wins / samples;
}
export function aiTurn(g: Game, random = Math.random): Game {
  if (g.players[g.current].human || g.phase !== "play") return g;
  let game = g;
  if (game.lastFastMatchValue !== null) {
    const knownMatch = game.players[game.current].known.find(
      (card) => card && matchValue(card) === game.lastFastMatchValue,
    );
    if (knownMatch) {
      game = quickPlay(game, game.current, knownMatch);
      return game;
    }
    if (game.phase !== "play") return game;
  }
  let p = game.players[game.current];
  const difficulty = p.difficulty ?? "normal";
  const callThreshold: Record<Difficulty, number> = {
    easy: 0.32,
    normal: 0.58,
    hard: 0.76,
    expert: 0.9,
  };
  const winChance = tocWinProbability(game, game.current, random);
  if (winChance >= callThreshold[difficulty]) return callToc(game);
  const counts = new Map<number, number>();
  for (const c of p.known)
    if (c) {
      const v = matchValue(c);
      counts.set(v, (counts.get(v) || 0) + 1);
    }
  const pair = [...counts].find(([, n]) => n >= 2);
  if (pair) {
    const slots = p.known
      .flatMap((c, i) => (c && matchValue(c) === pair[0] ? [i] : []))
      .slice(0, pair[1]);
    game = playPair(game, slots);
    if (game.phase !== "play") return game;
    if (game.events.at(-1)?.type === "pair") return game;
  }
  p = game.players[game.current];
  const known = p.known
    .map((c, i) => (c && p.cards[i] ? i : -1))
    .filter((i) => i >= 0);
  const deck = [...game.deck];
  const c = deck.pop();
  if (!c) return endTurn(game);
  game = { ...game, deck, drawn: c, lastFastMatchValue: null };
  const activeSlots = p.cards.flatMap((card, i) => (card ? [i] : []));
  const knownWorst = [...known].sort(
    (a, b) => cardValue(p.known[b]!) - cardValue(p.known[a]!),
  )[0];
  const meanUnseen =
    makeDeck(() => 0)
      .filter(
        (card) =>
          !game.discard.some((seen) => seen.id === card.id) &&
          !p.known.some((seen) => seen?.id === card.id),
      )
      .reduce(
        (sum, card, _, cards) => sum + cardValue(card) / cards.length,
        0,
      ) || 5.6;
  const expectedSlot =
    knownWorst === undefined ? meanUnseen : cardValue(p.known[knownWorst]!);
  const acceptsPower = c.power !== null;
  const acceptsCard =
    acceptsPower ||
    (difficulty === "easy"
      ? random() < 0.52
      : cardValue(c) < expectedSlot ||
        (difficulty === "hard" && cardValue(c) <= expectedSlot) ||
        (difficulty === "expert" && cardValue(c) <= expectedSlot + 1));
  if (acceptsCard) {
    const unknownSlots = activeSlots.filter((slot) => !p.known[slot]);
    const slot =
      knownWorst !== undefined && cardValue(c) <= expectedSlot
        ? knownWorst
        : unknownSlots.length
          ? unknownSlots[Math.floor(random() * unknownSlots.length)]
          : knownWorst;
    if (slot === undefined)
      return endTurn({ ...game, phase: "play", drawn: null });
    game = { ...game, phase: "discard" };
    game = takeDrawn(game, slot);
    if (game.phase === "power" && game.effect === "look")
      game = finishLook(game, slot);
    else if (game.phase === "power" && game.effect === "blind") {
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
    } else if (game.phase === "power" && game.effect === "sight") {
      game = selectSightCard(game, slot);
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
    return game;
  }
  return endTurn(game);
}
