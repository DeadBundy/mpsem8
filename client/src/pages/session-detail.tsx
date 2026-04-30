import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useParams } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Calendar, Clock, Download, Sparkles, Loader2 } from "lucide-react";
import { format } from "date-fns";
import type { TherapySession, Message, EmotionRecord } from "@shared/schema";
import { ChatInterface } from "@/components/ChatInterface";
import { EmotionTimeline } from "@/components/EmotionTimeline";
import { apiRequest } from "@/lib/queryClient";
import { useState } from "react";
import { useAppLanguage } from "@/lib/language";

interface SessionDetailData {
  session: TherapySession;
  messages: Message[];
  emotions: EmotionRecord[];
}

interface SessionSummary {
  overview: string;
  keyInsights: string[];
  emotionalJourney: string;
  recommendations: string[];
}

export default function SessionDetail() {
  const { copy } = useAppLanguage();
  const params = useParams();
  const sessionId = params.id;
  const [summary, setSummary] = useState<SessionSummary | null>(null);

  const { data, isLoading } = useQuery<SessionDetailData>({
    queryKey: [`/api/sessions/${sessionId}`],
  });

  const generateSummaryMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("GET", `/api/sessions/${sessionId}/summary`, undefined);
      return response.summary as SessionSummary;
    },
    onSuccess: (data) => {
      setSummary(data);
    },
  });

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return copy.inProgress;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const exportSession = () => {
    if (!data) return;

    const content = `Therapy Session - ${format(new Date(data.session.startedAt), "PPP")}\n\n` +
      `Duration: ${formatDuration(data.session.duration)}\n\n` +
      `Conversation:\n${data.messages.map(m => 
        `${m.role === 'user' ? 'You' : 'Therapist'}: ${m.content}`
      ).join('\n\n')}`;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `session-${format(new Date(data.session.startedAt), 'yyyy-MM-dd')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">{copy.loadingSession}</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground mb-4">{copy.sessionNotFound}</p>
            <Link href="/history" data-testid="link-back">
              <Button>{copy.backToHistory}</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const emotions = data.emotions.map(e => ({
    emotion: e.emotion as any,
    confidence: parseFloat(e.confidence),
    timestamp: new Date(e.timestamp).getTime(),
  }));

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-6">
          <Link href="/history" data-testid="link-history">
            <Button variant="ghost" size="sm" className="mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              {copy.backToHistory}
            </Button>
          </Link>
          
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold mb-2">
                {copy.sessionDetails}
              </h1>
              <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {format(new Date(data.session.startedAt), "PPP")}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {format(new Date(data.session.startedAt), "p")}
                </span>
                <Badge variant="outline">
                  {formatDuration(data.session.duration)}
                </Badge>
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button
                onClick={() => generateSummaryMutation.mutate()}
                variant="default"
                size="sm"
                disabled={generateSummaryMutation.isPending || data.messages.length < 2}
                data-testid="button-generate-summary"
              >
                {generateSummaryMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {copy.generating}
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    {copy.generateSummary}
                  </>
                )}
              </Button>
              <Button
                onClick={exportSession}
                variant="outline"
                size="sm"
                data-testid="button-export"
              >
                <Download className="w-4 h-4 mr-2" />
                {copy.export}
              </Button>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            {summary && (
              <Card className="border-primary/20 bg-primary/5">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-primary" />
                    {copy.sessionSummary}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h3 className="font-semibold mb-2">{copy.overview}</h3>
                    <p className="text-sm text-muted-foreground">{summary.overview}</p>
                  </div>
                  
                  <div>
                    <h3 className="font-semibold mb-2">{copy.keyInsights}</h3>
                    <ul className="space-y-1">
                      {summary.keyInsights.map((insight, i) => (
                        <li key={i} className="text-sm text-muted-foreground flex gap-2">
                          <span className="text-primary">•</span>
                          <span>{insight}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  <div>
                    <h3 className="font-semibold mb-2">{copy.emotionalJourney}</h3>
                    <p className="text-sm text-muted-foreground">{summary.emotionalJourney}</p>
                  </div>
                  
                  <div>
                    <h3 className="font-semibold mb-2">{copy.recommendations}</h3>
                    <ul className="space-y-1">
                      {summary.recommendations.map((rec, i) => (
                        <li key={i} className="text-sm text-muted-foreground flex gap-2">
                          <span className="text-primary">•</span>
                          <span>{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            )}
            
            <Card>
              <CardHeader>
                <CardTitle>{copy.conversation}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="max-h-[600px] overflow-y-auto pr-2">
                  {data.messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`mb-4 ${
                        msg.role === "user" ? "text-right" : "text-left"
                      }`}
                      data-testid={`message-${msg.id}`}
                    >
                      <div
                        className={`inline-block max-w-[80%] px-4 py-2 rounded-lg ${
                          msg.role === "user"
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted"
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                        <p className="text-xs opacity-70 mt-1">
                          {format(new Date(msg.timestamp), "h:mm a")}
                        </p>
                      </div>
                      {msg.emotion && (
                        <div className="mt-1">
                          <Badge variant="secondary" className="text-xs">
                            {msg.emotion}
                          </Badge>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{copy.emotionTimeline}</CardTitle>
              </CardHeader>
              <CardContent>
                {emotions.length > 0 ? (
                  <EmotionTimeline emotions={emotions} />
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    {copy.noEmotionDataRecorded}
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
