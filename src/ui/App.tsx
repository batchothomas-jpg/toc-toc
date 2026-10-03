import { useEffect, useState } from "react";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import { playCue, setEffectsVolume, setMusicVolume } from "../audio";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CircleHelp,
  Crown,
  Eye,
  FastForward,
  Pause,
  Play,
  RotateCcw,
  Settings2,
  Shield,
  Sparkles,
  Trophy,
  Volume2,
  VolumeX,
  X,
  Zap,
} from "lucide-react";
import {
  aiFastReaction,
  aiTurn,
  callToc,
  Card,
  closeFastPlayWindow,
  Difficulty,
  matchValue,
  draw,
  endTurn,
  face,
  finishLook,
  Game,
  GameView,
  nextRound,
  PlayerView,
  playPair,
  quickPlay,
  red,
  rememberCard,
  restoreSavedGame,
  selectSightCard,
  startGame,
  swap,
  takeDrawn,
  discardDrawn,
  viewForPlayer,
} from "../engine";
import Tutorial from "./Tutorial";

type Screen = "home" | "mode" | "rules" | "tutorial" | "scores" | "game";
const names = ["Vous", "Léonie", "Marcel", "Iris"];
const fmt = (n: number) => String(n).padStart(2, "0");
function App() {
  const [game, setGame] = useState<Game | null>(() => {
    try {
      const saved = localStorage.getItem("toc-toc-save");
      return saved ? restoreSavedGame(JSON.parse(saved)) : null;
    } catch {
      return null;
    }
  });
  const [screen, setScreen] = useState<Screen>(() => {
    try {
      return game ? "game" : "home";
    } catch {
      return "home";
    }
  });
  const [modal, setModal] = useState<"pause" | "settings" | null>(null);
  const [opponentCount, setOpponentCount] = useState<1 | 2 | 3>(3);
  const [difficulty, setDifficulty] = useState<Difficulty>("normal");
  const [selection, setSelection] = useState<number[]>([]);
  const [privateRevealSlot, setPrivateRevealSlot] = useState<number | null>(
    null,
  );
  const [notice, setNotice] = useState("");
  const [sound, setSound] = useState(true);
  const [speed, setSpeed] = useState(true);
  const [reduceMotion, setReduceMotion] = useState(
    () =>
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false,
  );
  const [quality, setQuality] = useState<"high" | "medium" | "eco">("high");
  const [effectVolume, setEffectVolume] = useState(70);
  const [musicVolume, setMusicVolumeState] = useState(0);
  const view = game ? viewForPlayer(game, 0) : null;
  const current = view?.players[view.current];
  const start = () => {
    setGame(
      startGame(names.slice(0, opponentCount + 1), Math.random, difficulty),
    );
    setScreen("game");
    setModal(null);
    setSelection([]);
  };
  const mutate = (fn: (g: Game) => Game) => setGame((g) => (g ? fn(g) : g));
  useEffect(() => {
    try {
      if (game) localStorage.setItem("toc-toc-save", JSON.stringify(game));
      else localStorage.removeItem("toc-toc-save");
    } catch {
      /* Storage can be unavailable in private browsing; the current session still works. */
    }
  }, [game]);
  useEffect(() => {
    if (!game || !sound) return;
    const message = game.message.toLowerCase();
    if (
      message.includes("toc toc réussi") ||
      message.includes("manche terminée")
    )
      playCue("win");
    else if (message.includes("toc toc")) playCue("toc");
    else if (
      message.includes("pose rapide") ||
      message.includes("cartes posées")
    )
      playCue("pair");
    else if (
      message.includes("valet") ||
      message.includes("dame") ||
      message.includes("roi")
    )
      playCue("power");
    else if (message.includes("pioche") || message.includes("échange"))
      playCue("card");
  }, [game?.message, sound]);
  useEffect(() => {
    setEffectsVolume(sound ? effectVolume / 100 : 0);
  }, [sound, effectVolume]);
  useEffect(() => {
    if (
      screen !== "game" ||
      modal ||
      !game ||
      !current ||
      current.human ||
      game.phase !== "play"
    )
      return;
    const id = window.setTimeout(
      () => setGame((g) => (g ? aiTurn(g) : g)),
      game.lastFastMatchValue === null ? 650 : 1050,
    );
    return () => clearTimeout(id);
  }, [screen, modal, game?.current, game?.phase, game?.events.length]);
  useEffect(() => {
    if (screen !== "game" || modal || !game || game.lastFastMatchValue === null)
      return;
    const match = game.lastFastMatchValue;
    const reaction = window.setTimeout(
      () => setGame((g) => (g ? aiFastReaction(g) : g)),
      260,
    );
    const close = window.setTimeout(
      () => setGame((g) => (g ? closeFastPlayWindow(g, match) : g)),
      900,
    );
    return () => {
      clearTimeout(reaction);
      clearTimeout(close);
    };
  }, [screen, modal, game?.events.length, game?.lastFastMatchValue]);
  const toast = (t: string) => {
    setNotice(t);
    window.setTimeout(() => setNotice(""), 2800);
  };
  const remember = (i: number) => {
    if (!game) return;
    if (game.players[0].known[i]) return;
    setPrivateRevealSlot(i);
    window.setTimeout(
      () => setPrivateRevealSlot((slot) => (slot === i ? null : slot)),
      1100,
    );
    mutate((g) => ({
      ...rememberCard(g, 0, i),
      peekLeft: Math.max(0, g.peekLeft - 1),
      message:
        g.peekLeft <= 1
          ? "Vos deux cartes sont mémorisées."
          : "Choisissez une autre carte à regarder.",
    }));
    if (game.peekLeft <= 1) {
      window.setTimeout(
        () =>
          mutate((g) => ({
            ...g,
            phase: "play",
            tocAllowed: true,
            message: "Votre tour commence. Piochez ou annoncez TOC TOC.",
          })),
        450,
      );
    }
  };
  const select = (i: number) =>
    setSelection((s) => (s.includes(i) ? s.filter((x) => x !== i) : [...s, i]));
  const humanCards = view?.players[0].cards || [];
  const validPair =
    selection.length >= 2 &&
    selection.length <= 4 &&
    selection.every((i) => humanCards[i] !== null) &&
    new Set(selection.map((i) => matchValue(humanCards[i]!))).size === 1;
  const onCardClick = (player: PlayerView, index: number) => {
    if (!game) return;
    if (game.phase === "peek" && player.human) {
      remember(index);
      return;
    }
    if (game.phase === "power") {
      if (game.effect === "look" && player.human) {
        setPrivateRevealSlot(index);
        window.setTimeout(
          () => setPrivateRevealSlot((slot) => (slot === index ? null : slot)),
          1000,
        );
        toast("Carte mémorisée.");
        mutate((g) => finishLook(g, index));
        return;
      }
      if (game.effect === "sight" && player.human) {
        setPrivateRevealSlot(index);
        window.setTimeout(
          () => setPrivateRevealSlot((slot) => (slot === index ? null : slot)),
          1100,
        );
        mutate((g) => selectSightCard(g, index));
        toast("Carte mémorisée. Choisissez une carte adverse.");
        return;
      }
      if (game.effect === "blind" || game.effect === "sight-target") {
        if (player.human) {
          if (game.effect === "sight-target") {
            toast("Choisissez maintenant une carte chez un adversaire.");
            return;
          }
          setSelection([index]);
          toast("Choisissez maintenant une carte chez un adversaire.");
          return;
        }
        const own = game.effect === "sight-target" ? game.slot : selection[0];
        if (own === undefined || own === null) return;
        mutate((g) =>
          swap(
            g,
            own,
            g.players.findIndex((candidate) => candidate.id === player.id),
            index,
          ),
        );
        setPrivateRevealSlot(null);
        setSelection([]);
        return;
      }
    }
    if (game.lastFastMatchValue !== null && player.human) {
      const knownCard = player.cards[index];
      if (knownCard && matchValue(knownCard) === game.lastFastMatchValue) {
        mutate((g) => quickPlay(g, 0, knownCard));
        toast("Pose rapide !");
        return;
      }
    }
    if (game.lastFastMatchValue !== null && !player.human) {
      return;
    }
    if (player.human && game.phase === "play" && game.current === 0) {
      if (humanCards[index]) select(index);
      return;
    }
    if (player.human && game.phase === "discard")
      mutate((g) => takeDrawn(g, index));
  };
  const reload = () => {
    setGame((g) => (g ? nextRound(g) : g));
    setSelection([]);
  };
  const best = view?.players.reduce(
    (a, p) => (p.score < a.score ? p : a),
    view.players[0],
  );
  const bestHandScore = view?.roundHistory.length
    ? Math.min(...view.roundHistory.map((record) => record.deltas[0] ?? 0))
    : null;
  const seatSlots =
    view?.players.length === 2
      ? ["seat-top"]
      : view?.players.length === 3
        ? ["seat-top", "seat-right"]
        : ["seat-top", "seat-left", "seat-right"];
  return (
    <MotionConfig
      reducedMotion={reduceMotion ? "always" : "never"}
      transition={{ duration: reduceMotion ? 0.01 : speed ? 0.2 : 0.38 }}
    >
      <main className="app-shell">
        <div className="ambient ambient-a" />
        <div className="ambient ambient-b" />
        {screen === "home" && (
          <motion.section
            className="home"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <header className="brand">
              <span className="brand-mark">T</span>
              <span>
                STUDIO <b>TOC TOC</b>
              </span>
              <span className="brand-line" />
              <span className="edition">ÉDITION NOCTURNE · 01</span>
            </header>
            <div className="hero-copy">
              <p className="eyebrow">
                <span />
                LE JEU DE CARTES QUI NE DIT PAS SON DERNIER MOT
              </p>
              <h1>
                Gardez
                <br />
                <i>l’œil ouvert.</i>
              </h1>
              <p className="hero-description">
                Quatre cartes. Une mémoire imparfaite.
                <br />
                Et le bon moment pour dire <em>TOC TOC.</em>
              </p>
              <div className="hero-actions">
                <button
                  className="button button-gold"
                  onClick={() => setScreen("mode")}
                >
                  Lancer une partie <ArrowRight size={17} />
                </button>
                <button
                  className="button button-quiet"
                  onClick={() => setScreen("tutorial")}
                >
                  <Sparkles size={16} /> Tutoriel interactif
                </button>
                <button
                  className="button button-quiet"
                  onClick={() => setScreen("rules")}
                >
                  <BookOpen size={16} /> Les règles
                </button>
              </div>
            </div>
            <div className="hero-table">
              <div className="table-light" />
              <div className="table-ring ring-one" />
              <div className="table-ring ring-two" />
              <div className="hero-card back-card">
                <span>TT</span>
              </div>
              <div className="hero-card front-card">
                <span className="card-corner">
                  K<br />♦
                </span>
                <span className="hero-suit">♦</span>
                <span className="card-corner bottom">
                  K<br />♦
                </span>
              </div>
              <div className="spark spark-one">✦</div>
              <div className="spark spark-two">✧</div>
              <div className="hero-caption">
                <span>01 / 04</span>
                <span>LA MÉMOIRE EST VOTRE MEILLEURE ALLIÉE</span>
              </div>
            </div>
            <footer className="home-footer">
              <span>UNE PARTIE EN SOLO · 4 JOUEURS</span>
              <span>TOUT EST DANS LE REGARD.</span>
              <span>© TOC TOC STUDIO</span>
            </footer>
          </motion.section>
        )}
        {screen === "mode" && (
          <motion.section
            className="subpage"
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <button className="back-link" onClick={() => setScreen("home")}>
              <ArrowLeft size={16} /> Retour
            </button>
            <p className="eyebrow">CHOISISSEZ VOTRE TABLE</p>
            <h1>
              La partie
              <br />
              <i>commence ici.</i>
            </h1>
            <div className="mode-card">
              <div className="mode-symbol">
                <Sparkles size={24} />
              </div>
              <div>
                <span className="eyebrow">MODE DISPONIBLE</span>
                <h2>Contre les esprits</h2>
                <p>
                  Vous et {opponentCount} adversaire
                  {opponentCount > 1 ? "s" : ""}. Une table, des cartes cachées
                  et une mémoire à toute épreuve.
                </p>
                <div className="mode-meta">
                  <span>
                    <span className="status-dot" /> HORS LIGNE
                  </span>
                  <span>15–25 MIN</span>
                  <span>{opponentCount + 1} JOUEURS</span>
                </div>
              </div>
              <button className="button button-gold" onClick={start}>
                Jouer maintenant <ArrowRight size={16} />
              </button>
            </div>
            <section
              className="setup-options"
              aria-label="Options de partie solo"
            >
              <div className="setup-option">
                <span className="eyebrow">ADVERSAIRES IA</span>
                <div className="segmented-control">
                  {[1, 2, 3].map((count) => (
                    <button
                      key={count}
                      className={opponentCount === count ? "chosen" : ""}
                      onClick={() => setOpponentCount(count as 1 | 2 | 3)}
                      aria-pressed={opponentCount === count}
                    >
                      {count}
                    </button>
                  ))}
                </div>
                <small>Choisissez de 1 à 3 adversaires.</small>
              </div>
              <div className="setup-option">
                <span className="eyebrow">NIVEAU DE LA TABLE</span>
                <div className="difficulty-options">
                  {(["easy", "normal", "hard", "expert"] as Difficulty[]).map(
                    (level) => (
                      <button
                        key={level}
                        className={difficulty === level ? "chosen" : ""}
                        onClick={() => setDifficulty(level)}
                        aria-pressed={difficulty === level}
                      >
                        {
                          {
                            easy: "Facile",
                            normal: "Normal",
                            hard: "Difficile",
                            expert: "Expert",
                          }[level]
                        }
                      </button>
                    ),
                  )}
                </div>
                <small>
                  Les IA gardent uniquement les informations qu’elles ont
                  obtenues.
                </small>
              </div>
            </section>
            <div className="coming-card">
              <Shield size={18} />
              <span>
                <b>La table entre amis</b>
                <small>Multijoueur en ligne — bientôt disponible</small>
              </span>
              <span className="coming-tag">À VENIR</span>
            </div>
          </motion.section>
        )}
        {screen === "rules" && (
          <motion.section
            className="subpage rules-page"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <button
              className="back-link"
              onClick={() => setScreen(game ? "game" : "home")}
            >
              <ArrowLeft size={16} /> Retour
            </button>
            <p className="eyebrow">LE PETIT GUIDE DE LA TABLE</p>
            <h1>
              Les règles,
              <br />
              <i>en un clin d’œil.</i>
            </h1>
            <div className="rules-grid">
              <article>
                <span className="rule-number">01</span>
                <h3>Gardez vos cartes secrètes</h3>
                <p>
                  Chaque joueur reçoit 4 cartes face cachée. Au début,
                  regardez-en 2 et mémorisez-les. À votre tour, piochez puis
                  échangez avec une de vos cartes, ou défaussez.
                </p>
              </article>
              <article>
                <span className="rule-number">02</span>
                <h3>Les figures ont un pouvoir</h3>
                <p>
                  <b>Valet</b> : regardez une de vos cartes. <b>Dame</b> :
                  échangez à l’aveugle avec un adversaire. <b>Roi</b> : regardez
                  votre carte et celle reçue à la fin de l’échange.
                </p>
              </article>
              <article>
                <span className="rule-number">03</span>
                <h3>Posez les cartes de même rang</h3>
                <p>
                  À votre tour, posez 2 à 4 cartes de même rang. Hors tour,
                  posez immédiatement une carte de ce rang après une pose, avant
                  toute autre carte. La couleur ne compte pas : un Roi noir
                  correspond à un Roi rouge, même si leurs scores diffèrent.
                </p>
              </article>
              <article>
                <span className="rule-number">04</span>
                <h3>Osez le TOC TOC</h3>
                <p>
                  Au début de votre tour, avant de piocher, annoncez TOC TOC.
                  Tout le monde révèle ses cartes. Si votre total est
                  strictement le plus bas, chacun marque ses points. Sinon, vous
                  prenez tous les points des autres.
                </p>
              </article>
              <article className="rule-wide">
                <span className="rule-number">05</span>
                <h3>Visez le score le plus bas</h3>
                <p>
                  As = 1 · 2 à 10 = valeur faciale · Valet rouge = 11 · Dame
                  rouge = 12 · Roi rouge = 13 · Figures noires = 0. Dès 100
                  points, la partie s’arrête : le score le plus bas gagne.
                </p>
              </article>
            </div>
            <button
              className="button button-gold"
              onClick={() => (game ? setScreen("game") : setScreen("mode"))}
            >
              C’est compris <ArrowRight size={16} />
            </button>
          </motion.section>
        )}
        {screen === "tutorial" && (
          <Tutorial onBack={() => setScreen("home")} onStart={start} />
        )}
        {screen === "scores" && game && view && (
          <motion.section
            className="subpage scores-page"
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <button className="back-link" onClick={() => setScreen("game")}>
              <ArrowLeft size={16} /> Retour à la table
            </button>
            <p className="eyebrow">
              SCORE GLOBAL · {game.roundHistory.length} MANCHE
              {game.roundHistory.length === 1 ? "" : "S"}
            </p>
            <h1>
              La mémoire
              <br />
              <i>des manches.</i>
            </h1>
            <div className="global-score-list">
              {view.players
                .slice()
                .sort((a, b) => a.score - b.score)
                .map((player, rank) => (
                  <div className="global-score-row" key={player.id}>
                    <span className="rank-number">
                      {String(rank + 1).padStart(2, "0")}
                    </span>
                    <span>{player.name}</span>
                    <b>{player.score}</b>
                    <small>POINTS</small>
                  </div>
                ))}
            </div>
            <div className="round-history">
              <h2>Historique des manches</h2>
              {!game.roundHistory.length && (
                <p>La première manche n’est pas encore terminée.</p>
              )}
              {game.roundHistory.map((record) => (
                <article className="history-row" key={record.round}>
                  <span>MANCHE {fmt(record.round)}</span>
                  <span>
                    {record.reason === "toc"
                      ? record.tocSucceeded
                        ? "TOC TOC réussi"
                        : "TOC TOC raté"
                      : `Main terminée · ${view.players[record.finisher ?? 0]?.name}`}
                  </span>
                  <div>
                    {record.deltas.map((delta, i) => (
                      <b key={i}>
                        {view.players[i]?.name}: +{delta}
                      </b>
                    ))}
                  </div>
                </article>
              ))}
            </div>
            {game.phase === "gameover" && (
              <button className="button button-gold" onClick={start}>
                Nouvelle partie <RotateCcw size={16} />
              </button>
            )}
          </motion.section>
        )}
        {screen === "game" && game && (
          <motion.section
            className={`game-screen ${speed ? "motion-fast" : ""} ${reduceMotion ? "reduce-motion" : ""} quality-${quality} effect-${game.effect ?? "none"}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <header className="game-header">
              <button className="mini-brand" onClick={() => setModal("pause")}>
                <span className="brand-mark">T</span>
                <span>
                  TOC TOC <small>ÉDITION NOCTURNE</small>
                </span>
              </button>
              <div className="round-label">
                MANCHE <b>{fmt(game.round)}</b>
                <span />
              </div>
              <div className="header-controls">
                <button
                  title="Score général"
                  onClick={() => setScreen("scores")}
                >
                  <Trophy size={17} />
                </button>
                <button title="Règles" onClick={() => setScreen("rules")}>
                  <CircleHelp size={18} />
                </button>
                <button title="Paramètres" onClick={() => setModal("settings")}>
                  <Settings2 size={18} />
                </button>
                <button title="Pause" onClick={() => setModal("pause")}>
                  <Pause size={17} />
                </button>
              </div>
            </header>
            <div className="game-board">
              {view?.players.slice(1).map((player, index) => (
                <div key={player.id} className={`seat ${seatSlots[index]}`}>
                  <PlayerSeat
                    player={player}
                    active={view.current === index + 1}
                    current={view.current === index + 1}
                    onClick={onCardClick}
                    phase={view.phase}
                  />
                </div>
              ))}
              <div className="center-table">
                <div className="table-glow" />
                <div className="pile-label">
                  DÉFAUSSE <span>{view!.discard.length} CARTES</span>
                </div>
                <motion.div
                  key={view?.events.at(-1)?.id}
                  className="table-card-wrap"
                  initial={{ y: -18, rotate: 8, opacity: 0 }}
                  animate={{ y: 0, rotate: -4, opacity: 1 }}
                >
                  <CardView card={view!.discard.at(-1)!} small />
                </motion.div>
                <button
                  className={`deck ${game.phase === "play" && current?.human ? "deck-ready" : ""}`}
                  onClick={() =>
                    game.phase === "play" && current?.human
                      ? mutate(draw)
                      : undefined
                  }
                >
                  <span className="deck-mark">TT</span>
                  <small>PIOCHE</small>
                  <i>{view?.deckCount}</i>
                </button>
                <div className="turn-pill">
                  <span className="status-dot" />
                  {view?.phase === "peek"
                    ? "MÉMORISEZ VOS CARTES"
                    : view?.current === 0
                      ? "À VOUS DE JOUER"
                      : `TOUR DE ${current?.name.toUpperCase()}`}
                </div>
              </div>
              <div className="seat seat-bottom">
                <div className="you-row">
                  <PlayerSeat
                    player={view!.players[0]}
                    active={view!.current === 0}
                    current={view!.current === 0}
                    onClick={onCardClick}
                    phase={view!.phase}
                    human
                    selectedSlots={selection}
                    privateRevealSlot={privateRevealSlot}
                  />
                  <div className="you-meta">
                    <span>VOTRE MAIN</span>
                    <b>
                      {view!.players[0].cardCount}
                      <small> cartes</small>
                    </b>
                  </div>
                </div>
              </div>
            </div>
            <div className="action-dock">
              <div className="dock-left">
                <span className="score-label">
                  VOTRE SCORE <b>{fmt(view!.players[0].score)}</b>
                </span>
                <span className="score-rule" />
                <span className="score-label">
                  MEILLEUR <b>{fmt(best?.score || 0)}</b>
                </span>
              </div>
              <div className="dock-actions">
                {game.phase === "peek" && (
                  <span className="action-hint">
                    <Eye size={15} /> Regardez {game.peekLeft} carte
                    {game.peekLeft > 1 ? "s" : ""}
                  </span>
                )}
                {game.phase === "play" && game.current === 0 && (
                  <>
                    {game.tocAllowed && (
                      <button
                        className="button button-outline"
                        onClick={() => mutate(callToc)}
                      >
                        <span className="toc-icon">!</span> TOC TOC
                      </button>
                    )}
                    <button
                      className="button button-outline"
                      disabled={!validPair}
                      onClick={() => {
                        mutate((g) => playPair(g, selection));
                        setSelection([]);
                      }}
                    >
                      <Zap size={15} /> Poser{" "}
                      {selection.length > 0 ? `(${selection.length})` : ""}
                    </button>
                    <button
                      className="button button-gold"
                      onClick={() => mutate(endTurn)}
                    >
                      Terminer <ArrowRight size={15} />
                    </button>
                  </>
                )}
                {game.phase === "discard" && game.current === 0 && (
                  <>
                    <span className="action-hint">
                      Échangez une carte ou défaussez
                    </span>
                    <button
                      className="button button-gold"
                      onClick={() => mutate(discardDrawn)}
                    >
                      Défausser <ArrowRight size={15} />
                    </button>
                  </>
                )}
                {game.phase === "power" && (
                  <span className="action-hint">
                    <Eye size={15} />
                    {game.message}
                  </span>
                )}
                {(game.phase === "round" || game.phase === "gameover") && (
                  <button
                    className="button button-gold"
                    onClick={game.phase === "round" ? reload : start}
                  >
                    {game.phase === "round" ? "Manche suivante" : "Rejouer"}{" "}
                    <ArrowRight size={15} />
                  </button>
                )}
              </div>
              <button
                className={`sound-toggle ${sound ? "" : "muted"}`}
                onClick={() => setSound(!sound)}
                title="Son"
              >
                <span className="sound-bars">
                  <i />
                  <i />
                  <i />
                  <i />
                </span>
                {sound ? <Volume2 size={16} /> : <VolumeX size={16} />}
              </button>
            </div>
            <AnimatePresence>
              {notice && (
                <motion.div
                  className="toast"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                >
                  {notice}
                </motion.div>
              )}
            </AnimatePresence>
            {game.phase === "discard" && game.current === 0 && view!.drawn && (
              <motion.div
                className="drawn-card"
                initial={{ opacity: 0, y: 35, rotate: 5 }}
                animate={{ opacity: 1, y: 0, rotate: 0 }}
              >
                <span>PIOCHÉE</span>
                <CardView card={view!.drawn!} />
                <p>Choisissez une carte à remplacer</p>
              </motion.div>
            )}
            {game.phase === "round" && (
              <div className="overlay">
                <motion.div
                  className="result-panel"
                  initial={{ opacity: 0, scale: 0.92, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                >
                  <span className="eyebrow">
                    RÉSULTAT DE LA MANCHE {fmt(game.round)}
                  </span>
                  <h2>
                    {game.roundWinner === 0
                      ? "Vous remportez la manche"
                      : game.tocCaller === 0
                        ? "Le TOC TOC a échoué"
                        : "Manche terminée"}
                  </h2>
                  <p>{game.message}</p>
                  <div className="result-scores">
                    {view!.players.map((p, i) => (
                      <div key={p.id}>
                        <span>{p.name}</span>
                        <b>{fmt(view!.roundHistory.at(-1)?.totals[i] ?? 0)}</b>
                        <small>
                          +{fmt(view!.roundHistory.at(-1)?.deltas[i] ?? 0)} PTS
                        </small>
                      </div>
                    ))}
                  </div>
                  <button className="button button-gold" onClick={reload}>
                    Manche suivante <ArrowRight size={16} />
                  </button>
                </motion.div>
              </div>
            )}
            {game.phase === "gameover" && (
              <div className="overlay">
                <motion.div
                  className="result-panel grand"
                  initial={{ opacity: 0, scale: 0.92 }}
                  animate={{ opacity: 1, scale: 1 }}
                >
                  <Crown size={30} className="crown" />
                  <span className="eyebrow">PARTIE TERMINÉE</span>
                  <h2>{best?.name} remporte la partie</h2>
                  <p>
                    Le score le plus bas l’emporte après le seuil des 100
                    points.
                  </p>
                  <div className="gameover-stats">
                    <span>
                      <small>MANCHES JOUÉES</small>
                      <b>{view!.roundHistory.length}</b>
                    </span>
                    <span>
                      <small>MEILLEURE MANCHE</small>
                      <b>
                        {bestHandScore === null ? "—" : `${bestHandScore} pts`}
                      </b>
                    </span>
                  </div>
                  <div className="result-scores">
                    {view!.players
                      .slice()
                      .sort((a, b) => a.score - b.score)
                      .map((p) => (
                        <div key={p.id}>
                          <span>{p.name}</span>
                          <b>{fmt(p.score)}</b>
                          <small>POINTS</small>
                        </div>
                      ))}
                  </div>
                  <button className="button button-gold" onClick={start}>
                    Nouvelle partie <RotateCcw size={16} />
                  </button>
                  <button
                    className="button button-outline"
                    onClick={() => setScreen("scores")}
                  >
                    Historique des manches
                  </button>
                </motion.div>
              </div>
            )}
            {modal && (
              <div className="overlay modal-overlay">
                <motion.div
                  className="pause-panel"
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <button
                    className="close-button"
                    onClick={() => setModal(null)}
                  >
                    <X />
                  </button>
                  <span className="eyebrow">
                    TOC TOC · MANCHE {fmt(game.round)}
                  </span>
                  <h2>
                    {modal === "pause"
                      ? "On souffle un instant."
                      : "Vos préférences"}
                  </h2>
                  <p>
                    {modal === "pause"
                      ? "La table vous attend. Reprenez quand vous voulez."
                      : "Ajustez votre expérience de jeu."}
                  </p>
                  {modal === "settings" && (
                    <div className="settings-list">
                      <button onClick={() => setSound(!sound)}>
                        {sound ? <Volume2 /> : <VolumeX />} Sons{" "}
                        <b>{sound ? "Activés" : "Coupés"}</b>
                      </button>
                      <button onClick={() => setSpeed(!speed)}>
                        <FastForward /> Animations{" "}
                        <b>{speed ? "Rapides" : "Confort"}</b>
                      </button>
                      <label className="range-setting">
                        Effets sonores <span>{effectVolume}%</span>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={effectVolume}
                          onChange={(event) => {
                            const value = Number(event.target.value);
                            setEffectVolume(value);
                            setEffectsVolume(sound ? value / 100 : 0);
                          }}
                        />
                      </label>
                      <label className="range-setting">
                        Ambiance synthétique <span>{musicVolume}%</span>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={musicVolume}
                          onChange={(event) => {
                            const value = Number(event.target.value);
                            setMusicVolumeState(value);
                            setMusicVolume(value / 100);
                          }}
                        />
                      </label>
                      <div className="quality-setting">
                        <span>Qualité graphique</span>
                        <div className="difficulty-options">
                          {(["high", "medium", "eco"] as const).map((level) => (
                            <button
                              key={level}
                              className={quality === level ? "chosen" : ""}
                              onClick={() => setQuality(level)}
                            >
                              {
                                {
                                  high: "Élevée",
                                  medium: "Moyenne",
                                  eco: "Économie",
                                }[level]
                              }
                            </button>
                          ))}
                        </div>
                      </div>
                      <button onClick={() => setReduceMotion(!reduceMotion)}>
                        <Sparkles /> Réduire les animations{" "}
                        <b>{reduceMotion ? "Activé" : "Désactivé"}</b>
                      </button>
                    </div>
                  )}
                  <button
                    className="button button-gold full"
                    onClick={() => setModal(null)}
                  >
                    <Play size={16} /> Reprendre
                  </button>
                  <button
                    className="button button-quiet full"
                    onClick={() => {
                      setModal(null);
                      setScreen("home");
                    }}
                  >
                    Quitter la partie
                  </button>
                </motion.div>
              </div>
            )}
          </motion.section>
        )}
      </main>
    </MotionConfig>
  );
}

function CardView({ card, small = false }: { card: Card; small?: boolean }) {
  return (
    <div
      className={`playing-card ${red(card) ? "red-card" : "black-card"} ${small ? "card-small" : ""}`}
    >
      <span className="corner top">
        <b>{face(card)}</b>
        {card.suit}
      </span>
      <span className="card-center">{card.suit}</span>
      <span className="corner bottom">
        <b>{face(card)}</b>
        {card.suit}
      </span>
      <span className="card-foil" />
    </div>
  );
}
function PlayerSeat({
  player,
  active,
  current,
  onClick,
  phase,
  human = false,
  selectedSlots = [],
  privateRevealSlot = null,
}: {
  player: PlayerView;
  active: boolean;
  current: boolean;
  onClick: (p: PlayerView, i: number) => void;
  phase: GameView["phase"];
  human?: boolean;
  selectedSlots?: number[];
  privateRevealSlot?: number | null;
}) {
  return (
    <div
      className={`player-seat ${active ? "active" : ""} ${human ? "human-seat" : ""}`}
    >
      <div className="player-info">
        <span
          className="avatar"
          style={{ "--avatar": player.color } as React.CSSProperties}
        >
          {player.human ? "Y" : player.name[0]}
        </span>
        <span className="player-name">
          {player.name}
          <small>
            {player.human
              ? "VOUS"
              : `IA · ${{ easy: "FACILE", normal: "NORMALE", hard: "DIFFICILE", expert: "EXPERTE" }[player.difficulty ?? "normal"]}`}
          </small>
        </span>
        <b className="player-score">{String(player.score).padStart(2, "0")}</b>
        {current && <span className="active-mark" />}
      </div>
      <div className={`player-cards ${human ? "your-cards" : ""}`}>
        {player.cards.map((card, i) => (
          <motion.button
            layout
            key={i}
            className={`card-slot ${selectedSlots.includes(i) ? "selected" : ""}`}
            onClick={() => onClick(player, i)}
            whileTap={{ scale: 0.96 }}
            title={human ? "Carte face cachée" : player.name}
          >
            {card ? (
              (human && privateRevealSlot === i) ||
              phase === "round" ||
              phase === "gameover" ? (
                <CardView card={card} />
              ) : (
                <div className={`card-back ${human ? "your-back" : ""}`}>
                  <span>TT</span>
                </div>
              )
            ) : (
              <span className="empty-slot" />
            )}
          </motion.button>
        ))}
      </div>
    </div>
  );
}

export default App;
