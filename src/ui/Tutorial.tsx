import { useState } from "react";
import { ArrowLeft, ArrowRight, Eye, Sparkles } from "lucide-react";

const lessons = [
  {
    eyebrow: "01 · MÉMOIRE",
    title: "Regardez deux cartes.",
    text: "Au début de chaque manche, choisissez deux de vos quatre cartes pour les mémoriser. Elles retournent ensuite face cachée.",
  },
  {
    eyebrow: "02 · VOTRE TOUR",
    title: "Piochez, puis décidez.",
    text: "Prenez une carte. Vous pouvez l’échanger avec l’une de vos cartes, ou la refuser en la posant sur la défausse.",
  },
  {
    eyebrow: "03 · LES POUVOIRS",
    title: "Les figures changent la table.",
    text: "Valet : regardez une carte à vous. Dame : échangez à l’aveugle. Roi : voyez votre carte avant et après l’échange.",
  },
  {
    eyebrow: "04 · POSE RAPIDE",
    title: "Même rang ? Posez-la vite.",
    text: "Après une pose, vous avez 10 secondes pour tenter une carte de même rang, même hors de votre tour. Choisissez votre carte face cachée : sa face ne sera pas révélée avant votre choix. Une erreur ajoute une carte de pénalité à votre main.",
  },
  {
    eyebrow: "05 · FIN DE MANCHE",
    title: "Le bon moment pour TOC TOC.",
    text: "Au début de votre tour, avant de piocher, annoncez TOC TOC. Vous devez avoir strictement moins de points que chaque autre joueur ; sinon vous prenez leurs points.",
  },
];

export default function Tutorial({
  onBack,
  onStart,
}: {
  onBack: () => void;
  onStart: () => void;
}) {
  const [step, setStep] = useState(0);
  const [remembered, setRemembered] = useState<number[]>([]);
  const lesson = lessons[step];
  const toggleCard = (index: number) => {
    if (remembered.includes(index))
      setRemembered(remembered.filter((item) => item !== index));
    else if (remembered.length < 2) setRemembered([...remembered, index]);
  };
  return (
    <section className="subpage tutorial-page">
      <button className="back-link" onClick={onBack}>
        <ArrowLeft size={16} /> Retour
      </button>
      <p className="eyebrow">
        <Sparkles size={14} /> APPRENDRE EN JOUANT
      </p>
      <div
        className="tutorial-progress"
        aria-label={`Étape ${step + 1} sur ${lessons.length}`}
      >
        {lessons.map((_, i) => (
          <span key={i} className={i <= step ? "filled" : ""} />
        ))}
      </div>
      <div className="tutorial-layout">
        <div className="tutorial-copy">
          <span className="eyebrow">{lesson.eyebrow}</span>
          <h1>{lesson.title}</h1>
          <p>{lesson.text}</p>
          {step === 0 && (
            <p className="tutorial-hint">
              <Eye size={15} /> Touchez deux cartes pour les regarder et les
              mémoriser.
            </p>
          )}
          <div className="tutorial-controls">
            {step > 0 && (
              <button
                className="button button-outline"
                onClick={() => setStep(step - 1)}
              >
                Précédent
              </button>
            )}
            {step < lessons.length - 1 ? (
              <button
                className="button button-gold"
                disabled={step === 0 && remembered.length !== 2}
                onClick={() => setStep(step + 1)}
              >
                Continuer <ArrowRight size={16} />
              </button>
            ) : (
              <button className="button button-gold" onClick={onStart}>
                À la table <ArrowRight size={16} />
              </button>
            )}
          </div>
        </div>
        <div className="tutorial-table" aria-label="Démonstration des cartes">
          <div className="tutorial-cards">
            {[
              { rank: "7", suit: "♠" },
              { rank: "Q", suit: "♥" },
              { rank: "7", suit: "♦" },
              { rank: "K", suit: "♣" },
            ].map((card, i) => {
              const open = step === 0 && remembered.includes(i);
              return (
                <button
                  key={i}
                  className={`tutorial-card ${open ? "revealed" : ""} ${card.suit === "♥" || card.suit === "♦" ? "red-card" : "black-card"}`}
                  onClick={() => step === 0 && toggleCard(i)}
                  aria-label={
                    open
                      ? `Carte ${card.rank} ${card.suit}, mémorisée`
                      : "Carte face cachée"
                  }
                >
                  {open ? (
                    <>
                      <b>{card.rank}</b>
                      <span>{card.suit}</span>
                    </>
                  ) : (
                    <span className="tutorial-card-back">TT</span>
                  )}
                </button>
              );
            })}
          </div>
          <div className="tutorial-table-note">
            {step === 0
              ? `${remembered.length} / 2 CARTES MÉMORISÉES`
              : step === 3
                ? "7♠ = 7♦ · MÊME RANG"
                : "GARDEZ L’ŒIL OUVERT"}
          </div>
        </div>
      </div>
    </section>
  );
}
