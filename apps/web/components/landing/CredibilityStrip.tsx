export function CredibilityStrip() {
  return (
    <section className="border-y bg-muted/50">
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-wrap justify-center gap-8 md:gap-16">
          <div className="text-center">
            <p className="font-mono text-2xl font-semibold">4</p>
            <p className="text-xs text-muted-foreground uppercase tracking-widest">
              Protocol pillars
            </p>
          </div>
          <div className="text-center">
            <p className="font-mono text-2xl font-semibold">24</p>
            <p className="text-xs text-muted-foreground uppercase tracking-widest">
              Hours planned
            </p>
          </div>
          <div className="text-center">
            <p className="font-mono text-2xl font-semibold">AI</p>
            <p className="text-xs text-muted-foreground uppercase tracking-widest">
              Powered research
            </p>
          </div>
          <div className="text-center">
            <p className="font-mono text-2xl font-semibold">100%</p>
            <p className="text-xs text-muted-foreground uppercase tracking-widest">
              Customizable
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
