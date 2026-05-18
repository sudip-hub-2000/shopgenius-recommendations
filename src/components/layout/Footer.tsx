export function Footer() {
  return (
    <footer className="mt-20 border-t border-border/40 py-10 text-sm text-muted-foreground">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <p>
            <span className="text-gradient font-bold">TechNova</span> — Personalized shopping, reimagined.
          </p>
          <p>© {new Date().getFullYear()} TechNova. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
