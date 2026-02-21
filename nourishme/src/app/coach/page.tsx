"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Leaf, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { AuthHeader } from "@/components/AuthHeader";
import { CoachChat } from "@/components/CoachChat";

function CoachPageInner() {
  const searchParams = useSearchParams();
  const initialPrompt = searchParams.get("q") ?? undefined;

  return (
    <div className="min-h-screen bg-background">
      <AuthHeader />

      <main className="pt-24 pb-8 px-4">
        <motion.div
          initial={{ y: 16, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="max-w-2xl mx-auto"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-primary/10 text-primary p-2.5 rounded-full">
              <Leaf className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                NourishMe Coach
              </h1>
              <p className="text-sm text-muted-foreground">
                Your nutrition &amp; SNAP benefits guide
              </p>
            </div>
          </div>

          <Card className="overflow-hidden p-0">
            <CoachChat initialPrompt={initialPrompt} />
          </Card>
        </motion.div>
      </main>
    </div>
  );
}

export default function CoachPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <CoachPageInner />
    </Suspense>
  );
}
