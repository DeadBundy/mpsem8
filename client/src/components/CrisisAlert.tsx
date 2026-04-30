import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Phone, ExternalLink } from "lucide-react";
import { useAppLanguage } from "@/lib/language";

interface CrisisAlertProps {
  onDismiss?: () => void;
}

export function CrisisAlert({ onDismiss }: CrisisAlertProps) {
  const { copy } = useAppLanguage();
  const resources = [
    {
      name: "Tele-MANAS",
      phone: "14416 or 1-800-891-4416",
      description: "24/7 free mental health support across India",
      url: "https://www.nimhans.ac.in/",
    },
    {
      name: "Emergency Response Support System",
      phone: "112",
      description: "Immediate emergency assistance in India",
      url: "https://112.gov.in/",
    },
    {
      name: "NIMHANS",
      phone: "080-26995000",
      description: "National mental health and neurosciences institute",
      url: "https://www.nimhans.ac.in/contact-us/",
    },
  ];

  return (
    <Card className="border-destructive/50 bg-destructive/5" data-testid="crisis-alert">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-destructive">
          <AlertTriangle className="w-5 h-5" />
          {copy.crisisTitle}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm">
          {copy.crisisBody}
        </p>

        <div className="space-y-3">
          {resources.map((resource) => (
            <div
              key={resource.name}
              className="p-3 rounded-lg bg-background border"
              data-testid={`crisis-resource-${resource.name.toLowerCase().replace(/\s+/g, '-')}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <h4 className="font-semibold text-sm mb-1">{resource.name}</h4>
                  <p className="text-sm text-muted-foreground mb-2">{resource.description}</p>
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Phone className="w-4 h-4" />
                    <span>{resource.phone}</span>
                  </div>
                </div>
                <a
                  href={resource.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:text-primary/80"
                  data-testid={`link-${resource.name.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>
          ))}
        </div>

        <div className="pt-3 border-t">
          <p className="text-xs text-muted-foreground">
            {copy.crisisFooter}
          </p>
        </div>

        {onDismiss && (
          <Button
            variant="outline"
            size="sm"
            onClick={onDismiss}
            className="w-full"
            data-testid="button-dismiss-crisis"
          >
            {copy.iUnderstand}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
