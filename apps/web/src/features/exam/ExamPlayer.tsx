import { useEffect, useRef, useState } from "react";
import { api, ExamDto, ExamSubmitResult, ExerciseType } from "../../lib/api";
import { speechRecognitionSupported, startRecognition, RecognitionHandle } from "../../lib/speech";
import ExercisePrompt from "../lesson/ExercisePrompt";

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

const ORAL_TYPES: ExerciseType[] = ["LISTEN_REPEAT", "TRANSLATE_SPEAK", "ROLEPLAY", "READ_ALOUD"];
type RecPhase = "idle" | "recording" | "review";

export default function ExamPlayer({
  examId,
  onQuit,
  onFinished,
}: {
  examId: string;
  onQuit: () => void;
  onFinished: (result: ExamSubmitResult) => void;
}) {
  const [exam, setExam] = useState<ExamDto | null>(null);
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // État de capture pour la question courante.
  const [recPhase, setRecPhase] = useState<RecPhase>("idle");
  const [transcript, setTranscript] = useState("");
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [typed, setTyped] = useState("");
  const [keyboardMode, setKeyboardMode] = useState(!speechRecognitionSupported());
  const recRef = useRef<RecognitionHandle | null>(null);

  useEffect(() => {
    api.exam(examId).then(setExam).catch((e) => setError(e.message));
    return () => recRef.current?.stop();
  }, [examId]);

  if (error && !exam) {
    return (
      <div className="page-center">
        <div className="panel">
          <p className="error">{error}</p>
          <button className="btn btn-primary" onClick={onQuit}>Retour</button>
        </div>
      </div>
    );
  }
  if (!exam) return <div className="page-center">Préparation du test…</div>;

  const exercise = exam.exercises[idx];
  const isOral = ORAL_TYPES.includes(exercise.type);
  const isChoice = exercise.type === "MULTIPLE_CHOICE";
  const isLast = idx + 1 >= exam.exercises.length;
  const progress = (idx / exam.exercises.length) * 100;

  // Réponse actuellement saisie pour cette question.
  const currentAnswer = isChoice ? selectedOption ?? "" : isOral && !keyboardMode ? transcript : typed;
  const hasAnswer = currentAnswer.trim().length > 0;

  const startRecording = () => {
    setError("");
    setTranscript("");
    setRecPhase("recording");
    recRef.current = startRecognition({
      onInterim: (t) => setTranscript(t),
      onFinal: (t) => {
        recRef.current = null;
        if (t) {
          setTranscript(t);
          setRecPhase("review");
        } else {
          setRecPhase("idle");
          setError("Je n'ai rien entendu. Réessaie !");
        }
      },
      onError: (msg) => {
        recRef.current = null;
        setRecPhase("idle");
        setError(msg);
      },
    });
    if (!recRef.current) setRecPhase("idle");
  };

  const stopRecording = () => recRef.current?.stop();

  const resetCapture = () => {
    setTranscript("");
    setSelectedOption(null);
    setTyped("");
    setRecPhase("idle");
    setError("");
  };

  const goNext = (answer: string) => {
    const nextAnswers = { ...answers, [exercise.id]: answer };
    setAnswers(nextAnswers);
    if (isLast) {
      submitAll(nextAnswers);
    } else {
      setIdx(idx + 1);
      resetCapture();
    }
  };

  const submitAll = async (finalAnswers: Record<string, string>) => {
    setSubmitting(true);
    setError("");
    try {
      const payload = exam.exercises.map((ex) => ({
        exerciseId: ex.id,
        transcript: finalAnswers[ex.id] ?? "",
      }));
      const res = await api.submitExam(exam.id, payload);
      onFinished(res);
    } catch (e: any) {
      setSubmitting(false);
      setError(e.message);
    }
  };

  if (submitting) {
    return <div className="page-center">Correction du test en cours…</div>;
  }

  return (
    <div className="shell lesson-shell">
      <header className="lesson-top">
        <button className="btn btn-ghost" onClick={onQuit} title="Quitter le test">✕</button>
        <div className="progress-track exam-track">
          <div className="progress-fill" style={{ width: `${progress}%` }} />
        </div>
        <span className="stat" title="Question">📝 {idx + 1}/{exam.exercises.length}</span>
      </header>

      <main className="lesson-body">
        <div className="exam-banner">🎓 {exam.title} — noté sur 20</div>
        <p className="exercise-kind">{TYPE_LABELS[exercise.type]}</p>
        <p className="exercise-hint">
          C'est un test : réponds du mieux possible, la correction arrive à la fin.
        </p>

        <ExercisePrompt exercise={exercise} />

        <div className="answer-zone">
          {isChoice ? (
            <div className="options">
              {exercise.content.options!.map((opt, i) => (
                <button
                  key={i}
                  className={`option-btn ${selectedOption === opt ? "selected" : ""}`}
                  onClick={() => setSelectedOption(opt)}
                >
                  {opt}
                </button>
              ))}
            </div>
          ) : isOral && !keyboardMode ? (
            <>
              {recPhase === "recording" ? (
                <>
                  <button className="mic recording" onClick={stopRecording}>
                    ⏹ Arrêter l'enregistrement
                  </button>
                  {transcript && <p className="live-transcript">« {transcript} »</p>}
                </>
              ) : recPhase === "review" ? (
                <div className="review-zone">
                  <p className="captured-label">Ta réponse enregistrée :</p>
                  <p className="live-transcript">« {transcript} »</p>
                  <button className="btn btn-ghost" onClick={startRecording}>🔁 Recommencer</button>
                </div>
              ) : (
                <button className="mic" onClick={startRecording}>
                  🎤 Appuie pour enregistrer
                </button>
              )}
              {recPhase !== "review" && (
                <button className="link" onClick={() => setKeyboardMode(true)}>
                  Problème de micro ? Écrire la réponse
                </button>
              )}
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
              {isOral && speechRecognitionSupported() && (
                <button className="link" onClick={() => setKeyboardMode(false)}>
                  Revenir au micro
                </button>
              )}
            </div>
          )}

          <div className="exam-nav">
            <button
              className="btn btn-primary"
              disabled={!hasAnswer}
              onClick={() => goNext(currentAnswer)}
            >
              {isLast ? "Terminer le test 🏁" : "Valider et continuer →"}
            </button>
            <button className="link" onClick={() => goNext("")}>
              Passer cette question
            </button>
          </div>
          {error && <div className="error">{error}</div>}
        </div>
      </main>
    </div>
  );
}
