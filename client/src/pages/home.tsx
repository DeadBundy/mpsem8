import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { type EmotionDetection, type ChatMessage, type EmotionType } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { WebcamView } from "@/components/WebcamView";
import { EmotionIndicator } from "@/components/EmotionIndicator";
import { ChatInterface } from "@/components/ChatInterface";
import { MessageInput } from "@/components/MessageInput";
import { EmotionTimeline } from "@/components/EmotionTimeline";
import { PrivacyBadge } from "@/components/PrivacyBadge";
import { ThemeToggle } from "@/components/ThemeToggle";
import { CrisisAlert } from "@/components/CrisisAlert";
import { SourcesSafetyCard } from "@/components/SourcesSafetyCard";
import { speakText } from "@/lib/speech";
import { getSpeechLocale } from "@/lib/language";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";
import { Play, Square, Loader2, History, TrendingUp, Heart, LogOut, UserCircle } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { loadModels, detectEmotion } from "@/lib/emotionDetection";
import { Link, useLocation } from "wouter";
import { languageOptions, useLanguage, type SupportedLanguage } from "@/lib/language";

interface UserPreferencesResponse {
  language?: SupportedLanguage;
}

export default function Home() {
  const [, setLocation] = useLocation();
  const { user, logout } = useAuth();
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [currentEmotion, setCurrentEmotion] = useState<EmotionDetection | null>(null);
  const [emotionHistory, setEmotionHistory] = useState<EmotionDetection[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [streamingContent, setStreamingContent] = useState("");
  const [webcamError, setWebcamError] = useState<string>("");
  const [isModelLoading, setIsModelLoading] = useState(false);
  const [showCrisisAlert, setShowCrisisAlert] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectionIntervalRef = useRef<number | null>(null);
  
  const { toast } = useToast();
  const { language: selectedLanguage, copy, setLanguage } = useLanguage();

  const preferencesQuery = useQuery<UserPreferencesResponse | null>({
    queryKey: ["/api/preferences"],
    enabled: !!user,
  });

  useEffect(() => {
    const preferenceLanguage = preferencesQuery.data?.language as SupportedLanguage | undefined;
    if (preferenceLanguage && preferenceLanguage !== selectedLanguage) {
      setLanguage(preferenceLanguage);
    }
  }, [preferencesQuery.data, selectedLanguage, setLanguage]);

  useEffect(() => {
    const storedSessionId = localStorage.getItem("mindwellai-sessionId");
    if (!storedSessionId || !user || sessionId) return;

    const restoreSession = async () => {
      try {
        const data = await apiRequest("GET", `/api/sessions/${storedSessionId}`);
        if (data?.messages) {
          setSessionId(storedSessionId);
          setIsSessionActive(true);
          setMessages(data.messages);
          setEmotionHistory(data.emotions || []);
          startWebcam();
        }
      } catch {
        localStorage.removeItem("mindwellai-sessionId");
      }
    };

    void restoreSession();
  }, [user, sessionId]);

  const updatePreferencesMutation = useMutation({
    mutationFn: async (language: SupportedLanguage) => apiRequest("PUT", "/api/preferences", { language }),
    onSuccess: (preferences) => {
      const nextLanguage = (preferences?.language as SupportedLanguage | undefined) || "en";
      setLanguage(nextLanguage);
      queryClient.setQueryData(["/api/preferences"], preferences);
    },
  });

  const userInitials = (user?.fullName || user?.username || "U")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const latestAssistantMessage = [...messages].reverse().find((message) => message.role === "assistant")?.content;

  const detectCrisis = (messageText: string): boolean => {
    const crisisKeywords = [
      'suicide', 'kill myself', 'end my life', 'want to die', 'feel like dying', 'i feel like dying', 'better off dead',
      'self harm', 'hurt myself', 'cutting', 'overdose', 'no reason to live',
      'can\'t go on', 'unbearable pain', 'hopeless', 'worthless'
    ];
    
    const lowerText = messageText.toLowerCase();
    return crisisKeywords.some(keyword => lowerText.includes(keyword));
  };

  const startSessionMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/sessions/start", {});
      return response;
    },
    onSuccess: (data) => {
      console.log('Session started:', data.sessionId);
      setSessionId(data.sessionId);
      localStorage.setItem("mindwellai-sessionId", data.sessionId);
      setIsSessionActive(true);
      setMessages([
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: copy.sessionGreeting,
          timestamp: new Date(),
        },
      ]);
      startWebcam();
      toast({
        title: copy.sessionStartedTitle,
        description: copy.sessionStartedDescription,
      });
    },
    onError: () => {
      toast({
        title: copy.error,
        description: copy.startSessionError,
        variant: "destructive",
      });
    },
  });

  const endSessionMutation = useMutation({
    mutationFn: async () => {
      if (!sessionId) return;
      await apiRequest("POST", "/api/sessions/end", { sessionId });
    },
    onSuccess: () => {
      console.log('Session ended with ID:', sessionId);
      stopWebcam();
      localStorage.removeItem("mindwellai-sessionId");
      setIsSessionActive(false);
      setSessionId(null);
      setCurrentEmotion(null);
      setEmotionHistory([]);
      setMessages([]);
      toast({
        title: copy.sessionEndedTitle,
        description: copy.sessionEndedDescription,
      });
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async ({ content, emotion, emotionConfidence }: { content: string; emotion?: EmotionType; emotionConfidence?: number }) => {
      if (!sessionId) throw new Error("No active session");
      
      const userMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content,
        emotion,
        emotionConfidence,
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, userMessage]);
      setStreamingContent("");

      const token = localStorage.getItem("authToken");
      const response = await fetch("/api/messages/stream", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          sessionId,
          content,
          language: selectedLanguage,
          emotion: emotion || null,
          emotionConfidence: emotionConfidence ? emotionConfidence.toString() : null,
          isNewSession: messages.length === 0,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to send message");
      }

      if (!response.body) {
        throw new Error("No response body");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullContent = "";
      let lastMessageId = "";
      let buffer = "";

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const text = decoder.decode(value, { stream: true });
          buffer += text;
          
          // Process complete lines only
          const parts = buffer.split('\n');
          buffer = parts.pop() || ""; // Keep incomplete line in buffer

          for (const line of parts) {
            if (line.trim().startsWith('data: ')) {
              const data = line.trim().slice(6).trim();
              if (data && data !== ':keep-alive') {
                try {
                  const parsed = JSON.parse(data);
                  
                  if (parsed.type === 'chunk') {
                    fullContent += parsed.content;
                    setStreamingContent(fullContent);
                  } else if (parsed.type === 'complete') {
                    lastMessageId = parsed.messageId;
                    setStreamingContent("");
                  } else if (parsed.type === 'error') {
                    throw new Error(parsed.error || 'Stream error');
                  } else if (parsed.type === 'start') {
                    console.log("Stream started");
                  }
                } catch (e) {
                  console.debug("Parse error:", e);
                }
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }

      return { messageId: lastMessageId, content: fullContent };
    },
    onSuccess: (data) => {
      if (data.content) {
        const assistantMessage: ChatMessage = {
          id: data.messageId || crypto.randomUUID(),
          role: "assistant",
          content: data.content,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, assistantMessage]);
      }
    },
    onError: (error) => {
      setStreamingContent("");
      toast({
        title: copy.error,
        description: error instanceof Error ? error.message : copy.startSessionError,
        variant: "destructive",
      });
    },
  });

  const startWebcam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 },
        audio: false,
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setWebcamError("");
        
        videoRef.current.onloadedmetadata = () => {
          setIsModelLoading(true);
          loadFaceDetectionModels();
        };
      }
    } catch (error) {
      setWebcamError("Unable to access camera. Please ensure camera permissions are granted.");
      toast({
        title: copy.cameraErrorTitle,
        description: copy.cameraErrorDescription,
        variant: "destructive",
      });
    }
  };

  const stopWebcam = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
      detectionIntervalRef.current = null;
    }
  };

  const loadFaceDetectionModels = async () => {
    try {
      await loadModels();
      setIsModelLoading(false);
      startEmotionDetection();
      toast({
        title: copy.emotionDetectionReadyTitle,
        description: copy.emotionDetectionReadyDescription,
      });
    } catch (error) {
      setIsModelLoading(false);
      setWebcamError("Failed to load emotion detection models.");
      toast({
        title: copy.modelErrorTitle,
        description: copy.modelErrorDescription,
        variant: "destructive",
      });
    }
  };

  const startEmotionDetection = () => {
    detectionIntervalRef.current = window.setInterval(() => {
      performEmotionDetection();
    }, 2000);
  };

  const performEmotionDetection = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    try {
      const result = await detectEmotion(videoRef.current, canvasRef.current);
      
      if (result) {
        const detection: EmotionDetection = {
          emotion: result.emotion,
          confidence: result.confidence,
          timestamp: Date.now(),
        };
        
        setCurrentEmotion(detection);
        setEmotionHistory(prev => [...prev, detection].slice(-30));

        if (sessionId) {
          await apiRequest("POST", "/api/emotions", {
            sessionId,
            emotion: result.emotion,
            confidence: result.confidence,
          });
        }
      }
    } catch (error) {
      console.error("Emotion detection error:", error);
    }
  };

  useEffect(() => {
    return () => {
      stopWebcam();
    };
  }, []);

  const handleSendMessage = (content: string, voiceEmotion?: any) => {
    if (detectCrisis(content)) {
      setShowCrisisAlert(true);
    }
    
    // Use voice emotion if available, otherwise use current emotion detection
    const emotion = voiceEmotion?.emotion || currentEmotion?.emotion;
    const confidence = voiceEmotion ? voiceEmotion.confidence : currentEmotion?.confidence;
    
    sendMessageMutation.mutate({
      content,
      emotion,
      emotionConfidence: confidence,
    });
  };

  const handleLogout = () => {
    if (isSessionActive) {
      stopWebcam();
      setIsSessionActive(false);
      setSessionId(null);
      setCurrentEmotion(null);
      setEmotionHistory([]);
      setMessages([]);
    }
    queryClient.clear();
    logout();
    setLocation("/");
  };

  return (
    <div className="h-screen overflow-hidden bg-background">
      <header className="border-b bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/50 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-heading font-bold text-foreground">{copy.appTitle}</h1>
              <p className="text-sm text-muted-foreground">{copy.appSubtitle}</p>
            </div>
            <div className="flex items-center gap-2">
              {isSessionActive && sessionId && (
                <div className="text-sm text-muted-foreground mr-4" data-testid="session-status">
                  {copy.sessionActive}
                </div>
              )}
              <Select
                value={selectedLanguage}
                onValueChange={(value: SupportedLanguage) => {
                  setLanguage(value);
                  updatePreferencesMutation.mutate(value);
                }}
              >
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder={copy.languageLabel} />
                </SelectTrigger>
                <SelectContent>
                  {languageOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <ThemeToggle />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-11 rounded-full px-2">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>{userInitials}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="flex items-center gap-2">
                    <UserCircle className="h-4 w-4" />
                    <div>
                      <div className="font-medium">{user?.fullName || user?.username}</div>
                      <div className="text-xs text-muted-foreground">{user?.email}</div>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setLocation("/")} className="cursor-pointer">
                    {copy.home}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-red-600 focus:text-red-600">
                    <LogOut className="mr-2 h-4 w-4" />
                    {copy.logout}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto h-[calc(100vh-93px)] px-4 py-4">
        {!isSessionActive ? (
          <div className="max-w-4xl mx-auto">
            <div className="text-center space-y-6 py-12">
              <div className="space-y-3">
                <h2 className="text-4xl font-heading font-bold">{copy.welcomeTitle}</h2>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                  {copy.welcomeBody}
                </p>
              </div>

              <div className="flex flex-col items-center gap-4 py-8">
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                  <Button
                    size="lg"
                    onClick={() => startSessionMutation.mutate()}
                    disabled={startSessionMutation.isPending}
                    className="rounded-2xl px-8 py-6 text-lg h-auto"
                    data-testid="button-start-session"
                  >
                    {startSessionMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        {copy.startingSession}
                      </>
                    ) : (
                      <>
                        <Play className="mr-2 h-5 w-5" />
                        {copy.startSession}
                      </>
                    )}
                  </Button>
                  
                  <div className="flex gap-3">
                    <Link href="/history" data-testid="link-history">
                      <Button
                        variant="outline"
                        size="lg"
                        className="rounded-2xl px-6 py-6 text-base h-auto"
                      >
                        <History className="mr-2 h-5 w-5" />
                        {copy.history}
                      </Button>
                    </Link>
                    
                    <Link href="/analytics" data-testid="link-analytics">
                      <Button
                        variant="outline"
                        size="lg"
                        className="rounded-2xl px-6 py-6 text-base h-auto"
                      >
                        <TrendingUp className="mr-2 h-5 w-5" />
                        {copy.analytics}
                      </Button>
                    </Link>
                  </div>
                </div>
                
                <PrivacyBadge language={selectedLanguage} />
              </div>

              <div className="grid md:grid-cols-3 gap-6 pt-8 max-w-3xl mx-auto">
                <div className="p-6 rounded-xl bg-card border">
                  <h3 className="font-heading font-semibold mb-2">{copy.realTimeDetection}</h3>
                  <p className="text-sm text-muted-foreground">
                    {copy.realTimeDetectionBody}
                  </p>
                </div>
                <div className="p-6 rounded-xl bg-card border">
                  <h3 className="font-heading font-semibold mb-2">{copy.adaptiveSupport}</h3>
                  <p className="text-sm text-muted-foreground">
                    {copy.adaptiveSupportBody}
                  </p>
                </div>
                <div className="p-6 rounded-xl bg-card border">
                  <h3 className="font-heading font-semibold mb-2">{copy.completePrivacy}</h3>
                  <p className="text-sm text-muted-foreground">
                    {copy.completePrivacyBody}
                  </p>
                </div>
              </div>

              <div className="mt-8 pt-8 border-t">
                <p className="text-center text-muted-foreground mb-4">
                  {copy.exploreResources}
                </p>
                <div className="flex flex-wrap justify-center gap-3">
                  <Link href="/coping-strategies" data-testid="link-coping">
                    <Button variant="outline" size="sm">
                      <Heart className="w-4 h-4 mr-2" />
                      {copy.copingStrategies}
                    </Button>
                  </Link>
                  <Link href="/journal" data-testid="link-journal">
                    <Button variant="outline" size="sm">
                      {copy.journal}
                    </Button>
                  </Link>
                  <Link href="/analytics" data-testid="link-analytics">
                    <Button variant="outline" size="sm">
                      {copy.analytics}
                    </Button>
                  </Link>
                </div>
              </div>

              <div className="pt-8">
                <SourcesSafetyCard />
              </div>
            </div>
          </div>
        ) : (
          <div className="grid h-full min-h-0 lg:grid-cols-5 gap-5">
            <div className="lg:col-span-2 flex min-h-0 flex-col gap-3">
              {showCrisisAlert && (
                <CrisisAlert onDismiss={() => setShowCrisisAlert(false)} />
              )}
              
              <div className="flex min-h-0 flex-1 flex-col gap-3">
                <WebcamView
                  videoRef={videoRef}
                  canvasRef={canvasRef}
                  isActive={isSessionActive}
                  error={webcamError}
                />
                
                {isModelLoading && (
                  <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>{copy.loadingEmotionModels}</span>
                  </div>
                )}
                
                {currentEmotion && !isModelLoading && (
                  <EmotionIndicator
                    emotion={currentEmotion.emotion}
                    confidence={currentEmotion.confidence}
                    size="lg"
                  />
                )}
                
                <EmotionTimeline emotions={emotionHistory} />
                
                <div className="flex flex-col gap-2">
                  <Button
                    variant="destructive"
                    onClick={() => endSessionMutation.mutate()}
                    disabled={endSessionMutation.isPending}
                    className="w-full"
                    data-testid="button-end-session"
                  >
                    {endSessionMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {copy.endingSession}
                      </>
                    ) : (
                      <>
                        <Square className="mr-2 h-4 w-4" />
                        {copy.endSession}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>

            <div className="lg:col-span-3 flex min-h-0 flex-col">
              <div className="flex-1 min-h-0">
                <ChatInterface
                  messages={messages}
                  streamingContent={streamingContent}
                  isLoading={sendMessageMutation.isPending}
                  language={selectedLanguage}
                  onNewAssistantMessage={(msg) => {
                    speakText(msg.content, { lang: getSpeechLocale(selectedLanguage) });
                  }}
                />
              </div>
              <MessageInput
                onSend={handleSendMessage}
                disabled={sendMessageMutation.isPending || !isSessionActive}
                placeholder={copy.messagePlaceholder}
                language={selectedLanguage}
              />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
