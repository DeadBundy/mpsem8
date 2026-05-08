import { useRef, useEffect, useState, useCallback } from "react";
import { type ChatMessage } from "@shared/schema";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { EmotionIndicator } from "./EmotionIndicator";
import { Loader2, Volume2, VolumeX, Copy, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { speakText, stopSpeechPlayback } from "@/lib/speech";
import { getSpeechLocale, useLanguage, type SupportedLanguage } from "@/lib/language";

interface ChatInterfaceProps {
  messages: ChatMessage[];
  isLoading?: boolean;
  streamingContent?: string;
  language?: SupportedLanguage;
  onNewAssistantMessage?: (message: ChatMessage) => void; // for auto TTS + stop listening
}

export function ChatInterface({
  messages,
  isLoading,
  streamingContent = "",
  language = "en",
  onNewAssistantMessage,
}: ChatInterfaceProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const { toast } = useToast();
  const { copy } = useLanguage();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, streamingContent]);

  // Auto TTS new assistant messages
  const prevMessagesLengthRef = useRef(messages.length);
  useEffect(() => {
    if (messages.length > prevMessagesLengthRef.current) {
      const newMsg = messages[messages.length - 1];
      if (newMsg.role === 'assistant' && onNewAssistantMessage) {
        onNewAssistantMessage(newMsg);
      }
    }
    prevMessagesLengthRef.current = messages.length;
  }, [messages, onNewAssistantMessage]);

  const handleTextToSpeech = (message: ChatMessage) => {
    if (speakingMessageId === message.id) {
      stopSpeechPlayback();
      setSpeakingMessageId(null);
      return;
    }

    void speakText(
      message.content,
      { lang: getSpeechLocale(language) },
      {
      onStart: () => setSpeakingMessageId(message.id),
      onEnd: () => setSpeakingMessageId(null),
      onError: () => {
        setSpeakingMessageId(null);
        toast({
          title: copy.voicePlaybackErrorTitle,
          description: copy.voicePlaybackErrorDescription,
          variant: "destructive",
        });
      },
      },
    );
  };

  const handleCopyMessage = (content: string, messageId: string) => {
    navigator.clipboard.writeText(content);
    setCopiedId(messageId);
    setTimeout(() => setCopiedId(null), 2000);
    toast({
      title: copy.copied,
      description: copy.copiedMessage,
    });
  };

  return (
    <Card className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="p-4 border-b">
        <h2 className="text-xl font-heading font-semibold">Therapy Session</h2>
        <p className="text-sm text-muted-foreground">{copy.supportiveConversation}</p>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-4 p-4">
          {messages.length === 0 && streamingContent === "" ? (
            <div className="flex items-center justify-center h-full py-12">
              <p className="text-muted-foreground text-center max-w-md">
                {copy.noMessagesYet}
              </p>
            </div>
          ) : (
            <>
              {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                data-testid={`message-${message.role}`}
              >
                <div
                  className={`max-w-[80%] rounded-3xl px-6 py-4 group ${
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-card border"
                  }`}
                >
                  {message.emotion && message.emotionConfidence && (
                    <div className="mb-2">
                      <EmotionIndicator
                        emotion={message.emotion}
                        confidence={message.emotionConfidence}
                      />
                    </div>
                  )}
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-base leading-relaxed whitespace-pre-wrap flex-1">{message.content}</p>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2">
                      {message.role === "assistant" && (
                        <>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleTextToSpeech(message)}
                            className="h-6 w-6 p-0 shrink-0"
                            title={speakingMessageId === message.id ? copy.stopSpeaking : copy.speakMessage}
                          >
                            {speakingMessageId === message.id ? (
                              <VolumeX className="h-3 w-3" />
                            ) : (
                              <Volume2 className="h-3 w-3" />
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleCopyMessage(message.content, message.id)}
                            className="h-6 w-6 p-0 shrink-0"
                            title={copy.copyMessage}
                          >
                            {copiedId === message.id ? (
                              <Check className="h-3 w-3" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                  <p className="text-xs opacity-60 mt-2">
                    {new Date(message.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              </div>
              ))}

              {/* Streaming message */}
              {streamingContent && (
                <div className="flex justify-start">
                  <div className="max-w-[80%] bg-card border rounded-3xl px-6 py-4">
                    <div className="flex items-start gap-3">
                      <p className="text-base leading-relaxed whitespace-pre-wrap flex-1">{streamingContent}</p>
                      <Loader2 className="h-4 w-4 animate-spin mt-1 ml-2 shrink-0" />
                    </div>
                  </div>
                </div>
              )}

              {isLoading && !streamingContent && (
                <div className="flex justify-start">
                  <div className="bg-card border rounded-3xl px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm text-muted-foreground">{copy.therapistThinking}</span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </>
          )}
        </div>
      </ScrollArea>
    </Card>
  );
}
