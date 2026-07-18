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
  WORD_ORDER: "Remets dans l'ordre",
  CORRECT_MISTAKE: "Corrige la faute",
};

export default function Dashboard({
  stats,
  focusLevel,
  onLogout,
  onStartLesson,
  onStartExam,
  onOpenCourse,
}: {
  stats: UserStats;
  focusLevel?: string | null;
  onLogout: () => void;
  onStartLesson: (lessonId: string, level: string) => void;
  onStartExam: (examId: string, level: string) => void;
  onOpenCourse: (courseId: string, level: string) => void;
}) {
  const [levels, setLevels] = useState<LevelDto[] | null>(null);
  const [dash, setDash] = useState<DashboardDto | null>(null);
  const [code, setCode] = useState("");
  const [unlockMsg, setUnlockMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [unlocking, setUnlocking] = useState(false);

  useEffect(() => {
    api.path().then(setLevels);
    api.dashboard().then(setDash);
  }, []);

  // Au retour d'une leçon / d'un test / d'un cours : re-scrolle sur le niveau
  // d'où l'utilisateur était parti (dès que le parcours est chargé).
  useEffect(() => {
    if (levels && focusLevel) {
      document.getElementById(`level-${focusLevel}`)?.scrollIntoView({ block: "start" });
    }
  }, [levels, focusLevel]);

  const s = dash?.stats ?? stats;

  const submitCode = async () => {
    const value = code.trim();
    if (!value || unlocking) return;
    setUnlocking(true);
    setUnlockMsg(null);
    try {
      const r = await api.unlock(value);
      setCode("");
      setUnlockMsg({ ok: true, text: `Niveau ${r.unlockedLevel} débloqué ! 🎉` });
      const [lv, d] = await Promise.all([api.path(), api.dashboard()]);
      setLevels(lv);
      setDash(d);
    } catch (e: any) {
      setUnlockMsg({ ok: false, text: e.message ?? "Code invalide." });
    } finally {
      setUnlocking(false);
    }
  };

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
              <div
                key={level.cefrLevel}
                id={`level-${level.cefrLevel}`}
                className={`level-block ${level.unlocked ? "" : "level-locked"}`}
              >
                <div className="level-header">
                  <span className="level-chip big">{level.cefrLevel}</span>
                  {!level.unlocked && <span className="lock-note">🔒 Réussis le test du niveau précédent</span>}
                </div>

                {level.courses.length > 0 && (
                  <div className="course-row">
                    {level.courses.map((c) => (
                      <button
                        key={c.id}
                        className="course-card"
                        onClick={() => onOpenCourse(c.id, level.cefrLevel)}
                        title={c.intro}
                      >
                        <span className="course-emoji">{c.emoji}</span>
                        <span className="course-info">
                          <span className="course-kind">📖 Cours</span>
                          <span className="course-title">{c.title}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                )}

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
                          onClick={() => onStartLesson(l.id, level.cefrLevel)}
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
                        onClick={() => onStartExam(level.exam!.id, level.cefrLevel)}
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

            <section className="panel unlock-panel">
              <h2>🔓 Débloquer un niveau</h2>
              <p className="muted">Entre un code de déblocage pour ouvrir un niveau.</p>
              <div className="unlock-row">
                <input
                  type="text"
                  placeholder="Ton code…"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && submitCode()}
                  disabled={unlocking}
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                />
                <button className="btn btn-primary" onClick={submitCode} disabled={unlocking || !code.trim()}>
                  {unlocking ? "…" : "Valider"}
                </button>
              </div>
              {unlockMsg && (
                <p className={unlockMsg.ok ? "unlock-ok" : "unlock-err"}>{unlockMsg.text}</p>
              )}
            </section>
          </aside>
        </div>
      </main>
    </div>
  );
}
