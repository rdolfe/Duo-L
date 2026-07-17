import { CompleteResult } from "../../lib/api";

export default function LessonComplete({
  result,
  onContinue,
}: {
  result: CompleteResult;
  onContinue: () => void;
}) {
  return (
    <div className="page-center">
      <div className="panel complete-panel">
        <div className="big-emoji">{result.perfect ? "💎" : "🎉"}</div>
        <h2>{result.perfect ? "Leçon parfaite !" : "Leçon terminée !"}</h2>

        <div className="reward-row">
          <div className="reward">
            <span className="reward-value">+{result.xpGained}</span>
            <span className="reward-label">XP</span>
          </div>
          <div className="reward">
            <span className="reward-value">{result.bestScore}%</span>
            <span className="reward-label">Score moyen</span>
          </div>
          <div className="reward">
            <span className="reward-value">🔥 {result.stats.currentStreak}</span>
            <span className="reward-label">Série</span>
          </div>
        </div>

        {result.newBadges.length > 0 && (
          <div className="new-badges">
            <h3>Nouveau{result.newBadges.length > 1 ? "x" : ""} badge{result.newBadges.length > 1 ? "s" : ""} !</h3>
            {result.newBadges.map((b) => (
              <div key={b.slug} className="badge earned-anim">
                <span className="badge-icon">{b.icon}</span>
                <span className="badge-title">{b.titleFr}</span>
                <span className="muted">{b.descriptionFr}</span>
              </div>
            ))}
          </div>
        )}

        <button className="btn btn-primary btn-block" onClick={onContinue}>
          Continuer
        </button>
      </div>
    </div>
  );
}
