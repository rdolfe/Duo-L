import { FormEvent, useState } from "react";
import { api, UserStats } from "../../lib/api";

export default function AuthPage({ onAuth }: { onAuth: (token: string, user: UserStats) => void }) {
  const [mode, setMode] = useState<"login" | "register">("register");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const res =
        mode === "register"
          ? await api.register(email, password, displayName)
          : await api.login(email, password);
      onAuth(res.token, res.user);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page-center">
      <div className="auth-card">
        <div className="logo">
          🦜 <span>DuoSpeak</span>
        </div>
        <p className="tagline">Apprends l'anglais en le parlant, pas en le tapant.</p>

        <div className="tabs">
          <button className={mode === "register" ? "tab active" : "tab"} onClick={() => setMode("register")}>
            Créer un compte
          </button>
          <button className={mode === "login" ? "tab active" : "tab"} onClick={() => setMode("login")}>
            Se connecter
          </button>
        </div>

        <form onSubmit={submit}>
          {mode === "register" && (
            <input
              placeholder="Pseudo"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
            />
          )}
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Mot de passe (6 caractères min.)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {error && <div className="error">{error}</div>}
          <button className="btn btn-primary btn-block" disabled={busy}>
            {busy ? "…" : mode === "register" ? "C'est parti !" : "Connexion"}
          </button>
        </form>
      </div>
    </div>
  );
}
