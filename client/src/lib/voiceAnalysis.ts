/**
 * Voice emotion analysis utilities
 * Analyzes audio input for emotional content using Web Audio API
 */

export interface VoiceEmotionResult {
  emotion: 'happy' | 'sad' | 'angry' | 'fearful' | 'neutral';
  confidence: number;
  features: {
    pitch: number;
    volume: number;
    speed: number;
    tone: number;
  };
}

/**
 * Analyze voice emotion from audio blob
 * This is a simplified implementation - in production, you'd use a proper ML model
 */
export async function analyzeVoiceEmotion(audioBlob: Blob): Promise<VoiceEmotionResult> {
  return new Promise((resolve) => {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const arrayBuffer = e.target?.result as ArrayBuffer;
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

        // Extract basic audio features
        const channelData = audioBuffer.getChannelData(0);
        const sampleRate = audioBuffer.sampleRate;

        // Calculate volume (RMS)
        let sum = 0;
        for (let i = 0; i < channelData.length; i++) {
          sum += channelData[i] * channelData[i];
        }
        const volume = Math.sqrt(sum / channelData.length);

        // Calculate pitch (simplified autocorrelation)
        const pitch = calculatePitch(channelData, sampleRate);

        // Calculate speaking speed (duration vs content)
        const duration = audioBuffer.duration;
        const speed = duration > 0 ? 1 / duration : 1; // words per second estimate

        // Calculate tone stability (variance in amplitude)
        const tone = calculateToneStability(channelData);

        // Simple emotion classification based on features
        const emotion = classifyEmotion(volume, pitch, speed, tone);

        resolve({
          emotion,
          confidence: 0.7, // Placeholder confidence
          features: {
            pitch,
            volume,
            speed,
            tone,
          },
        });
      } catch (error) {
        console.error('Voice analysis error:', error);
        resolve({
          emotion: 'neutral',
          confidence: 0.5,
          features: {
            pitch: 0,
            volume: 0,
            speed: 0,
            tone: 0,
          },
        });
      }
    };

    reader.readAsArrayBuffer(audioBlob);
  });
}

/**
 * Calculate pitch using autocorrelation
 */
function calculatePitch(channelData: Float32Array, sampleRate: number): number {
  const bufferSize = Math.min(channelData.length, sampleRate / 2);
  const correlations = new Array(bufferSize).fill(0);

  for (let lag = 0; lag < bufferSize; lag++) {
    let correlation = 0;
    for (let i = 0; i < bufferSize; i++) {
      correlation += channelData[i] * (channelData[i + lag] || 0);
    }
    correlations[lag] = correlation;
  }

  // Find peak in autocorrelation
  let maxCorrelation = 0;
  let bestLag = 0;
  for (let lag = 20; lag < bufferSize; lag++) { // Skip low lags
    if (correlations[lag] > maxCorrelation) {
      maxCorrelation = correlations[lag];
      bestLag = lag;
    }
  }

  return bestLag > 0 ? sampleRate / bestLag : 200; // Default pitch
}

/**
 * Calculate tone stability (lower variance = more stable tone)
 */
function calculateToneStability(channelData: Float32Array): number {
  const chunkSize = Math.floor(channelData.length / 10);
  const variances: number[] = [];

  for (let i = 0; i < 10; i++) {
    const chunk = channelData.slice(i * chunkSize, (i + 1) * chunkSize);
    const mean = chunk.reduce((a, b) => a + b, 0) / chunk.length;
    const variance = chunk.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / chunk.length;
    variances.push(variance);
  }

  const avgVariance = variances.reduce((a, b) => a + b, 0) / variances.length;
  return Math.max(0, 1 - avgVariance * 100); // Normalize to 0-1
}

/**
 * Classify emotion based on audio features
 * This is a simplified rule-based classifier
 */
function classifyEmotion(volume: number, pitch: number, speed: number, tone: number): VoiceEmotionResult['emotion'] {
  // Normalize features
  const normVolume = Math.min(volume * 10, 1);
  const normPitch = Math.min(pitch / 400, 1); // 400Hz as reference
  const normSpeed = Math.min(speed / 2, 1); // 2 words/sec as reference

  // Emotion classification rules
  if (normVolume > 0.8 && normPitch > 0.7 && tone > 0.6) {
    return 'angry'; // Loud, high pitch, unstable tone
  } else if (normVolume < 0.3 && normPitch < 0.4 && tone < 0.4) {
    return 'sad'; // Quiet, low pitch, stable but low tone
  } else if (normVolume > 0.7 && normPitch > 0.6 && tone > 0.7) {
    return 'happy'; // Loud, high pitch, stable high tone
  } else if (normVolume < 0.4 && normPitch > 0.8 && tone < 0.5) {
    return 'fearful'; // Quiet, very high pitch, unstable tone
  } else {
    return 'neutral'; // Default
  }
}

/**
 * Record audio from microphone
 */
export function recordAudio(duration: number = 3000): Promise<Blob> {
  return new Promise((resolve, reject) => {
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(stream => {
        const mediaRecorder = new MediaRecorder(stream);
        const chunks: Blob[] = [];

        mediaRecorder.ondataavailable = (event) => {
          chunks.push(event.data);
        };

        mediaRecorder.onstop = () => {
          const blob = new Blob(chunks, { type: 'audio/wav' });
          stream.getTracks().forEach(track => track.stop());
          resolve(blob);
        };

        mediaRecorder.onerror = (error) => {
          stream.getTracks().forEach(track => track.stop());
          reject(error);
        };

        mediaRecorder.start();
        setTimeout(() => {
          mediaRecorder.stop();
        }, duration);
      })
      .catch(reject);
  });
}