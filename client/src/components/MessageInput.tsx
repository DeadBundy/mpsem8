import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Mic, AudioLines } from "lucide-react";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { useLanguage, type SupportedLanguage } from "@/lib/language";

interface MessageInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
  language?: SupportedLanguage;
}

export function MessageInput({
  onSend,
  disabled,
  placeholder = "Share how you're feeling or what's on your mind...",
  language,
}: MessageInputProps) {
  const [message, setMessage] = useState("");
  const {
    isListening: voiceListening,
    transcript,
    startListening,
    stopListening,
    resetTranscript,
  } = useSpeechRecognition({
    language,
    onSilence: (msg: string) => {
      onSend(msg);
      resetTranscript();
    },
  });
  const { copy } = useLanguage();

  useEffect(() => {
    setMessage(transcript);
  }, [transcript]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !disabled) {
      onSend(message.trim());
      stopListening();
      resetTranscript();
      setMessage("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

const toggleVoice = useCallback(() => {
    console.log("🔴 MIC CLICKED", { voiceListening });
    if (voiceListening) {
      stopListening();
      setMessage(transcript);
    } else {
      startListening();
      setMessage("");
    }
  }, [voiceListening, startListening, stopListening, transcript]);

  return (
    <form onSubmit={handleSubmit} className="p-4 border-t bg-card">
      <div className="flex gap-2">
        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={voiceListening ? "Listening..." : placeholder}
          disabled={disabled}
          className={`resize-none min-h-[60px] text-base transition-all ${
            voiceListening ? 'ring-2 ring-green-500/20 bg-green-500/5 border-green-500/30' : ''
          }`}
          data-testid="input-message"
        />
        <div className="flex flex-col gap-1 self-start pt-2">
          <Button
            type="button"
            size="icon"
            variant={voiceListening ? "default" : "secondary"}
            onClick={toggleVoice}
            disabled={disabled}
            className={`h-12 w-[60px] transition-all ${
              voiceListening ? 'bg-green-500 hover:bg-green-600 animate-pulse' : 'hover:bg-accent'
            }`}
            title={voiceListening ? "Stop listening" : "Start voice"}
            data-testid="button-voice"
          >
            {voiceListening ? (
              <Mic className="h-4 w-4" />
            ) : (
              <AudioLines className="h-4 w-4" />
            )}
          </Button>
        </div>
        <div className="flex flex-col gap-1 self-end">
          <Button
            type="submit"
            size="icon"
            disabled={disabled || !message.trim() || voiceListening}
            className="h-[29px] w-[60px]"
            data-testid="button-send"
          >
            <Send className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </form>
  );
}
