"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Leaf, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

export function AuthHeader() {
  const { user, isGuest, isLoading, signOut } = useAuth();
  const router = useRouter();

  async function handleSignOut() {
    await signOut();
    router.push("/");
  }

  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="bg-primary text-primary-foreground p-1.5 rounded-lg">
            <Leaf className="w-5 h-5" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            NourishMe
          </h1>
        </Link>

        <nav className="flex items-center gap-3">
          {isLoading ? (
            <div className="h-9 w-20 animate-pulse bg-muted rounded-md" />
          ) : user ? (
            <>
              <span className="text-sm text-muted-foreground hidden sm:inline truncate max-w-[150px]">
                {user.email}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSignOut}
                className="text-muted-foreground hover:text-foreground"
              >
                <LogOut className="w-4 h-4 mr-1.5" />
                Sign Out
              </Button>
            </>
          ) : isGuest ? (
            <>
              <span className="text-sm text-muted-foreground hidden sm:inline">
                Guest
              </span>
              <Button variant="outline" size="sm" asChild>
                <Link href="/auth/sign-in">Sign In</Link>
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-foreground"
                asChild
              >
                <Link href="/auth/sign-in">Sign In</Link>
              </Button>
              <Button size="sm" asChild>
                <Link href="/auth/sign-up">Sign Up</Link>
              </Button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
