import { useEffect, useState } from "react";
import { api, getToken, setToken, UserStats, CompleteResult, ExamSubmitResult } from "./lib/api";
import AuthPage from "./features/auth/AuthPage";
import Dashboard from "./features/dashboard/Dashboard";
import LessonPlayer from "./features/lesson/LessonPlayer";
import LessonComplete from "./features/lesson/LessonComplete";
import ExamPlayer from "./features/exam/ExamPlayer";
import ExamComplete from "./features/exam/ExamComplete";
import CourseReader from "./features/course/CourseReader";

type View =
  | { name: "loading" }
  | { name: "auth" }
  | { name: "dashboard" }
  | { name: "lesson"; lessonId: string }
  | { name: "complete"; result: CompleteResult }
  | { name: "exam"; examId: string }
  | { name: "examResult"; result: ExamSubmitResult }
  | { name: "course"; courseId: string };

export default function App() {
  const [view, setView] = useState<View>({ name: "loading" });
  const [stats, setStats] = useState<UserStats | null>(null);
  // Niveau CECRL d'où l'utilisateur est parti (leçon, test, cours) : au retour
  // sur le parcours, on re-scrolle directement dessus.
  const [focusLevel, setFocusLevel] = useState<string | null>(null);

  useEffect(() => {
    if (!getToken()) {
      setView({ name: "auth" });
      return;
    }
    api
      .me()
      .then((s) => {
        setStats(s);
        setView({ name: "dashboard" });
      })
      .catch(() => {
        setToken(null);
        setView({ name: "auth" });
      });
  }, []);

  const handleAuth = (token: string, user: UserStats) => {
    setToken(token);
    setStats(user);
    setView({ name: "dashboard" });
  };

  const logout = () => {
    setToken(null);
    setStats(null);
    setView({ name: "auth" });
  };

  const backToDashboard = async () => {
    try {
      setStats(await api.me());
    } catch {
      /* garde les stats précédentes si l'appel échoue */
    }
    setView({ name: "dashboard" });
  };

  switch (view.name) {
    case "loading":
      return <div className="page-center">Chargement…</div>;
    case "auth":
      return <AuthPage onAuth={handleAuth} />;
    case "dashboard":
      return (
        <Dashboard
          stats={stats!}
          focusLevel={focusLevel}
          onLogout={logout}
          onStartLesson={(lessonId, level) => {
            setFocusLevel(level);
            setView({ name: "lesson", lessonId });
          }}
          onStartExam={(examId, level) => {
            setFocusLevel(level);
            setView({ name: "exam", examId });
          }}
          onOpenCourse={(courseId, level) => {
            setFocusLevel(level);
            setView({ name: "course", courseId });
          }}
        />
      );
    case "lesson":
      return (
        <LessonPlayer
          lessonId={view.lessonId}
          hearts={stats?.hearts ?? 5}
          onQuit={backToDashboard}
          onComplete={(result) => {
            setStats(result.stats);
            setView({ name: "complete", result });
          }}
        />
      );
    case "complete":
      return <LessonComplete result={view.result} onContinue={() => setView({ name: "dashboard" })} />;
    case "exam":
      return (
        <ExamPlayer
          examId={view.examId}
          onQuit={backToDashboard}
          onFinished={(result) => {
            setStats(result.stats);
            setView({ name: "examResult", result });
          }}
        />
      );
    case "examResult":
      return <ExamComplete result={view.result} onContinue={() => setView({ name: "dashboard" })} />;
    case "course":
      return <CourseReader courseId={view.courseId} onBack={() => setView({ name: "dashboard" })} />;
  }
}
