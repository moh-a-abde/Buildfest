"use client";

import { useState } from "react";
import Link from "next/link";
import { Leaf, Maximize2 } from "lucide-react";
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

interface CoachDockProps {
  initialPrompt?: string;
}

export function CoachDock({ initialPrompt }: CoachDockProps) {
  const [open, setOpen] = useState(false);

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
              onClick={() => setOpen(true)}
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
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="right"
          showCloseButton
          className="w-full sm:max-w-md p-0 flex flex-col"
        >
          <SheetHeader className="px-4 py-3 border-b flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="bg-primary/10 text-primary p-1.5 rounded-full">
                  <Leaf className="w-4 h-4" />
                </div>
                <div>
                  <SheetTitle className="text-base">NourishMe Coach</SheetTitle>
                  <SheetDescription className="text-xs">
                    Nutrition &amp; SNAP guidance
                  </SheetDescription>
                </div>
              </div>
              <Button variant="ghost" size="icon-xs" asChild>
                <Link href="/coach" onClick={() => setOpen(false)} aria-label="Open full chat">
                  <Maximize2 className="w-3.5 h-3.5" />
                </Link>
              </Button>
            </div>
          </SheetHeader>

          <div className="flex-1 min-h-0">
            <CoachChat initialPrompt={initialPrompt} compact />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
