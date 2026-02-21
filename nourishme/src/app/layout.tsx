import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { AuthProvider } from "@/contexts/AuthContext";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CoachDock } from "@/components/CoachDock";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "NourishMe - AI Meal & Budget Planner",
  description:
    "AI-powered meal and budget planner that helps families stretch SNAP dollars, improve nutrition quality, and connect to local food resources.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased bg-noise`}
      >
        <AuthProvider>
          <TooltipProvider>
            {children}
            <CoachDock />
          </TooltipProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
