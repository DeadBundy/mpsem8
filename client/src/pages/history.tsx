import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, MessageSquare, TrendingUp, ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import type { TherapySession } from "@shared/schema";
import { useAppLanguage } from "@/lib/language";

interface SessionWithStats extends TherapySession {
  messageCount?: number;
  dominantEmotion?: string;
}

export default function History() {
  const { copy } = useAppLanguage();
  const { data, isLoading } = useQuery<{ sessions: SessionWithStats[] }>({
    queryKey: ["/api/sessions"],
  });

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return copy.inProgress;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

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
          <h1 className="text-4xl font-bold mb-2">{copy.sessionHistory}</h1>
          <p className="text-muted-foreground">
            {copy.historyDescription}
          </p>
        </div>

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader className="space-y-0 pb-2">
                  <div className="h-4 bg-muted rounded w-3/4" />
                  <div className="h-3 bg-muted rounded w-1/2 mt-2" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="h-3 bg-muted rounded" />
                    <div className="h-3 bg-muted rounded w-5/6" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : !data?.sessions || data.sessions.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Calendar className="w-16 h-16 text-muted-foreground mb-4" />
              <h2 className="text-xl font-semibold mb-2">{copy.noSessionsYet}</h2>
              <p className="text-muted-foreground mb-4">
                {copy.startFirstSession}
              </p>
              <Link href="/" data-testid="link-start-session">
                <Button>{copy.startSession}</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {data.sessions.map((session) => (
              <Link
                key={session.id}
                href={`/session/${session.id}`}
                data-testid={`link-session-${session.id}`}
              >
                <Card className="hover-elevate active-elevate-2 cursor-pointer h-full transition-all">
                  <CardHeader className="space-y-0 pb-2">
                    <CardTitle className="text-lg flex items-center justify-between">
                      <span className="truncate">
                        {format(new Date(session.startedAt), "MMM d, yyyy")}
                      </span>
                      {!session.endedAt && (
                          <Badge variant="default" className="ml-2">
                          {copy.active}
                        </Badge>
                      )}
                    </CardTitle>
                    <CardDescription className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {format(new Date(session.startedAt), "h:mm a")}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {copy.duration}
                      </span>
                      <span className="font-medium">
                        {formatDuration(session.duration)}
                      </span>
                    </div>
                    
                    {session.dominantEmotion && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground flex items-center gap-1">
                          <TrendingUp className="w-4 h-4" />
                          {copy.mood}
                        </span>
                        <Badge variant="secondary" className="capitalize">
                          {session.dominantEmotion}
                        </Badge>
                      </div>
                    )}

                    <div className="pt-2 border-t">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full"
                        data-testid={`button-view-${session.id}`}
                      >
                        <MessageSquare className="w-4 h-4 mr-2" />
                        {copy.viewDetails}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
