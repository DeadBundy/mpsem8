let activeAudio: HTMLAudioElement | null = null;

function getAuthHeaders() {
  const token = localStorage.getItem("authToken");
  const headers: Record<string, string> = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

export function stopElevenLabsPlayback() {
  if (activeAudio) {
    activeAudio.pause();
    activeAudio.currentTime = 0;
    activeAudio = null;
  }
}

export async function speakWithElevenLabs(
  text: string,
  callbacks?: {
    onStart?: () => void;
    onEnd?: () => void;
    onError?: () => void;
  },
) {
  stopElevenLabsPlayback();

  try {
    const response = await fetch("/api/voice/synthesize", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
      },
      body: JSON.stringify({ text }),
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error("Failed to synthesize audio");
    }

    const blob = await response.blob();
    const audioUrl = URL.createObjectURL(blob);
    const audio = new Audio(audioUrl);
    activeAudio = audio;

    audio.onplay = () => callbacks?.onStart?.();
    audio.onended = () => {
      URL.revokeObjectURL(audioUrl);
      if (activeAudio === audio) {
        activeAudio = null;
      }
      callbacks?.onEnd?.();
    };
    audio.onerror = () => {
      URL.revokeObjectURL(audioUrl);
      if (activeAudio === audio) {
        activeAudio = null;
      }
      callbacks?.onError?.();
    };

    await audio.play();
  } catch (error) {
    callbacks?.onError?.();
    throw error;
  }
}
