import Sentiment from 'sentiment';
import { mean, median, standardDeviation } from 'simple-statistics';
import type { EmotionRecord, Message } from '@shared/schema';

const sentiment = new Sentiment();

export interface AnalyticsData {
  totalSessions: number;
  averageMood: number;
  moodTrend: 'improving' | 'declining' | 'stable';
  dominantEmotions: { emotion: string; count: number }[];
  sentimentAnalysis: {
    averageSentiment: number;
    positiveMessages: number;
    negativeMessages: number;
  };
  weeklyTrend: { day: string; mood: number }[];
  predictedMood: string;
  insights: string[];
  riskFactors: string[];
}

// Risk keywords for crisis detection
const RISK_KEYWORDS = [
  'hurt', 'harm', 'suicide', 'kill', 'death', 'hopeless', 'worthless',
  'give up', 'end it', 'no point', "can't take", 'unbearable',
  'desperate', 'hopeless', 'useless', 'fail', 'failure'
];

export function detectRisk(text: string): { isRisky: boolean; keywords: string[] } {
  const lowerText = text.toLowerCase();
  const foundKeywords = RISK_KEYWORDS.filter(keyword => 
    lowerText.includes(keyword)
  );
  
  return {
    isRisky: foundKeywords.length > 0,
    keywords: foundKeywords
  };
}

export function analyzeSentiment(text: string): number {
  const result = sentiment.analyze(text);
  return result.score; // Range: -5 to 5
}

export function generateSessionSummary(
  messages: Message[],
  emotions: EmotionRecord[]
): string {
  if (messages.length === 0) {
    return "No messages in this session.";
  }

  // Analyze emotional tone from messages
  const sentiments = messages
    .filter(m => m.role === 'user')
    .map(m => analyzeSentiment(m.content));
  
  const avgSentiment = sentiments.length > 0 ? mean(sentiments) : 0;
  
  // Get dominant emotion
  const emotionCounts: Record<string, number> = {};
  emotions.forEach(e => {
    emotionCounts[e.emotion] = (emotionCounts[e.emotion] || 0) + 1;
  });
  
  const dominantEmotion = Object.entries(emotionCounts).sort(
    (a, b) => b[1] - a[1]
  )[0]?.[0] || 'neutral';

  // Generate summary
  let summary = `Today's session summary:\n\n`;
  
  if (avgSentiment > 1) {
    summary += `✨ Overall positive conversation. You expressed optimism and hope.`;
  } else if (avgSentiment < -1) {
    summary += `💙 You shared challenging feelings. Remember, seeking support is strength.`;
  } else {
    summary += `🧘 Balanced conversation. You explored your emotions thoughtfully.`;
  }
  
  summary += `\n\nDominant emotion: ${dominantEmotion}\n`;
  summary += `Message count: ${messages.length}\n`;
  summary += `Session duration: ${Math.round((new Date().getTime() - new Date(messages[0].timestamp).getTime()) / 1000 / 60)} minutes\n`;
  
  summary += `\n📌 Recommendation:\n`;
  if (dominantEmotion === 'sad' || dominantEmotion === 'angry') {
    summary += `Consider deep breathing exercises or journaling today.`;
  } else if (dominantEmotion === 'fearful') {
    summary += `Grounding techniques might help. Try the 5-4-3-2-1 method.`;
  } else {
    summary += `Great progress! Continue with self-care practices.`;
  }
  
  return summary;
}

export function predictNextMood(emotions: EmotionRecord[]): string {
  if (emotions.length === 0) return 'unknown';
  
  // Simple prediction: if last 3 emotions trend negative, predict negative
  const recent = emotions.slice(-3);
  const emotionValues: Record<string, number> = {
    happy: 3,
    neutral: 2,
    sad: 1,
    angry: 0,
    fearful: 0,
    disgusted: 0,
    surprised: 2
  };
  
  const recentScore = recent.reduce((sum, e) => 
    sum + (emotionValues[e.emotion] || 2), 0) / recent.length;
  
  if (recentScore >= 2.5) return 'happy';
  if (recentScore >= 1.5) return 'neutral';
  return 'sad';
}

export function generateInsights(emotions: EmotionRecord[]): string[] {
  const insights: string[] = [];
  
  if (emotions.length < 3) {
    insights.push('Keep tracking emotions to see patterns.');
    return insights;
  }

  // Count emotions
  const emotionCounts: Record<string, number> = {};
  emotions.forEach(e => {
    emotionCounts[e.emotion] = (emotionCounts[e.emotion] || 0) + 1;
  });

  // Generate insights
  const sorted = Object.entries(emotionCounts).sort((a, b) => b[1] - a[1]);
  
  insights.push(`You've felt ${sorted[0][0]} the most (${sorted[0][1]} times).`);
  
  if (emotionCounts.sad && emotionCounts.sad > emotions.length * 0.3) {
    insights.push('Sadness appears frequently. Consider coping strategies or talking to someone.');
  }
  
  if (emotionCounts.angry && emotionCounts.angry > emotions.length * 0.3) {
    insights.push('You seem to experience anger often. Relaxation techniques might help.');
  }
  
  // Trend analysis
  const recent = emotions.slice(-5);
  const older = emotions.slice(Math.max(0, emotions.length - 10), emotions.length - 5);
  
  if (recent.length > 0 && older.length > 0) {
    const recentPositive = recent.filter(e => 
      ['happy', 'surprised'].includes(e.emotion)
    ).length;
    const olderPositive = older.filter(e => 
      ['happy', 'surprised'].includes(e.emotion)
    ).length;
    
    if (recentPositive > olderPositive) {
      insights.push('✨ Your mood is trending positively! Keep it up.');
    } else if (recentPositive < olderPositive) {
      insights.push('Your mood seems to be declining. Reach out for support if needed.');
    }
  }
  
  return insights;
}

export function generateAnalyticsData(
  emotions: EmotionRecord[],
  messages: Message[]
): AnalyticsData {
  const emotionValues: Record<string, number> = {
    happy: 4,
    neutral: 3,
    sad: 1,
    angry: 1,
    fearful: 1,
    disgusted: 1,
    surprised: 3
  };
  
  // Calculate average mood
  const moodScores = emotions.map(e => emotionValues[e.emotion] || 2);
  const avgMood = moodScores.length > 0 ? mean(moodScores) : 2.5;
  
  // Calculate trend
  let moodTrend: 'improving' | 'declining' | 'stable' = 'stable';
  if (moodScores.length >= 5) {
    const recent = moodScores.slice(-3);
    const older = moodScores.slice(-6, -3);
    const recentAvg = mean(recent);
    const olderAvg = mean(older);
    
    if (recentAvg > olderAvg + 0.5) moodTrend = 'improving';
    else if (recentAvg < olderAvg - 0.5) moodTrend = 'declining';
  }
  
  // Emotion distribution
  const emotionCounts: Record<string, number> = {};
  emotions.forEach(e => {
    emotionCounts[e.emotion] = (emotionCounts[e.emotion] || 0) + 1;
  });
  
  const dominantEmotions = Object.entries(emotionCounts)
    .map(([emotion, count]) => ({ emotion, count }))
    .sort((a, b) => b.count - a.count);
  
  // Sentiment analysis
  const sentiments = messages
    .filter(m => m.role === 'user')
    .map(m => analyzeSentiment(m.content));
  
  const avgSentiment = sentiments.length > 0 ? mean(sentiments) : 0;
  const positiveMessages = sentiments.filter(s => s > 0).length;
  const negativeMessages = sentiments.filter(s => s < 0).length;
  
  // Weekly trend (simplified)
  const weeklyTrend = Array.from({ length: 7 }, (_, i) => ({
    day: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i],
    mood: 2 + Math.random() * 2 // Placeholder
  }));
  
  // Predictions and insights
  const predictedMood = predictNextMood(emotions);
  const insights = generateInsights(emotions);
  
  // Risk factors
  const riskFactors: string[] = [];
  messages.forEach(m => {
    const risk = detectRisk(m.content);
    if (risk.isRisky) {
      riskFactors.push(`Detected: ${risk.keywords.join(', ')}`);
    }
  });
  
  return {
    totalSessions: 1,
    averageMood: avgMood,
    moodTrend,
    dominantEmotions,
    sentimentAnalysis: {
      averageSentiment: avgSentiment,
      positiveMessages,
      negativeMessages
    },
    weeklyTrend,
    predictedMood,
    insights,
    riskFactors
  };
}
