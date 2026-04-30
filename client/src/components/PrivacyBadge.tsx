import { Shield, Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getLanguageCopy, type SupportedLanguage } from "@/lib/language";

export function PrivacyBadge({ language = "en" }: { language?: SupportedLanguage }) {
  const copy = getLanguageCopy(language);

  return (
    <div className="flex items-center gap-2 text-xs">
      <Badge variant="outline" className="gap-2 bg-muted/50">
        <Shield className="h-3 w-3 text-green-600 dark:text-green-400" />
        <span className="text-muted-foreground">{copy.cameraBadge}</span>
      </Badge>
      <Badge variant="outline" className="gap-2 bg-muted/50">
        <Lock className="h-3 w-3 text-green-600 dark:text-green-400" />
        <span className="text-muted-foreground">{copy.aiBadge}</span>
      </Badge>
    </div>
  );
}
