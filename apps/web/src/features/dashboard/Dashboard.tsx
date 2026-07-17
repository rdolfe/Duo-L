import { useEffect, useState } from "react";
import { api, DashboardDto, UnitSummary, UserStats } from "../../lib/api";

const TYPE_LABELS: Record<string, string> = {
  LISTEN_REPEAT: "Écoute & répète",
  TRANSLATE_SPEAK: "Traduis & parle",
  ROLEPLAY: "Dialogue",
  READ_ALOUD: "Lecture à voix haute",
  MULTIPLE_CHOICE: "QCM",
  FILL_BLANK: "Phrase à trou",
  WRITE_TRANSLATION: "Traduction écrite",
  LISTEN_TYPE: "Dictée",
};

export default function Dashboard({
  stats,
  onLogout,
  onStartLesson,
}: {
  stats: UserStats;
  onLogout: () => void;
  onStartLesson: (lessonId: string) => void;
}) {
  const [units, setUnits] = useState<UnitSummary[] | null>(null);
  const [dash, setDash] = useState<DashboardDto | null>(null);

  useEffect(() => {
    api.units().then(setUnits);
    api.dashboard().then(setDash);
  }, []);

  const s = dash?.stats ?? stats;

  return (
    <div className="shell">
      <header className="topbar">
        <div className="logo small">🦜 DuoSpeak</div>
        <div className="stats-strip">
          <span className="stat" title="Série de jours">🔥 {s.currentStreak}</span>
          <span className="stat" title="Vies">❤️ {s.hearts}</span>
          <span className="stat" title="Points d'expérience">⚡ {s.totalXp} XP</span>
          <span className="stat level-chip" title="Niveau CECRL">{s.cefrLevel}</span>
        </div>
        <button className="btn btn-ghost" onClick={onLogout}>Déconnexion</button>
      </header>

      <main className="dashboard">
        <section className="hero">
          <h1>Salut {s.displayName} 👋</h1>
          <p>
            {s.lessonsCompleted === 0
              ? "Prêt à prononcer tes premiers mots en anglais ?"
              : `${s.lessonsCompleted} leçon${s.lessonsCompleted > 1 ? "s" : ""} terminée${s.lessonsCompleted > 1 ? "s" : ""} — continue comme ça !`}
          </p>
        </section>

        <div className="columns">
          <section className="path">
            <h2>Ton parcours</h2>
            {!units && <p>Chargement du parcours…</p>}
            {units?.map((u) => (
              <div key={u.id} className="unit-card">
                <div className="unit-head">
                  <span className="level-chip">{u.cefrLevel}</span>
                  <div>
                    <h3>{u.title}</h3>
                    <p>{u.description}</p>
                  </div>
                </div>
                <div className="lesson-row">
                  {u.lessons.map((l) => (
                    <button
                      key={l.id}
                      className={`lesson-node ${l.status.toLowerCase()}`}
                      disabled={l.status === "LOCKED"}
                      onClick={() => onStartLesson(l.id)}
                      title={
                        l.status === "LOCKED"
                          ? "Termine la leçon précédente pour débloquer"
                          : `${l.exerciseCount} exercices · ${l.xpReward} XP`
                      }
                    >
                      <span className="node-icon">
                        {l.status === "COMPLETED" ? "✓" : l.status === "LOCKED" ? "🔒" : "🎤"}
                      </span>
                      <span className="node-title">{l.title}</span>
                      {l.bestScore != null && <span className="node-score">{l.bestScore}%</span>}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </section>

          <aside className="sidebar">
            <section className="panel">
              <h2>Badges</h2>
              <div className="badges-grid">
                {dash?.badges.map((b) => (
                  <div key={b.slug} className={b.earned ? "badge" : "badge locked"} title={b.descriptionFr}>
                    <span className="badge-icon">{b.icon}</span>
                    <span className="badge-title">{b.titleFr}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="panel">
              <h2>Activité récente</h2>
              {dash?.history.length === 0 && <p className="muted">Aucun exercice pour l'instant.</p>}
              <ul className="history">
                {dash?.history.map((h) => (
                  <li key={h.id}>
                    <span>{h.passed ? "✅" : "❌"}</span>
                    <span className="hist-title">
                      {h.lessonTitle} · {TYPE_LABELS[h.type] ?? h.type}
                    </span>
                    <span className="hist-score">{h.score}%</span>
                  </li>
                ))}
              </ul>
            </section>

            <section className="panel">
              <h2>Record</h2>
              <p className="muted">Plus longue série : 🔥 {s.longestStreak} jour{s.longestStreak > 1 ? "s" : ""}</p>
            </section>
          </aside>
        </div>
      </main>
    </div>
  );
}
