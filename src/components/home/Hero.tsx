import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";

export function Hero() {
  return (
    <section className="relative overflow-hidden rounded-3xl border border-border/40 bg-gradient-card p-8 sm:p-12 lg:p-16 shadow-elegant">
      <div className="absolute -top-20 -right-20 h-80 w-80 rounded-full bg-primary/30 blur-3xl" />
      <div className="absolute -bottom-20 -left-20 h-80 w-80 rounded-full bg-violet/20 blur-3xl" />
      <div className="relative max-w-2xl">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full glass px-3 py-1 text-xs">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          <span>AI-powered recommendations</span>
        </div>
        <h1 className="text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl">
          Discover products <span className="text-gradient">made for you</span>
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Shop smarter with personalized picks across electronics, fashion, home, and more.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link to="/search" search={{ q: "" }}>
            <Button size="lg" className="bg-gradient-violet text-white shadow-glow hover:opacity-90">
              Shop now <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
          <Link to="/category/$slug" params={{ slug: "electronics" }}>
            <Button size="lg" variant="outline" className="border-primary/40">
              Browse Electronics
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
