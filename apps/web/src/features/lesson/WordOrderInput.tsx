import { useEffect, useState } from "react";

// Saisie « remets dans l'ordre » : une banque de mots mélangés, on touche les
// mots pour construire la phrase (et on retouche un mot placé pour le retirer).
// Le parent doit rendre ce composant avec key={exercise.id} pour repartir à
// zéro à chaque exercice ; vider `value` (retry) réinitialise aussi les choix.
export default function WordOrderInput({
  words,
  value,
  onChange,
}: {
  words: string[];
  value: string;
  onChange: (sentence: string) => void;
}) {
  const [picked, setPicked] = useState<number[]>([]);

  // Le parent a vidé la réponse (réessayer / question suivante) → on repart.
  useEffect(() => {
    if (value === "" && picked.length > 0) setPicked([]);
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  const emit = (p: number[]) => {
    setPicked(p);
    onChange(p.map((i) => words[i]).join(" "));
  };

  return (
    <div className="wo-zone">
      <div className={`wo-built ${picked.length === 0 ? "empty" : ""}`}>
        {picked.length === 0 && <span className="muted">Touche les mots pour construire la phrase…</span>}
        {picked.map((wordIdx, pos) => (
          <button
            key={`${wordIdx}-${pos}`}
            className="wo-chip placed"
            onClick={() => emit(picked.filter((_, k) => k !== pos))}
            title="Retirer ce mot"
          >
            {words[wordIdx]}
          </button>
        ))}
      </div>
      <div className="wo-bank">
        {words.map((w, i) => (
          <button
            key={i}
            className="wo-chip"
            disabled={picked.includes(i)}
            onClick={() => emit([...picked, i])}
          >
            {w}
          </button>
        ))}
      </div>
    </div>
  );
}
