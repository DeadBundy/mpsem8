import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, ShieldCheck, TriangleAlert } from "lucide-react";
import { useAppLanguage } from "@/lib/language";

const sources = [
  {
    label: "WHO India: Mental health",
    href: "https://www.who.int/india/health-topics/mental-health",
    note: "Overview of mental health, policy, and care context in India.",
  },
  {
    label: "NIMHANS",
    href: "https://www.nimhans.ac.in/",
    note: "India's leading public institute for mental health and neurosciences.",
  },
  {
    label: "MindNotes from NIMHANS",
    href: "https://mindnotes.nimhans.ac.in/",
    note: "Free self-help and mental health literacy tool from NIMHANS.",
  },
];

export function SourcesSafetyCard() {
  const { copy } = useAppLanguage();

  return (
    <Card className="text-left">
      <CardHeader>
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-emerald-600" />
          <CardTitle>{copy.sourcesSafety}</CardTitle>
        </div>
        <CardDescription>
          {copy.sourcesSafetyDescription}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">{copy.notDiagnosis}</Badge>
          <Badge variant="outline">{copy.emotionDetectionWrong}</Badge>
          <Badge variant="outline">{copy.urgentRiskHelp}</Badge>
        </div>

        <div className="rounded-xl border bg-muted/30 p-4 text-sm">
          <div className="mb-2 flex items-center gap-2 font-medium">
            <TriangleAlert className="h-4 w-4 text-amber-600" />
            {copy.seekHelpNow}
          </div>
          <p className="text-muted-foreground">
            {copy.seekHelpNowBody}
          </p>
        </div>

        <div className="space-y-3">
          {sources.map((source) => (
            <a
              key={source.href}
              href={source.href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-start justify-between gap-3 rounded-xl border p-3 transition-colors hover:bg-muted/30"
            >
              <div>
                <div className="font-medium">{source.label}</div>
                <div className="text-sm text-muted-foreground">{source.note}</div>
              </div>
              <ExternalLink className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            </a>
          ))}
        </div>

        <p className="text-xs text-muted-foreground">
          {copy.teleManasFooter}
        </p>
      </CardContent>
    </Card>
  );
}
