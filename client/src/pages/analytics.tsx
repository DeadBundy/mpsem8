import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, TrendingUp, Calendar, Brain, Activity, MessageSquare, Clock } from "lucide-react";
import { format, subDays } from "date-fns";
import type { EmotionRecord, EmotionType, TherapySession } from "@shared/schema";
import { useAppLanguage } from "@/lib/language";

interface EmotionStats {
  emotion: EmotionType;
  count: number;
  percentage: number;
  avgConfidence: number;
}

interface DayData {
  date: string;
  emotions: Record<EmotionType, number>;
  totalCount: number;
}

const emotionColors: Record<EmotionType, string> = {
  happy: "bg-yellow-500",
  sad: "bg-blue-500",
  angry: "bg-red-500",
  fearful: "bg-purple-500",
  disgusted: "bg-green-500",
  surprised: "bg-orange-500",
  neutral: "bg-gray-500",
};

export default function Analytics() {
  const { copy } = useAppLanguage();
  const { data: emotionsData, isLoading: emotionsLoading } = useQuery<{ emotions: EmotionRecord[] }>({
    queryKey: ["/api/emotions/all"],
  });

  const { data: sessionsData, isLoading: sessionsLoading } = useQuery<{ sessions: TherapySession[] }>({
    queryKey: ["/api/sessions"],
  });

  const isLoading = emotionsLoading || sessionsLoading;

  const calculateStats = (emotions: EmotionRecord[], days: number): EmotionStats[] => {
    const cutoffDate = subDays(new Date(), days);
    const filtered = emotions.filter(e => 
      new Date(e.timestamp) >= cutoffDate
    );

    const emotionCounts: Record<string, { count: number; totalConfidence: number }> = {};
    
    filtered.forEach(record => {
      if (!emotionCounts[record.emotion]) {
        emotionCounts[record.emotion] = { count: 0, totalConfidence: 0 };
      }
      emotionCounts[record.emotion].count++;
      emotionCounts[record.emotion].totalConfidence += parseFloat(record.confidence);
    });

    const total = filtered.length || 1;
    
    return Object.entries(emotionCounts)
      .map(([emotion, data]) => ({
        emotion: emotion as EmotionType,
        count: data.count,
        percentage: (data.count / total) * 100,
        avgConfidence: data.totalConfidence / data.count,
      }))
      .sort((a, b) => b.count - a.count);
  };

  const getDailyData = (emotions: EmotionRecord[], days: number): DayData[] => {
    const cutoffDate = subDays(new Date(), days);
    const dailyData: Record<string, DayData> = {};

    for (let i = 0; i < days; i++) {
      const date = format(subDays(new Date(), days - i - 1), 'yyyy-MM-dd');
      dailyData[date] = {
        date,
        emotions: {
          happy: 0,
          sad: 0,
          angry: 0,
          fearful: 0,
          disgusted: 0,
          surprised: 0,
          neutral: 0,
        },
        totalCount: 0,
      };
    }

    emotions
      .filter(e => new Date(e.timestamp) >= cutoffDate)
      .forEach(record => {
        const date = format(new Date(record.timestamp), 'yyyy-MM-dd');
        if (dailyData[date]) {
          dailyData[date].emotions[record.emotion as EmotionType]++;
          dailyData[date].totalCount++;
        }
      });

    return Object.values(dailyData);
  };

  const renderStatsCard = (stats: EmotionStats[], title: string, description: string) => (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {stats.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            {copy.noEmotionDataRecorded}
          </p>
        ) : (
          <div className="space-y-4">
            {stats.map((stat) => (
              <div key={stat.emotion} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${emotionColors[stat.emotion]}`} />
                    <span className="capitalize font-medium">{stat.emotion}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">{stat.count} {copy.times}</span>
                    <Badge variant="outline" className="text-xs">
                      {stat.percentage.toFixed(1)}%
                    </Badge>
                  </div>
                </div>
                <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full ${emotionColors[stat.emotion]}`}
                    style={{ width: `${stat.percentage}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {copy.confidence}: {(stat.avgConfidence * 100).toFixed(1)}%
                </p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );

  const renderDailyChart = (dailyData: DayData[], title: string) => {
    const maxCount = Math.max(...dailyData.map(d => d.totalCount), 1);
    
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{copy.dailyEmotionDistribution}</CardDescription>
        </CardHeader>
        <CardContent>
          {dailyData.every(d => d.totalCount === 0) ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              {copy.noEmotionDataRecorded}
            </p>
          ) : (
            <div className="space-y-2">
              {dailyData.map((day) => (
                <div key={day.date} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">
                      {format(new Date(day.date), 'MMM d')}
                    </span>
                    <span className="text-muted-foreground">
                      {day.totalCount} {copy.detections}
                    </span>
                  </div>
                  <div className="flex h-8 w-full overflow-hidden rounded-md bg-muted">
                    {day.totalCount > 0 ? (
                      Object.entries(day.emotions).map(([emotion, count]) => {
                        if (count === 0) return null;
                        const percentage = (count / day.totalCount) * 100;
                        return (
                          <div
                            key={emotion}
                            className={`${emotionColors[emotion as EmotionType]} flex items-center justify-center text-xs text-white font-medium`}
                            style={{ width: `${percentage}%` }}
                            title={`${emotion}: ${count}`}
                          >
                            {percentage > 15 ? count : ''}
                          </div>
                        );
                      })
                    ) : (
                      <div className="w-full flex items-center justify-center text-xs text-muted-foreground">
                        {copy.noEmotionDataYet}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">{copy.loadingAnalytics}</p>
        </div>
      </div>
    );
  }

  const emotions = emotionsData?.emotions || [];
  const sessions = sessionsData?.sessions || [];
  
  const completedSessions = sessions.filter(s => s.endedAt);
  const totalDuration = completedSessions.reduce((sum, s) => sum + (s.duration || 0), 0);
  const avgDuration = completedSessions.length > 0 ? totalDuration / completedSessions.length : 0;
  
  const weekStats = calculateStats(emotions, 7);
  const monthStats = calculateStats(emotions, 30);
  const weeklyData = getDailyData(emotions, 7);
  const monthlyData = getDailyData(emotions, 30);

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
            <Brain className="w-8 h-8 text-primary" />
            <h1 className="text-4xl font-bold">{copy.emotionAnalytics}</h1>
          </div>
          <p className="text-muted-foreground">
            {copy.analyticsDescription}
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {copy.totalSessions}
              </CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{sessions.length}</div>
              <p className="text-xs text-muted-foreground">
                {completedSessions.length} {copy.completed}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {copy.avgSessionLength}
              </CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {Math.floor(avgDuration / 60)}m {avgDuration % 60}s
              </div>
              <p className="text-xs text-muted-foreground">
                {Math.floor(totalDuration / 60)} {copy.minutesTotal}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {copy.emotionsDetected}
              </CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{emotions.length}</div>
              <p className="text-xs text-muted-foreground">
                {copy.acrossAllSessions}
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="week" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="week" data-testid="tab-week">
              {copy.last7Days}
            </TabsTrigger>
            <TabsTrigger value="month" data-testid="tab-month">
              {copy.last30Days}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="week" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              {renderStatsCard(weekStats, copy.weeklyEmotionDistribution, copy.weeklyEmotionDescription)}
              {renderDailyChart(weeklyData, copy.dailyBreakdown)}
            </div>
          </TabsContent>

          <TabsContent value="month" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              {renderStatsCard(monthStats, copy.monthlyEmotionDistribution, copy.monthlyEmotionDescription)}
              {renderDailyChart(monthlyData, copy.dailyBreakdown)}
            </div>
          </TabsContent>
        </Tabs>

        {emotions.length === 0 && (
          <Card className="mt-6">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <TrendingUp className="w-16 h-16 text-muted-foreground mb-4" />
              <h2 className="text-xl font-semibold mb-2">{copy.noAnalyticsDataYet}</h2>
              <p className="text-muted-foreground mb-4 text-center">
                {copy.analyticsEmptyDescription}
              </p>
              <Link href="/" data-testid="link-start">
                <Button>{copy.startSession}</Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
