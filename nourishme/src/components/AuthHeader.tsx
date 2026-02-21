"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Leaf, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { motion } from "framer-motion";

export function AuthHeader() {
  const { user, isGuest, isLoading, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const isHomePage = pathname === "/";
  const showFullNav = isHomePage && !user && !isGuest;
  const username = user?.email?.split("@")[0] ?? user?.email ?? "Account";

  async function handleSignOut() {
    await signOut();
    router.push("/");
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 flex justify-center pt-4 px-4 pointer-events-none">
      <motion.header 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="w-full max-w-6xl pointer-events-auto bg-background/80 backdrop-blur-xl border border-border/50 shadow-sm rounded-full"
      >
        <div className="px-6 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="bg-primary/10 text-primary p-1.5 rounded-full transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
              <Leaf className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-extrabold tracking-tight text-foreground">
              NourishMe
            </h1>
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground">
            {showFullNav && (
              <>
                <Link href="#how-it-works" className="hover:text-foreground transition-colors">How It Works</Link>
                <Link href="/pantry" className="hover:text-foreground transition-colors">Pantry</Link>
                <Link href="#testimonials" className="hover:text-foreground transition-colors">Stories</Link>
              </>
            )}
          </nav>

          <nav className="flex items-center gap-3">
            {isLoading ? (
              <div className="h-9 w-20 animate-pulse bg-muted rounded-full" />
            ) : user ? (
              <>
                <span className="text-sm font-medium text-muted-foreground hidden sm:inline truncate max-w-[120px]">
                  {username}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSignOut}
                  className="rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/50"
                >
                  <LogOut className="w-4 h-4 mr-1.5" />
                  Sign Out
                </Button>
              </>
            ) : isGuest ? (
              <>
                <span className="text-sm font-medium text-muted-foreground hidden sm:inline">
                  Guest
                </span>
                <Button variant="outline" size="sm" className="rounded-full border-border/50" asChild>
                  <Link href="/auth/sign-in">Sign In</Link>
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  className="rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/50 hidden sm:flex"
                  asChild
                >
                  <Link href="/auth/sign-in">Sign In</Link>
                </Button>
                <Button size="sm" className="rounded-full shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all bg-primary hover:bg-primary/90" asChild>
                  <Link href="/auth/sign-up">Start Planning</Link>
                </Button>
              </>
            )}
          </nav>
        </div>
      </motion.header>
    </div>
  );
}
