"use client";

import { useRef, useCallback, useEffect } from "react";
import Link from "next/link";
import { Leaf } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { CoachChat } from "@/components/CoachChat";
import { useCoach } from "@/contexts/CoachContext";

export function CoachDock() {
  const { open, initialPrompt, openCoach, closeCoach } = useCoach();
  const fabRef = useRef<HTMLButtonElement>(null);

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (next) openCoach();
      else closeCoach();
    },
    [openCoach, closeCoach],
  );

  const handleFabClick = useCallback(() => openCoach(), [openCoach]);

  // Return focus to FAB when Sheet closes
  useEffect(() => {
    if (!open) {
      fabRef.current?.focus();
    }
  }, [open]);

  return (
    <>
      {/* Floating Action Button */}
      <AnimatePresence>
        {!open && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
            className="fixed bottom-6 right-6 z-50"
          >
            <button
              ref={fabRef}
              onClick={handleFabClick}
              className="group relative flex items-center justify-center w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl transition-shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              aria-label="Open NourishMe Coach"
            >
              <Leaf className="w-6 h-6 transition-transform group-hover:scale-110" />
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-accent rounded-full border-2 border-background" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat Sheet */}
      <Sheet open={open} onOpenChange={handleOpenChange}>
        <SheetContent
          side="right"
          showCloseButton
          className="w-full sm:max-w-md p-0 flex flex-col"
          aria-label="NourishMe Coach chat"
        >
          <SheetHeader className="px-4 py-3 border-b flex-shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <SheetTitle className="text-base">
                  NourishMe Coach
                </SheetTitle>
                <SheetDescription className="text-xs">
                  Nutrition &amp; SNAP guidance
                </SheetDescription>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link
                  href="/coach"
                  onClick={() => closeCoach()}
                  aria-label="Open full page"
                >
                  Open page
                </Link>
              </Button>
            </div>
          </SheetHeader>

          <div className="flex-1 min-h-0">
            <CoachChat
              initialPrompt={initialPrompt}
              compact
            />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
