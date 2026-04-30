import { useEffect, useMemo, useRef, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Volume2, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { speakText, stopSpeechPlayback } from "@/lib/speech";
import { getSpeechLocale, useLanguage, type SupportedLanguage } from "@/lib/language";

interface VoiceModeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSend: (message: string) => void;
  disabled?: boolean;
  latestAssistantMessage?: string;
  language?: SupportedLanguage;
  description?: string;
}

export function VoiceModeDialog({
  open,
  onOpenChange,
  onSend,
  disabled,
  latestAssistantMessage,
  language = "en",
  description = "Speak naturally. Your words will be sent as chat messages, and the assistant can speak replies back.",
}: VoiceModeDialogProps) {
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [lastSpokenMessage, setLastSpokenMessage] = useState("");
  const { toast } = useToast();
  const { copy } = useLanguage();

  const speechSupported = useMemo(
    () => typeof window !== "undefined" && ("webkitSpeechRecognition" in window || "SpeechRecognition" in window),
    [],
  );

  useEffect(() => {
    if (!speechSupported) return;

    const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognitionCtor();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = getSpeechLocale(language);

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onresult = (event) => {
      const nextTranscript = Array.from(event.results)
        .map((result) => result[0]?.transcript || "")
        .join(" ")
        .trim();
      setTranscript(nextTranscript);
    };
    recognition.onerror = (event) => {
      setIsListening(false);
      toast({
        title: "Voice mode error",
        description: event.error,
        variant: "destructive",
      });
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.stop();
      recognitionRef.current = null;
    };
  }, [language, speechSupported, toast]);

  useEffect(() => {
    if (!open || !latestAssistantMessage || latestAssistantMessage === lastSpokenMessage) return;

    recognitionRef.current?.stop();

    void speakText(
      latestAssistantMessage,
      { lang: getSpeechLocale(language) },
      {
      onEnd: () => {
        setLastSpokenMessage(latestAssistantMessage);
        if (open && recognitionRef.current) {
          recognitionRef.current.start();
        }
      },
      onError: () => {
        toast({
          title: copy.voicePlaybackErrorTitle,
          description: copy.voicePlaybackErrorDescription,
          variant: "destructive",
        });
      },
      },
    );
  }, [open, latestAssistantMessage, lastSpokenMessage, toast]);

  useEffect(() => {
    if (!open) {
      recognitionRef.current?.stop();
      setIsListening(false);
      setTranscript("");
      stopSpeechPlayback();
    }
  }, [open]);

  const startListening = () => {
    if (!speechSupported || !recognitionRef.current) {
      toast({
        title: "Voice mode unavailable",
        description: copy.voiceModeDescription,
        variant: "destructive",
      });
      return;
    }
    setTranscript("");
    recognitionRef.current.start();
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
  };

  const handleSend = () => {
    if (!transcript.trim() || disabled) return;
    onSend(transcript.trim());
    setTranscript("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl border-0 bg-slate-950 p-0 text-slate-50">
        <div className="relative overflow-hidden rounded-xl bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.28),_transparent_38%),linear-gradient(180deg,_#111827,_#020617)] p-8">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onOpenChange(false)}
            className="absolute right-4 top-4 text-slate-300 hover:bg-white/10 hover:text-white"
          >
            <X className="h-5 w-5" />
          </Button>

          <div className="mb-8 text-center">
            <DialogTitle className="text-2xl font-semibold">{copy.voiceMode}</DialogTitle>
            <DialogDescription className="mt-2 text-slate-300">
              {description}
            </DialogDescription>
          </div>

          <div className="flex flex-col items-center gap-6">
            <button
              type="button"
              onClick={isListening ? stopListening : startListening}
              disabled={disabled}
              className={`flex h-40 w-40 items-center justify-center rounded-full border text-white shadow-2xl transition ${
                isListening
                  ? "border-rose-300 bg-rose-500/80 shadow-rose-500/30"
                  : "border-sky-300/60 bg-sky-500/70 shadow-sky-500/20"
              }`}
            >
              {isListening ? <MicOff className="h-14 w-14" /> : <Mic className="h-14 w-14" />}
            </button>

            <div className="text-center">
              <p className="text-lg font-medium">
                {isListening ? copy.listening : copy.tapToSpeak}
              </p>
              <p className="mt-2 text-sm text-slate-300">
                {transcript ? transcript : copy.transcriptPlaceholder}
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                variant="secondary"
                onClick={handleSend}
                disabled={disabled || !transcript.trim()}
                className="min-w-32"
              >
                {copy.send}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setTranscript("");
                  stopListening();
                }}
                className="min-w-32 border-slate-700 bg-transparent text-slate-200 hover:bg-white/10 hover:text-white"
              >
                {copy.clear}
              </Button>
            </div>

            <div className="mt-4 flex items-center gap-2 text-sm text-slate-300">
              <Volume2 className="h-4 w-4" />
              <span>{copy.assistantRepliesSpoken}</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
