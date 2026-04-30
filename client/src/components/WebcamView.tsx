import { useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Camera, CameraOff } from "lucide-react";
import { useAppLanguage } from "@/lib/language";

interface WebcamViewProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  isActive: boolean;
  error?: string;
}

export function WebcamView({ videoRef, canvasRef, isActive, error }: WebcamViewProps) {
  const { copy } = useAppLanguage();

  return (
    <Card className="overflow-hidden">
      <div className="relative aspect-video bg-muted flex items-center justify-center">
        {error ? (
          <Alert variant="destructive" className="m-4">
            <CameraOff className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : !isActive ? (
          <div className="flex flex-col items-center gap-4 text-muted-foreground">
            <Camera className="h-16 w-16" />
            <p className="text-sm">{copy.cameraActivatesWhenSessionStarts}</p>
          </div>
        ) : null}
        
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className={`absolute inset-0 w-full h-full object-cover rounded-xl ${!isActive ? "hidden" : ""}`}
          data-testid="webcam-video"
        />
        
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full"
          data-testid="webcam-canvas"
        />
      </div>
    </Card>
  );
}
