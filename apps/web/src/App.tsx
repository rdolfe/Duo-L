import { useEffect, useState } from "react";
import { api, getToken, setToken, UserStats, CompleteResult } from "./lib/api";
import AuthPage from "./features/auth/AuthPage";
import Dashboard from "./features/dashboard/Dashboard";
import LessonPlayer from "./features/lesson/LessonPlayer";
import LessonComplete from "./features/lesson/LessonComplete";

type View =
  | { name: "loading" }
  | { name: "auth" }
  | { name: "dashboard" }
  | { name: "lesson"; lessonId: string }
  | { name: "complete"; result: CompleteResult };

export default function App() {
  const [view, setView] = useState<View>({ name: "loading" });
  const [stats, setStats] = useState<UserStats | null>(null);

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

  switch (view.name) {
    case "loading":
      return <div className="page-center">Chargement…</div>;
    case "auth":
      return <AuthPage onAuth={handleAuth} />;
    case "dashboard":
      return (
        <Dashboard
          stats={stats!}
          onLogout={logout}
          onStartLesson={(lessonId) => setView({ name: "lesson", lessonId })}
        />
      );
    case "lesson":
      return (
        <LessonPlayer
          lessonId={view.lessonId}
          hearts={stats?.hearts ?? 5}
          onQuit={async () => {
            setStats(await api.me());
            setView({ name: "dashboard" });
          }}
          onComplete={(result) => {
            setStats(result.stats);
            setView({ name: "complete", result });
          }}
        />
      );
    case "complete":
      return <LessonComplete result={view.result} onContinue={() => setView({ name: "dashboard" })} />;
  }
}
