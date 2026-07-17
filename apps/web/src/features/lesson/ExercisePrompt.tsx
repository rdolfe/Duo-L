import { ExerciseDto } from "../../lib/api";
import { speak } from "../../lib/speech";

// Affiche l'énoncé d'un exercice (identique en leçon et en examen).
export default function ExercisePrompt({ exercise }: { exercise: ExerciseDto }) {
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
          <p className="prompt-main">
            {c.sentence!.split("___")[0]}
            <span className="blank">______</span>
            {c.sentence!.split("___")[1]}
          </p>
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
