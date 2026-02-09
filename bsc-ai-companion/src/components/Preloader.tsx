import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface PreloaderProps {
  onComplete: () => void;
  minDuration?: number;
}

export const Preloader = ({ onComplete, minDuration = 2000 }: PreloaderProps) => {
  const [progress, setProgress] = useState(0);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const newProgress = Math.min((elapsed / minDuration) * 100, 100);
      setProgress(newProgress);

      if (newProgress >= 100) {
        clearInterval(interval);
        setFadeOut(true);
        setTimeout(onComplete, 500);
      }
    }, 50);

    return () => clearInterval(interval);
  }, [minDuration, onComplete]);

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex flex-col items-center justify-center bg-background transition-opacity duration-500",
        fadeOut && "opacity-0 pointer-events-none"
      )}
    >
      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-secondary/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '0.5s' }} />
      </div>



      {/* Brand */}
      <h1 className="text-3xl font-bold mb-2">
        <span className="bg-gradient-to-r from-primary via-secondary to-primary bg-clip-text text-transparent">
          AI Assistant
        </span>
      </h1>
      <p className="text-muted-foreground mb-8">Initializing your workspace...</p>

      {/* Progress bar */}
      <div className="w-64 h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-primary to-secondary rounded-full transition-all duration-100 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Loading text */}
      <p className="mt-4 text-sm text-muted-foreground">
        {progress < 30 && "Loading resources..."}
        {progress >= 30 && progress < 60 && "Connecting to services..."}
        {progress >= 60 && progress < 90 && "Preparing interface..."}
        {progress >= 90 && "Almost ready..."}
      </p>
    </div>
  );
};
