"use client";

import { Leaf } from "lucide-react";
import { useCoach } from "@/contexts/CoachContext";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface AskCoachButtonProps {
  prompt: string;
  label?: string;
  className?: string;
  variant?: "chip" | "inline";
  tooltip?: string;
}

export function AskCoachButton({
  prompt,
  label = "Ask Coach",
  className,
  variant = "chip",
  tooltip = "Get nutrition and SNAP tips",
}: AskCoachButtonProps) {
  const { openCoach } = useCoach();

  const button = (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        openCoach(prompt);
      }}
      className={cn(
        "inline-flex items-center gap-1.5 transition-colors font-medium",
        variant === "chip"
          ? "text-[11px] px-2.5 py-1 rounded-full border border-primary/20 bg-primary/5 text-primary hover:bg-primary/10"
          : "text-xs text-primary/80 hover:text-primary",
        className,
      )}
    >
      <Leaf className="w-3 h-3" />
      {label}
    </button>
  );

  if (tooltip) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{button}</TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">{tooltip}</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return button;
}
