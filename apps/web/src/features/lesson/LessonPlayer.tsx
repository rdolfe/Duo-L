import { useEffect, useRef, useState } from "react";
import { api, AttemptResult, CompleteResult, ExerciseDto, ExerciseType, LessonDto } from "../../lib/api";
import { speak, speechRecognitionSupported, startRecognition, RecognitionHandle } from "../../lib/speech";

const TYPE_TITLES: Record<ExerciseType, string> = {
  LISTEN_REPEAT: "Écoute puis répète",
  TRANSLATE_SPEAK: "Traduis à voix haute",
  ROLEPLAY: "Réponds au dialogue",
  READ_ALOUD: "Lis à voix haute",
  MULTIPLE_CHOICE: "Choisis la bonne réponse",
  FILL_BLANK: "Complète la phrase",
  WRITE_TRANSLATION: "Traduis par écrit",
  LISTEN_TYPE: "Dictée",
};

const TYPE_HINTS: Record<ExerciseType, string> = {
  LISTEN_REPEAT: "Appuie sur 🔊 pour écouter, puis répète la phrase en anglais.",
  TRANSLATE_SPEAK: "Dis la traduction anglaise de cette phrase.",
  ROLEPLAY: "Choisis une des réponses et dis-la à voix haute.",
  READ_ALOUD: "Lis le paragraphe entier. Chaque mot compte !",
  MULTIPLE_CHOICE: "Une seule réponse est correcte.",
  FILL_BLANK: "Écris le mot manquant en anglais.",
  WRITE_TRANSLATION: "Écris la traduction anglaise de cette phrase.",
  LISTEN_TYPE: "Écoute 🔊 autant de fois que nécessaire, puis écris ce que tu entends.",
};

const ORAL_TYPES: ExerciseType[] = ["LISTEN_REPEAT", "TRANSLATE_SPEAK", "ROLEPLAY", "READ_ALOUD"];

type Phase = "idle" | "recording" | "scoring" | "result";

export default function LessonPlayer({
  lessonId,
  hearts: initialHearts,
  onQuit,
  onComplete,
}: {
  lessonId: string;
  hearts: number;
  onQuit: () => void;
  onComplete: (result: CompleteResult) => void;
}) {
  const [lesson, setLesson] = useState<LessonDto | null>(null);
  const [idx, setIdx] = useState(0);
  const [phase, setPhase] = useState<Phase>("idle");
  const [transcript, setTranscript] = useState("");
  const [result, setResult] = useState<AttemptResult | null>(null);
  const [hearts, setHearts] = useState(initialHearts);
  const [error, setError] = useState("");
  const [keyboardMode, setKeyboardMode] = useState(!speechRecognitionSupported());
  const [typed, setTyped] = useState("");
  const [revealed, setRevealed] = useState<string | null>(null);
  const [outOfHearts, setOutOfHearts] = useState(false);
  const recRef = useRef<RecognitionHandle | null>(null);

  useEffect(() => {
    api.lesson(lessonId).then(setLesson).catch((e) => setError(e.message));
    return () => recRef.current?.stop();
  }, [lessonId]);

  if (error && !lesson) {
    return (
      <div className="page-center">
        <div className="panel">
          <p className="error">{error}</p>
          <button className="btn btn-primary" onClick={onQuit}>Retour</button>
        </div>
      </div>
    );
  }
  if (!lesson) return <div className="page-center">Chargement de la leçon…</div>;

  const exercise = lesson.exercises[idx];
  const isOral = ORAL_TYPES.includes(exercise.type);
  const isChoice = exercise.type === "MULTIPLE_CHOICE";
  const progress = (idx / lesson.exercises.length) * 100;

  const startRecording = () => {
    setError("");
    setTranscript("");
    setPhase("recording");
    recRef.current = startRecognition({
      onInterim: (t) => setTranscript(t),
      onFinal: (t) => {
        recRef.current = null;
        if (t) submitTranscript(t);
        else {
          setPhase("idle");
          setError("Je n'ai rien entendu. Réessaie !");
        }
      },
      onError: (msg) => {
        recRef.current = null;
        setPhase("idle");
        setError(msg);
      },
    });
    if (!recRef.current) setPhase("idle");
  };

  const stopRecording = () => {
    recRef.current?.stop();
  };

  const submitTranscript = async (text: string) => {
    setPhase("scoring");
    setTranscript(text);
    setError("");
    try {
      const r = await api.attempt(exercise.id, text);
      setResult(r);
      setHearts(r.hearts);
      setPhase("result");
      if (!r.passed && r.hearts <= 0) setOutOfHearts(true);
    } catch (e: any) {
      setPhase("idle");
      if (e.status === 403) setOutOfHearts(true);
      else setError(e.message);
    }
  };

  const revealSolution = async () => {
    setError("");
    try {
      const r = await api.reveal(exercise.id);
      setRevealed(r.answer);
      setHearts(r.hearts);
    } catch (e: any) {
      if (e.status === 403) setOutOfHearts(true);
      else setError(e.message);
    }
  };

  const next = async () => {
    setResult(null);
    setTranscript("");
    setTyped("");
    setError("");
    setRevealed(null);
    if (idx + 1 < lesson.exercises.length) {
      setIdx(idx + 1);
      setPhase("idle");
    } else {
      setPhase("scoring");
      try {
        const done = await api.completeLesson(lesson.id);
        onComplete(done);
      } catch (e: any) {
        setPhase("idle");
        setError(e.message);
      }
    }
  };

  const retry = () => {
    setResult(null);
    setTranscript("");
    setTyped("");
    setPhase("idle");
  };

  if (outOfHearts) {
    return (
      <div className="page-center">
        <div className="panel out-of-hearts">
          <div className="big-emoji">💔</div>
          <h2>Plus de vies !</h2>
          <p>Tes cœurs se régénèrent avec le temps (1 toutes les 2 heures). Reviens un peu plus tard.</p>
          <button className="btn btn-primary" onClick={onQuit}>Retour au tableau de bord</button>
        </div>
      </div>
    );
  }

  return (
    <div className="shell lesson-shell">
      <header className="lesson-top">
        <button className="btn btn-ghost" onClick={onQuit} title="Quitter la leçon">✕</button>
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${progress}%` }} />
        </div>
        <span className="stat">❤️ {hearts}</span>
      </header>

      <main className="lesson-body">
        <p className="exercise-kind">{TYPE_TITLES[exercise.type]}</p>
        <p className="exercise-hint">{TYPE_HINTS[exercise.type]}</p>

        <ExercisePrompt exercise={exercise} />

        {revealed && phase !== "result" && (
          <div className="reveal-box">
            💡 Réponse : <strong>{revealed}</strong>
            {isOral ? " — à toi de la prononcer !" : " — recopie-la pour continuer."}
          </div>
        )}

        {phase !== "result" && (
          <div className="answer-zone">
            {isChoice ? (
              <div className="options">
                {exercise.content.options!.map((opt, i) => (
                  <button
                    key={i}
                    className="option-btn"
                    disabled={phase === "scoring"}
                    onClick={() => submitTranscript(opt)}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            ) : isOral && !keyboardMode ? (
              <>
                {phase === "recording" ? (
                  <button className="mic recording" onClick={stopRecording}>
                    ⏹ J'ai fini de parler
                  </button>
                ) : (
                  <button className="mic" onClick={startRecording} disabled={phase === "scoring"}>
                    🎤 {phase === "scoring" ? "Évaluation…" : "Appuie et parle"}
                  </button>
                )}
                {transcript && phase === "recording" && <p className="live-transcript">« {transcript} »</p>}
                <button className="link" onClick={() => setKeyboardMode(true)}>
                  Problème de micro ? Écrire la réponse
                </button>
              </>
            ) : (
              <div className="keyboard-zone">
                <textarea
                  placeholder={
                    exercise.type === "FILL_BLANK"
                      ? "Écris le mot manquant…"
                      : exercise.type === "LISTEN_TYPE"
                        ? "Écris ce que tu entends…"
                        : "Écris ta réponse en anglais…"
                  }
                  value={typed}
                  onChange={(e) => setTyped(e.target.value)}
                  rows={2}
                />
                <button
                  className="btn btn-primary"
                  disabled={!typed.trim() || phase === "scoring"}
                  onClick={() => submitTranscript(typed)}
                >
                  Valider
                </button>
                {isOral && speechRecognitionSupported() && (
                  <button className="link" onClick={() => setKeyboardMode(false)}>
                    Revenir au micro
                  </button>
                )}
              </div>
            )}

            {!revealed && phase !== "scoring" && (
              <button className="link reveal-link" onClick={revealSolution}>
                💡 Je ne sais pas — voir la réponse (−1 ❤️)
              </button>
            )}
            {error && <div className="error">{error}</div>}
          </div>
        )}

        {phase === "result" && result && (
          <div className={result.passed ? "result-panel pass" : "result-panel fail"}>
            <div className="result-head">
              <span className="result-emoji">{result.passed ? (result.score >= 90 ? "🌟" : "✅") : "❌"}</span>
              <div>
                <h3>
                  {result.passed
                    ? result.score >= 90
                      ? "Excellent !"
                      : "Bien joué !"
                    : "Presque ! Réessaie."}
                </h3>
                {isChoice ? (
                  <p>{result.passed ? "C'est la bonne réponse." : "Ce n'était pas la bonne réponse."}</p>
                ) : (
                  <p>Score : <strong>{result.score}%</strong> (minimum : {exercise.minScore}%)</p>
                )}
              </div>
            </div>

            {!isChoice && <p className="muted">Ce que j'ai {isOral ? "entendu" : "lu"} : « {transcript} »</p>}
            {!result.passed && <p className="muted">Réponse attendue : « {result.expected} »</p>}

            {(exercise.type === "READ_ALOUD" || exercise.type === "LISTEN_TYPE") && result.wordScores.length > 0 && (
              <div className="word-chips">
                {result.wordScores.map((w, i) => (
                  <span
                    key={i}
                    className={w.score >= 80 ? "chip good" : w.score >= 50 ? "chip ok" : "chip bad"}
                    title={`${w.score}%`}
                  >
                    {w.word}
                  </span>
                ))}
              </div>
            )}

            <div className="result-actions">
              {result.passed ? (
                <button className="btn btn-primary" onClick={next}>
                  {idx + 1 < lesson.exercises.length ? "Continuer →" : "Terminer la leçon 🏁"}
                </button>
              ) : (
                <button className="btn btn-warning" onClick={retry}>Réessayer (−1 ❤️ déjà compté)</button>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function ExercisePrompt({ exercise }: { exercise: ExerciseDto }) {
  const c = exercise.content;
  switch (exercise.type) {
    case "LISTEN_REPEAT":
      return (
        <div className="prompt-card">
          <button className="btn btn-speaker" onClick={() => speak(c.textEn!)}>🔊 Écouter</button>
          <p className="prompt-main">{c.textEn}</p>
          {c.hintFr && <p className="muted">{c.hintFr}</p>}
        </div>
      );
    case "TRANSLATE_SPEAK":
      return (
        <div className="prompt-card">
          <p className="prompt-main">🇫🇷 « {c.textFr} »</p>
          <p className="muted">→ Dis-le en anglais 🇬🇧</p>
        </div>
      );
    case "WRITE_TRANSLATION":
      return (
        <div className="prompt-card">
          <p className="prompt-main">🇫🇷 « {c.textFr} »</p>
          <p className="muted">→ Écris-le en anglais 🇬🇧</p>
        </div>
      );
    case "ROLEPLAY":
      return (
        <div className="prompt-card">
          <p className="muted">{c.contextFr}</p>
          <div className="npc-bubble">
            <strong>{c.npcName} :</strong> {c.npcLine}{" "}
            <button className="btn btn-speaker small" onClick={() => speak(c.npcLine!)}>🔊</button>
          </div>
          <div className="choices">
            {c.choices!.map((choice, i) => (
              <div key={i} className="choice">
                💬 {choice} <button className="btn btn-speaker small" onClick={() => speak(choice)}>🔊</button>
              </div>
            ))}
          </div>
        </div>
      );
    case "READ_ALOUD":
      return (
        <div className="prompt-card">
          <p className="prompt-paragraph">{c.paragraphEn}</p>
        </div>
      );
    case "MULTIPLE_CHOICE":
      return (
        <div className="prompt-card">
          <p className="prompt-main">{c.prompt}</p>
          {c.hintFr && <p className="muted">💭 {c.hintFr}</p>}
        </div>
      );
    case "FILL_BLANK":
      return (
        <div className="prompt-card">
          <p className="prompt-main">{c.sentence!.split("___")[0]}<span className="blank">______</span>{c.sentence!.split("___")[1]}</p>
          {c.hintFr && <p className="muted">💭 Indice : {c.hintFr}</p>}
        </div>
      );
    case "LISTEN_TYPE":
      return (
        <div className="prompt-card listen-type">
          <button className="btn btn-speaker big" onClick={() => speak(c.textEn!, 0.85)}>
            🔊 Écouter la phrase
          </button>
          <p className="muted">La phrase reste secrète — fais confiance à tes oreilles !</p>
        </div>
      );
  }
}
