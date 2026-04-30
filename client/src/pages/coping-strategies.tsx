import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Heart, Brain, Activity, Coffee, Users, BookOpen, Wind, Sparkles } from "lucide-react";
import type { EmotionRecord, EmotionType } from "@shared/schema";
import { subDays } from "date-fns";
import { useAppLanguage } from "@/lib/language";

interface CopingStrategy {
  id: string;
  title: string;
  description: string;
  steps: string[];
  icon: any;
  forEmotions: EmotionType[];
  difficulty: 'easy' | 'medium' | 'advanced';
}

const copingStrategies: CopingStrategy[] = [
  {
    id: 'deep-breathing',
    title: '4-7-8 Breathing Technique',
    description: 'A calming breathing exercise that helps reduce anxiety and promote relaxation',
    steps: [
      'Breathe in through your nose for 4 seconds',
      'Hold your breath for 7 seconds',
      'Exhale slowly through your mouth for 8 seconds',
      'Repeat 3-4 times until you feel calmer',
    ],
    icon: Wind,
    forEmotions: ['angry', 'fearful', 'sad'],
    difficulty: 'easy',
  },
  {
    id: 'grounding',
    title: '5-4-3-2-1 Grounding Exercise',
    description: 'Ground yourself in the present moment using your five senses',
    steps: [
      'Name 5 things you can see around you',
      'Name 4 things you can touch',
      'Name 3 things you can hear',
      'Name 2 things you can smell',
      'Name 1 thing you can taste',
    ],
    icon: Activity,
    forEmotions: ['fearful', 'angry', 'surprised'],
    difficulty: 'easy',
  },
  {
    id: 'gratitude',
    title: 'Gratitude Practice',
    description: 'Shift your focus to positive aspects of your life',
    steps: [
      'Find a quiet space and take a few deep breaths',
      'Think of 3 things you\'re grateful for today',
      'Write them down or say them out loud',
      'Reflect on why each one matters to you',
      'Notice how your mood shifts',
    ],
    icon: Heart,
    forEmotions: ['sad', 'neutral'],
    difficulty: 'easy',
  },
  {
    id: 'progressive-relaxation',
    title: 'Progressive Muscle Relaxation',
    description: 'Release physical tension by systematically relaxing muscle groups',
    steps: [
      'Start with your toes - tense them for 5 seconds, then release',
      'Move up to your calves, thighs, and continue upward',
      'Tense and release each muscle group',
      'Work your way up to your face and head',
      'Notice the difference between tension and relaxation',
    ],
    icon: Activity,
    forEmotions: ['angry', 'fearful'],
    difficulty: 'medium',
  },
  {
    id: 'mindful-walk',
    title: 'Mindful Walking',
    description: 'Clear your mind with a focused walking meditation',
    steps: [
      'Go for a 10-15 minute walk, preferably in nature',
      'Focus on each step - the sensation of your feet touching the ground',
      'Notice your surroundings without judgment',
      'When your mind wanders, gently bring focus back to walking',
      'End by taking three deep breaths',
    ],
    icon: Activity,
    forEmotions: ['sad', 'angry', 'neutral'],
    difficulty: 'easy',
  },
  {
    id: 'creative-expression',
    title: 'Creative Expression',
    description: 'Channel emotions through creative activities',
    steps: [
      'Choose a creative outlet: drawing, writing, music, or crafts',
      'Set a timer for 15-20 minutes',
      'Express your feelings without judgment or rules',
      'Focus on the process, not the outcome',
      'Reflect on how you feel afterward',
    ],
    icon: Sparkles,
    forEmotions: ['sad', 'angry', 'happy'],
    difficulty: 'medium',
  },
  {
    id: 'social-connection',
    title: 'Reach Out',
    description: 'Connect with supportive people in your life',
    steps: [
      'Identify someone you trust and feel comfortable with',
      'Reach out via call, text, or in person',
      'Share how you\'re feeling if you\'re comfortable',
      'Ask if they have time to listen or spend time together',
      'Remember: asking for support is a sign of strength',
    ],
    icon: Users,
    forEmotions: ['sad', 'fearful'],
    difficulty: 'medium',
  },
  {
    id: 'self-compassion',
    title: 'Self-Compassion Break',
    description: 'Treat yourself with the kindness you\'d offer a good friend',
    steps: [
      'Acknowledge that you\'re struggling right now',
      'Remind yourself that difficult emotions are part of being human',
      'Place your hand on your heart and speak kindly to yourself',
      'Say: "May I be kind to myself in this moment"',
      'Take three slow, deep breaths',
    ],
    icon: Heart,
    forEmotions: ['sad', 'disgusted', 'angry'],
    difficulty: 'medium',
  },
  {
    id: 'journaling',
    title: 'Emotional Journaling',
    description: 'Process your thoughts and feelings through writing',
    steps: [
      'Find a quiet space with pen and paper',
      'Write freely about how you\'re feeling for 10 minutes',
      'Don\'t worry about grammar or structure',
      'Let your thoughts flow without censoring',
      'Read back what you wrote and notice any insights',
    ],
    icon: BookOpen,
    forEmotions: ['sad', 'angry', 'fearful', 'neutral'],
    difficulty: 'easy',
  },
  {
    id: 'energy-boost',
    title: 'Quick Energy Reset',
    description: 'Refresh your mind and body with movement and hydration',
    steps: [
      'Drink a full glass of water',
      'Do 10 jumping jacks or a quick stretch',
      'Step outside for fresh air if possible',
      'Listen to an uplifting song',
      'Notice how your energy shifts',
    ],
    icon: Coffee,
    forEmotions: ['sad', 'neutral'],
    difficulty: 'easy',
  },
];

export default function CopingStrategies() {
  const { copy } = useAppLanguage();
  const { data, isLoading } = useQuery<{ emotions: EmotionRecord[] }>({
    queryKey: ["/api/emotions/all"],
  });

  const getRecommendedStrategies = (): CopingStrategy[] => {
    if (!data?.emotions || data.emotions.length === 0) {
      return copingStrategies.slice(0, 3);
    }

    const recentEmotions = data.emotions
      .filter(e => new Date(e.timestamp) >= subDays(new Date(), 7))
      .map(e => e.emotion as EmotionType);

    const emotionCounts: Record<string, number> = {};
    recentEmotions.forEach(emotion => {
      emotionCounts[emotion] = (emotionCounts[emotion] || 0) + 1;
    });

    const topEmotions = Object.entries(emotionCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([emotion]) => emotion as EmotionType);

    const scored = copingStrategies.map(strategy => {
      const score = strategy.forEmotions.reduce((acc, emotion) => {
        return acc + (emotionCounts[emotion] || 0);
      }, 0);
      return { strategy, score };
    });

    scored.sort((a, b) => b.score - a.score);

    return scored.slice(0, 6).map(item => item.strategy);
  };

  const recommended = getRecommendedStrategies();
  const otherStrategies = copingStrategies.filter(
    s => !recommended.find(r => r.id === s.id)
  );

  const difficultyColors = {
    easy: 'bg-green-500/10 text-green-700 dark:text-green-400',
    medium: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400',
    advanced: 'bg-red-500/10 text-red-700 dark:text-red-400',
  };

  const renderStrategyCard = (strategy: CopingStrategy, index: number) => {
    const Icon = strategy.icon;
    return (
      <Card key={strategy.id} className="hover-elevate transition-all" data-testid={`strategy-${strategy.id}`}>
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 flex-1">
              <div className="p-2 rounded-lg bg-primary/10">
                <Icon className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-lg">{strategy.title}</CardTitle>
                <CardDescription className="mt-1">{strategy.description}</CardDescription>
              </div>
            </div>
            <Badge variant="outline" className={difficultyColors[strategy.difficulty]}>
              {copy[strategy.difficulty]}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{copy.steps}</p>
            <ol className="space-y-2">
              {strategy.steps.map((step, i) => (
                <li key={i} className="text-sm flex gap-2">
                  <span className="font-medium text-primary min-w-[1.5rem]">{i + 1}.</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </div>
          <div className="mt-4 pt-4 border-t">
            <p className="text-xs text-muted-foreground">
              {copy.helpfulFor}{' '}
              {strategy.forEmotions.map((emotion, i) => (
                <span key={emotion}>
                  <span className="capitalize font-medium">{emotion}</span>
                  {i < strategy.forEmotions.length - 1 ? ', ' : ''}
                </span>
              ))}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">{copy.loadingStrategies}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-8">
          <Link href="/" data-testid="link-home">
            <Button variant="ghost" size="sm" className="mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              {copy.backToSession}
            </Button>
          </Link>
          <div className="flex items-center gap-3 mb-2">
            <Heart className="w-8 h-8 text-primary" />
            <h1 className="text-4xl font-bold">{copy.copingTitle}</h1>
          </div>
          <p className="text-muted-foreground">
            {copy.copingDescription}
          </p>
        </div>

        <div className="space-y-8">
          <div>
            <h2 className="text-2xl font-semibold mb-4">
              {copy.recommendedForYou}
            </h2>
            <p className="text-muted-foreground mb-6">
              {copy.recommendedDescription}
            </p>
            <div className="grid md:grid-cols-2 gap-6">
              {recommended.map((strategy, index) => renderStrategyCard(strategy, index))}
            </div>
          </div>

          {otherStrategies.length > 0 && (
            <div>
              <h2 className="text-2xl font-semibold mb-4">
                {copy.moreStrategies}
              </h2>
              <p className="text-muted-foreground mb-6">
                {copy.moreStrategiesDescription}
              </p>
              <div className="grid md:grid-cols-2 gap-6">
                {otherStrategies.map((strategy, index) => renderStrategyCard(strategy, index))}
              </div>
            </div>
          )}
        </div>

        <Card className="mt-8 bg-primary/5 border-primary/20">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-full bg-primary/10">
                <Brain className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold mb-2">{copy.remember}</h3>
                <p className="text-sm text-muted-foreground">
                  {copy.rememberDescription}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
