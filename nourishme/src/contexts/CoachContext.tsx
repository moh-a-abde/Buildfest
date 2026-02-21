"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

interface CoachContextValue {
  open: boolean;
  initialPrompt: string | undefined;
  openCoach: (prompt?: string) => void;
  closeCoach: () => void;
}

const CoachContext = createContext<CoachContextValue | null>(null);

export function CoachProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [initialPrompt, setInitialPrompt] = useState<string | undefined>();

  const openCoach = useCallback((prompt?: string) => {
    setInitialPrompt(prompt);
    setOpen(true);
  }, []);

  const closeCoach = useCallback(() => {
    setOpen(false);
  }, []);

  const value = useMemo(
    () => ({ open, initialPrompt, openCoach, closeCoach }),
    [open, initialPrompt, openCoach, closeCoach],
  );

  return (
    <CoachContext.Provider value={value}>{children}</CoachContext.Provider>
  );
}

export function useCoach(): CoachContextValue {
  const ctx = useContext(CoachContext);
  if (!ctx) {
    throw new Error("useCoach must be used within a CoachProvider");
  }
  return ctx;
}
