import { useEffect, useState } from "react";
import { api, CourseDto } from "../../lib/api";
import { speak } from "../../lib/speech";

// Lecteur de cours théorique : sections avec explications en français,
// exemples anglais écoutables (🔊) et encadrés « astuce ».
export default function CourseReader({
  courseId,
  onBack,
}: {
  courseId: string;
  onBack: () => void;
}) {
  const [course, setCourse] = useState<CourseDto | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.course(courseId).then(setCourse).catch((e) => setError(e.message));
  }, [courseId]);

  if (error) {
    return (
      <div className="page-center">
        <div className="panel">
          <p className="error">{error}</p>
          <button className="btn btn-primary" onClick={onBack}>Retour</button>
        </div>
      </div>
    );
  }
  if (!course) return <div className="page-center">Chargement du cours…</div>;

  return (
    <div className="shell course-shell">
      <header className="lesson-top">
        <button className="btn btn-ghost" onClick={onBack} title="Retour au parcours">←</button>
        <span className="course-topbar-title">
          {course.emoji} {course.title}
        </span>
        <span className="level-chip">{course.cefrLevel}</span>
      </header>

      <main className="course-body">
        <p className="course-intro">{course.intro}</p>

        {course.sections.map((s, i) => (
          <section key={i} className="course-section">
            <h2>{s.heading}</h2>
            {s.body && <p className="course-text">{s.body}</p>}
            {s.examples && s.examples.length > 0 && (
              <ul className="course-examples">
                {s.examples.map((ex, j) => (
                  <li key={j} className="course-example">
                    <button
                      className="btn btn-speaker small"
                      onClick={() => speak(ex.en)}
                      title="Écouter la prononciation"
                    >
                      🔊
                    </button>
                    <div>
                      <span className="example-en">{ex.en}</span>
                      <span className="example-fr">{ex.fr}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {s.tip && <div className="course-tip">💡 {s.tip}</div>}
          </section>
        ))}

        <button className="btn btn-primary btn-block" onClick={onBack}>
          J'ai compris — au parcours ! 🚀
        </button>
      </main>
    </div>
  );
}
