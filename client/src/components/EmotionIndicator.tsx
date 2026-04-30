import { type EmotionType } from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import { Smile, Frown, Angry, AlertTriangle, ThumbsDown, Zap, Minus } from "lucide-react";
import { useAppLanguage } from "@/lib/language";

interface EmotionIndicatorProps {
  emotion: EmotionType;
  confidence: number;
  size?: "sm" | "lg";
}

const emotionConfig: Record<EmotionType, { icon: any; color: string }> = {
  happy: { icon: Smile, color: "bg-emotion-happy/20 text-emotion-happy border-emotion-happy/30" },
  sad: { icon: Frown, color: "bg-emotion-sad/20 text-emotion-sad border-emotion-sad/30" },
  angry: { icon: Angry, color: "bg-emotion-angry/20 text-emotion-angry border-emotion-angry/30" },
  fearful: { icon: AlertTriangle, color: "bg-emotion-fearful/20 text-emotion-fearful border-emotion-fearful/30" },
  disgusted: { icon: ThumbsDown, color: "bg-emotion-disgusted/20 text-emotion-disgusted border-emotion-disgusted/30" },
  surprised: { icon: Zap, color: "bg-emotion-surprised/20 text-emotion-surprised border-emotion-surprised/30" },
  neutral: { icon: Minus, color: "bg-emotion-neutral/20 text-emotion-neutral border-emotion-neutral/30" },
};

export function EmotionIndicator({ emotion, confidence, size = "sm" }: EmotionIndicatorProps) {
  const { language, copy } = useAppLanguage();
  const config = emotionConfig[emotion];
  const Icon = config.icon;
  const labels = {
    en: {
      happy: "Happy",
      sad: "Sad",
      angry: "Angry",
      fearful: "Fearful",
      disgusted: "Disgusted",
      surprised: "Surprised",
      neutral: "Neutral",
    },
    hi: {
      happy: "खुश",
      sad: "उदास",
      angry: "गुस्सा",
      fearful: "डर",
      disgusted: "घृणा",
      surprised: "आश्चर्य",
      neutral: "सामान्य",
    },
    mr: {
      happy: "आनंदी",
      sad: "दुःखी",
      angry: "राग",
      fearful: "भीती",
      disgusted: "तिटकारा",
      surprised: "आश्चर्य",
      neutral: "सामान्य",
    },
  } as const;
  const label = labels[language][emotion];

  if (size === "lg") {
    return (
      <div className={`flex flex-col items-center justify-center p-5 rounded-2xl border-2 ${config.color}`} data-testid={`emotion-indicator-${emotion}`}>
        <Icon className="h-10 w-10 mb-2" />
        <h3 className="text-xl font-heading font-semibold mb-1">{label}</h3>
        <div className="text-base font-medium" data-testid="emotion-confidence">
          {Math.round(confidence * 100)}% {copy.confidence}
        </div>
      </div>
    );
  }

  return (
    <Badge variant="outline" className={`${config.color} gap-2`} data-testid={`emotion-badge-${emotion}`}>
      <Icon className="h-4 w-4" />
      <span>{label}</span>
      <span className="text-xs opacity-70">{Math.round(confidence * 100)}%</span>
    </Badge>
  );
}
