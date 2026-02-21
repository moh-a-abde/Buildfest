import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Leaf, Wallet, ClipboardList, ArrowRight, Heart } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col font-sans selection:bg-primary/20">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-primary text-primary-foreground p-1.5 rounded-lg">
              <Leaf className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">NourishMe</h1>
          </div>
          <nav className="flex items-center gap-4">
            <Button variant="ghost" className="hidden sm:flex text-muted-foreground hover:text-foreground" asChild>
              <Link href="/onboarding">How it works</Link>
            </Button>
            <Button className="font-medium shadow-sm" asChild>
              <Link href="/onboarding">Get Started</Link>
            </Button>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden bg-secondary/30 pt-16 md:pt-24 pb-20 md:pb-32">
          {/* Decorative background blob */}
          <div className="absolute top-0 right-0 -translate-y-12 translate-x-1/3 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 translate-y-1/3 -translate-x-1/3 w-[500px] h-[500px] bg-accent/5 rounded-full blur-3xl" />
          
          <div className="container mx-auto px-4 relative z-10 text-center max-w-4xl">
            <Badge variant="secondary" className="mb-6 bg-accent/15 text-accent-foreground hover:bg-accent/20 border-accent/20 px-3 py-1 text-sm font-medium">
              <Heart className="w-3.5 h-3.5 mr-1.5 inline-block fill-accent text-accent" />
              Built for families, designed for your budget
            </Badge>
            
            <h2 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6 text-foreground leading-tight">
              Stretch your SNAP dollars. <br className="hidden md:block" />
              <span className="text-primary">Nourish your family.</span>
            </h2>
            
            <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
              Plan healthy meals around what&apos;s already in your pantry. We help you create 7-day meal plans and smart grocery lists that fit your budget and save you time.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button size="lg" className="w-full sm:w-auto text-base h-14 px-8 shadow-md" asChild>
                <Link href="/onboarding">
                  Start Planning
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="w-full sm:w-auto text-base h-14 px-8 bg-background" asChild>
                <Link href="/onboarding">Try as Guest</Link>
              </Button>
            </div>
            
            <div className="mt-12 text-sm text-muted-foreground flex items-center justify-center gap-2">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-primary" /> Free to use
              </span>
              <span className="mx-2 text-border">•</span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-accent" /> No sign-up required to try
              </span>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="container mx-auto px-4 py-20 max-w-6xl">
          <div className="text-center mb-16">
            <h3 className="text-3xl font-bold text-foreground mb-4">How NourishMe Works</h3>
            <p className="text-muted-foreground max-w-xl mx-auto text-lg">
              Three simple steps to take the stress out of feeding your family on a budget.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Card className="border-border shadow-sm hover:shadow-md transition-shadow duration-200">
              <CardHeader className="pb-4">
                <div className="bg-primary/10 w-12 h-12 rounded-xl flex items-center justify-center mb-4">
                  <Wallet className="w-6 h-6 text-primary" />
                </div>
                <CardTitle className="text-xl">1. Set Your Budget</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed">
                  Enter your remaining SNAP balance or weekly budget. We&apos;ll make sure your customized meal plan never exceeds what you can afford.
                </p>
              </CardContent>
            </Card>

            <Card className="border-border shadow-sm hover:shadow-md transition-shadow duration-200 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 rounded-bl-full -z-10" />
              <CardHeader className="pb-4 relative z-10">
                <div className="bg-accent/15 w-12 h-12 rounded-xl flex items-center justify-center mb-4">
                  <ClipboardList className="w-6 h-6 text-accent-foreground" />
                </div>
                <CardTitle className="text-xl">2. Check Your Pantry</CardTitle>
              </CardHeader>
              <CardContent className="relative z-10">
                <p className="text-muted-foreground leading-relaxed">
                  Tell us what staples you already have at home—like rice, beans, or pasta. We prioritize these items to reduce waste and lower your grocery bill.
                </p>
              </CardContent>
            </Card>

            <Card className="border-border shadow-sm hover:shadow-md transition-shadow duration-200">
              <CardHeader className="pb-4">
                <div className="bg-primary/10 w-12 h-12 rounded-xl flex items-center justify-center mb-4">
                  <Leaf className="w-6 h-6 text-primary" />
                </div>
                <CardTitle className="text-xl">3. Get Your Plan</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed">
                  Receive a complete 7-day meal plan with easy recipes and a smart grocery list that exactly matches your local store&apos;s estimated prices.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* CTA Section */}
        <section className="bg-primary/5 py-20 border-y border-primary/10">
          <div className="container mx-auto px-4 text-center max-w-3xl">
            <h3 className="text-2xl md:text-3xl font-bold mb-6">Ready to make mealtime easier?</h3>
            <p className="text-muted-foreground mb-8 text-lg">
              Join families who are saving money and eating better with NourishMe.
            </p>
            <Button size="lg" className="h-14 px-8 text-base shadow-sm" asChild>
              <Link href="/onboarding">Create Your First Plan</Link>
            </Button>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-secondary/20 py-10 mt-auto border-t">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2 opacity-80">
              <Leaf className="w-5 h-5 text-primary" />
              <span className="font-bold text-foreground tracking-tight">NourishMe</span>
            </div>
            
            <p className="text-sm text-muted-foreground text-center max-w-md">
              NourishMe provides coaching support and is not medical advice. 
              Consult healthcare providers for specific dietary needs.
            </p>
            
            <div className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} NourishMe
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
