let activeUtterance: SpeechSynthesisUtterance | null = null;

function pickVoice(lang?: string) {
  const voices = window.speechSynthesis.getVoices();

  if (lang) {
    const localePrefix = lang.toLowerCase().split("-")[0];
    const localizedVoice = voices.find((voice) => voice.lang.toLowerCase().startsWith(localePrefix));
    if (localizedVoice) {
      return localizedVoice;
    }
  }

  return (
    voices.find((voice) =>
      ["female", "woman", "calm", "soft"].some((keyword) =>
        voice.name.toLowerCase().includes(keyword),
      ),
    ) || voices[0]
  );
}

export function stopSpeechPlayback() {
  if (!("speechSynthesis" in window)) {
    return;
  }

  window.speechSynthesis.cancel();
  activeUtterance = null;
}

export async function speakText(
  text: string,
  options?: {
    lang?: string;
  },
  callbacks?: {
    onStart?: () => void;
    onEnd?: () => void;
    onError?: () => void;
  },
) {
  if (!("speechSynthesis" in window)) {
    callbacks?.onError?.();
    throw new Error("Speech synthesis is not supported in this browser");
  }

  stopSpeechPlayback();

  const utterance = new SpeechSynthesisUtterance(text);
  activeUtterance = utterance;
  utterance.rate = 0.9;
  utterance.pitch = 1;
  utterance.volume = 0.85;
  if (options?.lang) {
    utterance.lang = options.lang;
  }

  const selectedVoice = pickVoice(options?.lang);
  if (selectedVoice) {
    utterance.voice = selectedVoice;
  }

  utterance.onstart = () => callbacks?.onStart?.();
  utterance.onend = () => {
    if (activeUtterance === utterance) {
      activeUtterance = null;
    }
    callbacks?.onEnd?.();
  };
  utterance.onerror = () => {
    if (activeUtterance === utterance) {
      activeUtterance = null;
    }
    callbacks?.onError?.();
  };

  window.speechSynthesis.speak(utterance);
}
