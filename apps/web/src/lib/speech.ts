// Wrappers autour des API vocales natives du navigateur.
// STT : Web Speech API (Chrome/Edge). TTS : SpeechSynthesis (tous navigateurs).

export function speechRecognitionSupported(): boolean {
  return typeof window !== "undefined" && !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
}

export type RecognitionHandle = {
  stop: () => void;
};

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
  rec.continuous = true;
  rec.maxAlternatives = 1;

  let finalText = "";
  let stopped = false;

  rec.onresult = (event: any) => {
    let interim = "";
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const r = event.results[i];
      if (r.isFinal) finalText += r[0].transcript + " ";
      else interim += r[0].transcript;
    }
    callbacks.onInterim?.((finalText + interim).trim());
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
      callbacks.onFinal(finalText.trim());
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
      setTimeout(() => callbacks.onFinal(finalText.trim()), 300);
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
