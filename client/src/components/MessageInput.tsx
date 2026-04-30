import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, AudioLines } from "lucide-react";
import type { VoiceEmotionResult } from "@/lib/voiceAnalysis";
import { useLanguage, type SupportedLanguage } from "@/lib/language";

interface MessageInputProps {
  onSend: (message: string, voiceEmotion?: VoiceEmotionResult) => void;
  onOpenVoiceMode?: () => void;
  disabled?: boolean;
  placeholder?: string;
  language?: SupportedLanguage;
}

export function MessageInput({
  onSend,
  onOpenVoiceMode,
  disabled,
  placeholder = "Share how you're feeling or what's on your mind...",
}: MessageInputProps) {
  const [message, setMessage] = useState("");
  const { copy } = useLanguage();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !disabled) {
      onSend(message.trim());
      setMessage("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 border-t bg-card">
      <div className="flex gap-2">
        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className="resize-none min-h-[60px] text-base"
          data-testid="input-message"
        />
        <div className="flex flex-col gap-1">
          <Button
            type="button"
            size="icon"
            variant="secondary"
            onClick={onOpenVoiceMode}
            disabled={disabled || !onOpenVoiceMode}
            className="h-[29px] w-[60px]"
            title={copy.openVoiceMode}
          >
            <AudioLines className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex flex-col gap-1">
          <Button
            type="submit"
            size="icon"
            disabled={disabled || !message.trim()}
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
