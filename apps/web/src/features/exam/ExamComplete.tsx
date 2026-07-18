import { useState } from "react";
import { ExamSubmitResult, ExerciseType } from "../../lib/api";

const TYPE_LABELS: Record<ExerciseType, string> = {
  LISTEN_REPEAT: "Écoute & répète",
  TRANSLATE_SPEAK: "Traduis & parle",
  ROLEPLAY: "Dialogue",
  READ_ALOUD: "Lecture à voix haute",
  MULTIPLE_CHOICE: "QCM",
  FILL_BLANK: "Phrase à trou",
  WRITE_TRANSLATION: "Traduction écrite",
  LISTEN_TYPE: "Dictée",
  WORD_ORDER: "Remets dans l'ordre",
  CORRECT_MISTAKE: "Corrige la faute",
};

// Messages affichés quand l'utilisateur ose mettre moins de 5 étoiles.
// Il n'y a qu'une seule issue. 😈
const GRUMPY_MESSAGES = [
  "😾 Hmm. Il doit y avoir une erreur de manipulation. Reprends ton souffle et réessaie.",
  "🥺 Sérieusement ? Après tout ce qu'on a vécu ensemble ? Reconsidère ton choix…",
  "😤 Le perroquet a vu ta note. Il est très déçu. Il attend.",
  "🦜💔 DuoSpeak a passé la nuit à préparer tes exercices. Et toi, tu lui fais ÇA ?",
  "🙃 Petit rappel amical : ce pop-up ne partira qu'à 5 étoiles. On a tout notre temps.",
  "⏳ Nous avons désactivé rien du tout, mais imagine si on l'avait fait. Allez, 5 étoiles.",
];

// Pop-up de notation « très motivant » : seule la note maximale permet de
// fermer la fenêtre. Toute autre note relance la boucle avec un message vexé.
function RatingGate({ onHappy }: { onHappy: () => void }) {
  const [hovered, setHovered] = useState(0);
  const [selected, setSelected] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [thanks, setThanks] = useState(false);

  const submit = () => {
    if (selected === 5) {
      setThanks(true);
      setTimeout(onHappy, 1600);
    } else {
      setAttempts((a) => a + 1);
      setSelected(0);
      setHovered(0);
    }
  };

  return (
    <div className="rating-overlay">
      <div className="rating-modal">
        {thanks ? (
          <>
            <div className="big-emoji">🥰</div>
            <h3>Merci !</h3>
            <p className="muted">Nous aussi on t'adore. Bonne continuation !</p>
          </>
        ) : (
          <>
            <div className="big-emoji">{attempts === 0 ? "🌟" : "🦜"}</div>
            <h3>{attempts === 0 ? "Tu aimes DuoSpeak ?" : "Réessayons ça…"}</h3>
            <p className="muted">
              {attempts === 0
                ? "Note l'application pour nous aider à progresser !"
                : GRUMPY_MESSAGES[(attempts - 1) % GRUMPY_MESSAGES.length]}
            </p>
            <div className="stars" onMouseLeave={() => setHovered(0)}>
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  className={`star ${(hovered || selected) >= n ? "on" : ""}`}
                  onMouseEnter={() => setHovered(n)}
                  onClick={() => setSelected(n)}
                  aria-label={`${n} étoile${n > 1 ? "s" : ""}`}
                >
                  ★
                </button>
              ))}
            </div>
            <button className="btn btn-primary btn-block" disabled={selected === 0} onClick={submit}>
              Envoyer ma note
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function ExamComplete({
  result,
  onContinue,
}: {
  result: ExamSubmitResult;
  onContinue: () => void;
}) {
  const passMark = Math.round(result.passScore / 5); // note minimale sur 20
  const [rated, setRated] = useState(false);

  return (
    <div className="shell">
      {!rated && <RatingGate onHappy={() => setRated(true)} />}
      <main className="dashboard exam-result">
        <div className="panel exam-score-panel">
          <div className="big-emoji">{result.passed ? "🎓" : "📚"}</div>
          <h2>{result.passed ? "Test réussi !" : "Test non validé"}</h2>

          <div className={`score-on20 ${result.passed ? "ok" : "ko"}`}>
            <span className="score-num">{result.scoreOn20}</span>
            <span className="score-den">/20</span>
          </div>
          <p className="muted">
            {result.scorePercent}% — moyenne à {passMark}/20 pour valider le niveau.
          </p>

          {result.passed ? (
            <p className="exam-verdict ok">
              {result.justUnlockedNext
                ? "🔓 Le niveau suivant est débloqué. Bravo !"
                : "Niveau déjà validé — tu peux continuer."}
              {result.xpGained > 0 && <> {" "}(+{result.xpGained} XP)</>}
            </p>
          ) : (
            <p className="exam-verdict ko">
              Continue à t'entraîner puis retente le test. Tu vas y arriver !
            </p>
          )}

          {result.newBadges.length > 0 && (
            <div className="new-badges">
              <h3>Nouveau{result.newBadges.length > 1 ? "x" : ""} badge{result.newBadges.length > 1 ? "s" : ""} !</h3>
              {result.newBadges.map((b) => (
                <div key={b.slug} className="badge earned-anim">
                  <span className="badge-icon">{b.icon}</span>
                  <span className="badge-title">{b.titleFr}</span>
                </div>
              ))}
            </div>
          )}

          <button className="btn btn-primary btn-block" onClick={onContinue}>
            Continuer
          </button>
        </div>

        <section className="panel">
          <h2>Correction</h2>
          <ul className="exam-review">
            {result.details.map((d, i) => (
              <li key={d.exerciseId} className={d.passed ? "rev pass" : "rev fail"}>
                <div className="rev-head">
                  <span>{d.passed ? "✅" : "❌"}</span>
                  <span className="rev-type">Q{i + 1} · {TYPE_LABELS[d.type]}</span>
                  <span className="rev-score">{d.score}%</span>
                </div>
                <div className="rev-body">
                  <p className="muted">Ta réponse : « {d.yourAnswer || "—"} »</p>
                  {d.score < 100 && (
                    <p className="correct-answer">✅ Bonne réponse : <strong>{d.correctAnswer}</strong></p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
}
