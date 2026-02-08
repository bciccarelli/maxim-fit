export function HeroDataPreview() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-lg mx-auto">
      <div className="border-l-2 border-l-primary pl-3 py-2 text-left">
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
          Wake
        </p>
        <p className="font-mono text-sm">06:30</p>
      </div>
      <div className="border-l-2 border-l-primary pl-3 py-2 text-left">
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
          Protein
        </p>
        <p className="font-mono text-sm">
          185<span className="text-xs text-muted-foreground ml-0.5">g</span>
        </p>
      </div>
      <div className="border-l-2 border-l-primary pl-3 py-2 text-left">
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
          Training
        </p>
        <p className="font-mono text-sm">
          45<span className="text-xs text-muted-foreground ml-0.5">min</span>
        </p>
      </div>
      <div className="border-l-2 border-l-primary pl-3 py-2 text-left">
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
          Score
        </p>
        <p className="font-mono text-sm text-primary">8.7</p>
      </div>
    </div>
  );
}
