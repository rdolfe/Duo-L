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
};

export default function ExamComplete({
  result,
  onContinue,
}: {
  result: ExamSubmitResult;
  onContinue: () => void;
}) {
  const passMark = Math.round(result.passScore / 5); // note minimale sur 20

  return (
    <div className="shell">
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
