export function CredibilityStrip() {
  const stats = [
    { value: '4', label: 'Protocol pillars' },
    { value: '24', label: 'Hours planned' },
    { value: 'AI', label: 'Powered research' },
    { value: '100%', label: 'Customizable' },
  ];

  return (
    <section className="border-y bg-muted/30">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-wrap justify-center gap-12 md:gap-20">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="font-mono text-3xl font-semibold">{stat.value}</p>
              <p className="text-xs text-muted-foreground uppercase tracking-widest mt-1">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
