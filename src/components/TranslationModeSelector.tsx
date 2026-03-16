/**
 * Translation Mode Selector
 * Toggle between local SLM and cloud AI translation
 */

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Cloud,
  Cpu,
  Download,
  CheckCircle,
  AlertCircle,
  Loader2,
} from "lucide-react";
import type { TranslationMode } from "@/hooks/useLocalTranslation";
import type { InitProgress } from "@/lib/webllm-engine";
import { cn } from "@/lib/utils";

interface TranslationModeSelectorProps {
  mode: TranslationMode;
  onModeChange: (mode: TranslationMode) => void;
  isModelReady: boolean;
  isLoadingModel: boolean;
  modelProgress: InitProgress | null;
  onInitializeModel: () => Promise<void>;
  webGPUSupported: boolean | null;
  modelInfo: {
    id: string;
    name: string;
    description: string;
    size: string;
  };
}

export default function TranslationModeSelector({
  mode,
  onModeChange,
  isModelReady,
  isLoadingModel,
  modelProgress,
  onInitializeModel,
  webGPUSupported,
  modelInfo,
}: TranslationModeSelectorProps) {
  const [showDownloadPrompt, setShowDownloadPrompt] = useState(false);

  const handleLocalClick = async () => {
    if (isModelReady) {
      onModeChange("local");
    } else if (webGPUSupported === false) {
      // WebGPU not supported, show message
      return;
    } else if (!isLoadingModel) {
      setShowDownloadPrompt(true);
    }
  };

  const handleDownload = async () => {
    setShowDownloadPrompt(false);
    try {
      await onInitializeModel();
    } catch (error) {
      console.error("Failed to initialize model:", error);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-muted-foreground">Mode:</span>
        
        <div className="flex rounded-lg border border-border p-1 bg-muted/30">
          {/* Cloud Mode Button */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={mode === "cloud" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => onModeChange("cloud")}
                  className={cn(
                    "gap-1.5 h-7 px-3",
                    mode === "cloud" && "bg-background shadow-sm"
                  )}
                >
                  <Cloud className="h-3.5 w-3.5" />
                  Cloud AI
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Uses Gemini AI via cloud (requires internet)</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          
        </div>

        {/* Status Badges */}
        {mode === "local" && isModelReady && (
          <Badge variant="outline" className="text-xs gap-1 text-green-600 border-green-200 bg-green-50">
            <CheckCircle className="h-3 w-3" />
            Offline Ready
          </Badge>
        )}

        {webGPUSupported === false && (
          <Badge variant="outline" className="text-xs gap-1 text-amber-600 border-amber-200 bg-amber-50">
            <AlertCircle className="h-3 w-3" />
            WebGPU Unavailable
          </Badge>
        )}
      </div>

      {/* Download Prompt */}
      {showDownloadPrompt && !isLoadingModel && (
        <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/30">
          <Download className="h-5 w-5 text-muted-foreground flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">Download Local Model</p>
            <p className="text-xs text-muted-foreground">
              {modelInfo.name} • {modelInfo.size}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDownloadPrompt(false)}
            >
              Cancel
            </Button>
            <Button size="sm" onClick={handleDownload}>
              Download
            </Button>
          </div>
        </div>
      )}

      {/* Loading Progress */}
      {isLoadingModel && modelProgress && (
        <div className="flex flex-col gap-2 p-3 rounded-lg border border-border bg-muted/30">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Loading {modelInfo.name}...</span>
            <span className="text-muted-foreground">
              {Math.round(modelProgress.progress * 100)}%
            </span>
          </div>
          <Progress value={modelProgress.progress * 100} className="h-2" />
          <p className="text-xs text-muted-foreground">{modelProgress.text}</p>
        </div>
      )}
    </div>
  );
}
