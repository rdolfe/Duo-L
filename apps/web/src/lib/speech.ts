// Wrappers autour des API vocales natives du navigateur.
// STT : Web Speech API (Chrome/Edge). TTS : SpeechSynthesis (tous navigateurs).

export function speechRecognitionSupported(): boolean {
  return typeof window !== "undefined" && !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
}

export type RecognitionHandle = {
  stop: () => void;
};

// Filet de sécurité contre le bug Android où le moteur duplique la phrase
// entière ("how are you how are you"). Si le texte est exactement deux moitiés
// identiques (jusqu'à 3 répétitions), on n'en garde qu'une.
export function dedupeRepeat(text: string): string {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const n = words.length;
  for (const parts of [2, 3]) {
    if (n >= parts && n % parts === 0) {
      const size = n / parts;
      const segs: string[] = [];
      for (let p = 0; p < parts; p++) {
        segs.push(words.slice(p * size, (p + 1) * size).join(" ").toLowerCase());
      }
      if (segs.every((s) => s === segs[0])) {
        return words.slice(0, size).join(" ");
      }
    }
  }
  return words.join(" ");
}

export function startRecognition(callbacks: {
  onInterim?: (text: string) => void;
  onFinal: (text: string) => void;
  onError: (message: string) => void;
}): RecognitionHandle | null {
  const Ctor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  if (!Ctor) {
    callbacks.onError("La reconnaissance vocale n'est pas disponible dans ce navigateur (utilise Chrome ou Edge).");
    return null;
  }
  const rec = new Ctor();
  rec.lang = "en-US";
  rec.interimResults = true;
  // continuous = false : sur Android Chrome, le mode continu duplique la phrase.
  // Une phrase à la fois est bien plus fiable ; le moteur s'arrête tout seul
  // après un silence, ce qui déclenche onend puis l'envoi.
  rec.continuous = false;
  rec.maxAlternatives = 1;

  let finalText = "";
  let stopped = false;

  rec.onresult = (event: any) => {
    // On reconstruit la phrase entière à partir de TOUS les segments à chaque
    // événement, au lieu d'accumuler. Sur certains Android, le mode continu
    // réémet les segments déjà finalisés : accumuler doublait les mots
    // ("hello hello"). Reconstruire depuis l'index 0 élimine ce doublage.
    let full = "";
    for (let i = 0; i < event.results.length; i++) {
      full += event.results[i][0].transcript + " ";
    }
    finalText = full.trim();
    callbacks.onInterim?.(finalText);
  };
  rec.onerror = (event: any) => {
    if (stopped) return;
    if (event.error === "not-allowed" || event.error === "service-not-allowed") {
      callbacks.onError("Accès au micro refusé. Autorise le micro ou utilise le mode clavier.");
    } else if (event.error === "no-speech") {
      callbacks.onError("Je n'ai rien entendu. Réessaie en parlant plus fort !");
    } else {
      callbacks.onError(`Erreur du micro : ${event.error}`);
    }
  };
  rec.onend = () => {
    if (!stopped) {
      stopped = true;
      callbacks.onFinal(dedupeRepeat(finalText));
    }
  };
  rec.start();

  return {
    stop: () => {
      if (stopped) return;
      stopped = true;
      try {
        rec.stop();
      } catch {}
      // onend ne sera plus traité (stopped=true), on émet le final nous-mêmes
      setTimeout(() => callbacks.onFinal(dedupeRepeat(finalText)), 300);
    },
  };
}

let voicesCache: SpeechSynthesisVoice[] = [];
if (typeof window !== "undefined" && "speechSynthesis" in window) {
  const load = () => {
    voicesCache = window.speechSynthesis.getVoices();
  };
  load();
  window.speechSynthesis.onvoiceschanged = load;
}

export function speak(text: string, rate = 0.95): Promise<void> {
  return new Promise((resolve) => {
    if (!("speechSynthesis" in window)) return resolve();
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-US";
    u.rate = rate;
    const voice =
      voicesCache.find((v) => v.lang === "en-US" && v.localService) ??
      voicesCache.find((v) => v.lang === "en-US") ??
      voicesCache.find((v) => v.lang.startsWith("en"));
    if (voice) u.voice = voice;
    u.onend = () => resolve();
    u.onerror = () => resolve();
    window.speechSynthesis.speak(u);
  });
}
