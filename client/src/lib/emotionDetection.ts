import * as faceapi from '@vladmandic/face-api';
import { type EmotionType } from '@shared/schema';

let modelsLoaded = false;

export async function loadModels(): Promise<void> {
  if (modelsLoaded) return;
  
  try {
    const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model';
    
    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
      faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
    ]);
    
    modelsLoaded = true;
  } catch (error) {
    console.error('Error loading face detection models:', error);
    throw new Error('Failed to load emotion detection models');
  }
}

export async function detectEmotion(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement
): Promise<{ emotion: EmotionType; confidence: number } | null> {
  try {
    if (!modelsLoaded) {
      await loadModels();
    }

    const detections = await faceapi
      .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
      .withFaceExpressions();

    if (!detections) {
      return null;
    }

    const expressions = detections.expressions;
    const emotionMap: Record<string, EmotionType> = {
      'happy': 'happy',
      'sad': 'sad',
      'angry': 'angry',
      'fearful': 'fearful',
      'disgusted': 'disgusted',
      'surprised': 'surprised',
      'neutral': 'neutral',
    };

    let maxEmotion = 'neutral';
    let maxConfidence = 0;

    Object.entries(expressions).forEach(([emotion, confidence]) => {
      if (confidence > maxConfidence) {
        maxConfidence = confidence;
        maxEmotion = emotion;
      }
    });

    const displaySize = {
      width: video.videoWidth,
      height: video.videoHeight
    };
    
    faceapi.matchDimensions(canvas, displaySize);
    
    const resizedDetections = faceapi.resizeResults(detections, displaySize);
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      faceapi.draw.drawDetections(canvas, resizedDetections);
    }

    return {
      emotion: emotionMap[maxEmotion] || 'neutral',
      confidence: maxConfidence,
    };
  } catch (error) {
    console.error('Error detecting emotion:', error);
    return null;
  }
}
