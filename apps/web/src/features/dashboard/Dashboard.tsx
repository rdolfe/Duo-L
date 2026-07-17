import { useEffect, useState } from "react";
import { api, DashboardDto, LevelDto, UserStats } from "../../lib/api";

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
  onStartExam,
}: {
  stats: UserStats;
  onLogout: () => void;
  onStartLesson: (lessonId: string) => void;
  onStartExam: (examId: string) => void;
}) {
  const [levels, setLevels] = useState<LevelDto[] | null>(null);
  const [dash, setDash] = useState<DashboardDto | null>(null);

  useEffect(() => {
    api.path().then(setLevels);
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
            {!levels && <p>Chargement du parcours…</p>}
            {levels?.map((level) => (
              <div key={level.cefrLevel} className={`level-block ${level.unlocked ? "" : "level-locked"}`}>
                <div className="level-header">
                  <span className="level-chip big">{level.cefrLevel}</span>
                  {!level.unlocked && <span className="lock-note">🔒 Réussis le test du niveau précédent</span>}
                </div>

                {level.units.map((u) => (
                  <div key={u.id} className="unit-card">
                    <div className="unit-head">
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

                {level.exam && (
                  <div className={`exam-card ${level.exam.status.toLowerCase()}`}>
                    <div className="exam-card-head">
                      <span className="exam-emoji">
                        {level.exam.status === "PASSED" ? "🏅" : level.exam.status === "UNLOCKED" ? "🎓" : "🔒"}
                      </span>
                      <div>
                        <h3>{level.exam.title}</h3>
                        <p>
                          {level.exam.status === "PASSED"
                            ? `Réussi : ${level.exam.bestOn20}/20 · meilleur score ${level.exam.bestScore}%`
                            : level.exam.status === "UNLOCKED"
                              ? `${level.exam.exerciseCount} questions · noté sur 20 · minimum ${Math.round(level.exam.passScore / 5)}/20`
                              : "Termine toutes les leçons du niveau pour débloquer le test."}
                        </p>
                      </div>
                    </div>
                    {level.exam.status !== "LOCKED" && (
                      <button
                        className={`btn ${level.exam.status === "PASSED" ? "btn-ghost" : "btn-primary"}`}
                        onClick={() => onStartExam(level.exam!.id)}
                      >
                        {level.exam.status === "PASSED" ? "Repasser le test" : "Passer le test 🎓"}
                      </button>
                    )}
                  </div>
                )}
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
