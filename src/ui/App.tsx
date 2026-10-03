import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { playCue } from "../audio";
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
  Volume2,
  VolumeX,
  X,
  Zap,
} from "lucide-react";
import {
  aiTurn,
  callToc,
  Card,
  cardValue,
  draw,
  endTurn,
  face,
  finishLook,
  Game,
  nextRound,
  Player,
  playPair,
  quickPlay,
  red,
  rememberCard,
  scorePlayer,
  startGame,
  swap,
  takeDrawn,
  discardDrawn,
} from "../engine";

type Screen = "home" | "mode" | "rules" | "game";
const names = ["Vous", "Léonie", "Marcel", "Iris"];
const fmt = (n: number) => String(n).padStart(2, "0");
function App() {
  const [game, setGame] = useState<Game | null>(() => {
    try {
      const saved = localStorage.getItem("toc-toc-save");
      return saved ? (JSON.parse(saved) as Game) : null;
    } catch {
      return null;
    }
  });
  const [screen, setScreen] = useState<Screen>(() => {
    try {
      return localStorage.getItem("toc-toc-save") ? "game" : "home";
    } catch {
      return "home";
    }
  });
  const [modal, setModal] = useState<"pause" | "settings" | null>(null);
  const [selection, setSelection] = useState<number[]>([]);
  const [notice, setNotice] = useState("");
  const [sound, setSound] = useState(true);
  const [speed, setSpeed] = useState(true);
  const current = game?.players[game.current];
  const start = () => {
    setGame(startGame(names));
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
      650,
    );
    return () => clearTimeout(id);
  }, [screen, modal, game?.current, game?.phase]);
  const toast = (t: string) => {
    setNotice(t);
    window.setTimeout(() => setNotice(""), 2800);
  };
  const remember = (i: number) => {
    if (!game) return;
    const c = game.players[0].cards[i];
    if (!c) return;
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
            message: "Votre tour commence. Piochez ou annoncez TOC TOC.",
          })),
        450,
      );
    }
  };
  const select = (i: number) =>
    setSelection((s) => (s.includes(i) ? s.filter((x) => x !== i) : [...s, i]));
  const humanCards = game?.players[0].cards || [];
  const validPair =
    selection.length >= 2 &&
    selection.length <= 4 &&
    selection.every((i) => humanCards[i] !== null) &&
    new Set(selection.map((i) => cardValue(humanCards[i]!))).size === 1;
  const onCardClick = (player: Player, index: number) => {
    if (!game) return;
    if (game.phase === "peek" && player.human) {
      remember(index);
      return;
    }
    if (game.phase === "power") {
      if (game.effect === "look" && player.human) {
        const c = player.cards[index];
        if (c) {
          toast(`Vous mémorisez ${face(c)} ${c.suit}`);
          mutate((g) => finishLook(g, index));
        }
        return;
      }
      if (game.effect === "blind" || game.effect === "sight") {
        if (player.human) {
          setSelection([index]);
          toast("Choisissez maintenant une carte chez un adversaire.");
          return;
        }
        const own = selection[0];
        if (own === undefined) return;
        mutate((g) => swap(g, own, game.players.indexOf(player), index));
        setSelection([]);
        return;
      }
    }
    if (game.lastFastValue !== null && player.human) {
      const knownCard = player.known[index];
      if (knownCard && cardValue(knownCard) === game.lastFastValue) {
        mutate((g) => quickPlay(g, game.players.indexOf(player), knownCard));
        toast("Pose rapide !");
        return;
      }
    }
    if (game.lastFastValue !== null && !player.human) {
      return;
    }
    if (player.human && game.phase === "play" && game.current === 0) {
      if (player.cards[index]) select(index);
      return;
    }
    if (player.human && game.phase === "discard")
      mutate((g) => takeDrawn(g, index));
  };
  const showKnown = (i: number) =>
    game?.phase === "round" ||
    game?.phase === "gameover" ||
    Boolean(game?.players[0].known[i]);
  const reload = () => {
    setGame((g) => (g ? nextRound(g) : g));
    setSelection([]);
  };
  const best = game?.players.reduce(
    (a, p) => (p.score < a.score ? p : a),
    game.players[0],
  );
  return (
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
                onClick={() => setScreen("rules")}
              >
                <BookOpen size={16} /> Découvrir les règles
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
                Quatre joueurs, vous et trois adversaires. Une seule table, des
                cartes cachées, une mémoire à toute épreuve.
              </p>
              <div className="mode-meta">
                <span>
                  <span className="status-dot" /> HORS LIGNE
                </span>
                <span>15–25 MIN</span>
                <span>4 JOUEURS</span>
              </div>
            </div>
            <button className="button button-gold" onClick={start}>
              Jouer maintenant <ArrowRight size={16} />
            </button>
          </div>
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
                Chaque joueur reçoit 4 cartes face cachée. Au début, regardez-en
                2 et mémorisez-les. À votre tour, piochez puis échangez avec une
                de vos cartes, ou défaussez.
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
              <h3>Posez les mêmes valeurs</h3>
              <p>
                À votre tour, posez 2 à 4 cartes de même valeur. Hors tour,
                posez immédiatement une carte de la même valeur qu’une pose qui
                vient d’être faite, avant toute autre carte.
              </p>
            </article>
            <article>
              <span className="rule-number">04</span>
              <h3>Osez le TOC TOC</h3>
              <p>
                Au début de votre tour, avant de piocher, annoncez TOC TOC. Tout
                le monde révèle ses cartes. Si votre total est strictement le
                plus bas, chacun marque ses points. Sinon, vous prenez tous les
                points des autres.
              </p>
            </article>
            <article className="rule-wide">
              <span className="rule-number">05</span>
              <h3>Visez le score le plus bas</h3>
              <p>
                As = 1 · 2 à 10 = valeur faciale · Valet rouge = 11 · Dame rouge
                = 12 · Roi rouge = 13 · Figures noires = 0. Dès 100 points, la
                partie s’arrête : le score le plus bas gagne.
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
      {screen === "game" && game && (
        <motion.section
          className={`game-screen ${speed ? "motion-fast" : ""} effect-${game.effect ?? "none"}`}
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
            <div className="seat seat-top">
              <PlayerSeat
                player={game.players[2]}
                active={game.current === 2}
                current={game.current === 2}
                onClick={onCardClick}
                game={game}
                onCardHidden={() =>
                  game.phase === "round" || game.phase === "gameover"
                }
              />
            </div>
            <div className="seat seat-left">
              <PlayerSeat
                player={game.players[1]}
                active={game.current === 1}
                current={game.current === 1}
                onClick={onCardClick}
                game={game}
                onCardHidden={() =>
                  game.phase === "round" || game.phase === "gameover"
                }
              />
            </div>
            <div className="seat seat-right">
              <PlayerSeat
                player={game.players[3]}
                active={game.current === 3}
                current={game.current === 3}
                onClick={onCardClick}
                game={game}
                onCardHidden={() =>
                  game.phase === "round" || game.phase === "gameover"
                }
              />
            </div>
            <div className="center-table">
              <div className="table-glow" />
              <div className="pile-label">
                DÉFAUSSE <span>{game.discard.length} CARTES</span>
              </div>
              <motion.div
                key={game.discard.at(-1)?.id}
                className="table-card-wrap"
                initial={{ y: -18, rotate: 8, opacity: 0 }}
                animate={{ y: 0, rotate: -4, opacity: 1 }}
              >
                <CardView card={game.discard.at(-1)!} small />
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
                <i>{game.deck.length}</i>
              </button>
              <div className="turn-pill">
                <span className="status-dot" />
                {game.phase === "peek"
                  ? "MÉMORISEZ VOS CARTES"
                  : game.current === 0
                    ? "À VOUS DE JOUER"
                    : `TOUR DE ${current?.name.toUpperCase()}`}
              </div>
            </div>
            <div className="seat seat-bottom">
              <div className="you-row">
                <PlayerSeat
                  player={game.players[0]}
                  active={game.current === 0}
                  current={game.current === 0}
                  onClick={onCardClick}
                  game={game}
                  human
                  onCardHidden={showKnown}
                />
                <div className="you-meta">
                  <span>VOTRE MAIN</span>
                  <b>
                    {game.players[0].cards.filter(Boolean).length}
                    <small> cartes</small>
                  </b>
                </div>
              </div>
            </div>
          </div>
          <div className="action-dock">
            <div className="dock-left">
              <span className="score-label">
                VOTRE SCORE <b>{fmt(game.players[0].score)}</b>
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
                  <button
                    className="button button-outline"
                    onClick={() => mutate(callToc)}
                  >
                    <span className="toc-icon">!</span> TOC TOC
                  </button>
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
          {game.phase === "discard" && game.current === 0 && game.drawn && (
            <motion.div
              className="drawn-card"
              initial={{ opacity: 0, y: 35, rotate: 5 }}
              animate={{ opacity: 1, y: 0, rotate: 0 }}
            >
              <span>PIOCHÉE</span>
              <CardView card={game.drawn} />
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
                  {game.players.map((p) => (
                    <div key={p.id}>
                      <span>{p.name}</span>
                      <b>{fmt(scorePlayer(p))}</b>
                      <small>
                        +
                        {game.tocCaller !== null &&
                        game.roundWinner !== game.tocCaller &&
                        p.id === game.players[game.tocCaller].id
                          ? game.players
                              .filter((q) => q !== p)
                              .reduce((a, q) => a + scorePlayer(q), 0)
                          : scorePlayer(p)}{" "}
                        PTS
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
                  Le score le plus bas l’emporte après le seuil des 100 points.
                </p>
                <div className="result-scores">
                  {game.players
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
                <button className="close-button" onClick={() => setModal(null)}>
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
  game,
  human = false,
  onCardHidden,
}: {
  player: Player;
  active: boolean;
  current: boolean;
  onClick: (p: Player, i: number) => void;
  game: Game;
  human?: boolean;
  onCardHidden?: (i: number) => boolean;
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
              : "IA · " +
                (player.id === "p1"
                  ? "MALIGNE"
                  : player.id === "p2"
                    ? "OBSERVATEUR"
                    : "TACTICIEN")}
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
            className={`card-slot ${human && game.phase === "play" && game.current === 0 && onCardHidden?.(i) ? "selected" : ""}`}
            onClick={() => onClick(player, i)}
            whileTap={{ scale: 0.96 }}
            title={human ? "Carte face cachée" : player.name}
          >
            {card ? (
              (human && onCardHidden?.(i)) ||
              game.phase === "round" ||
              game.phase === "gameover" ? (
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
