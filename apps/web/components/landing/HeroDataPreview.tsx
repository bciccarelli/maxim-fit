export function HeroDataPreview() {
  const items = [
    { label: 'Wake', value: '06:30' },
    { label: 'Protein', value: '185', unit: 'g' },
    { label: 'Training', value: '45', unit: 'min' },
    { label: 'Score', value: '8.7', highlight: true },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-2xl mx-auto">
      {items.map((item) => (
        <div
          key={item.label}
          className="border-l-2 border-l-primary pl-4 py-3 bg-card/50 rounded-r-lg"
        >
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-1">
            {item.label}
          </p>
          <p className={`font-mono text-2xl font-semibold ${item.highlight ? 'text-primary' : ''}`}>
            {item.value}
            {item.unit && (
              <span className="font-mono text-xs text-muted-foreground ml-0.5">
                {item.unit}
              </span>
            )}
          </p>
        </div>
      ))}
    </div>
  );
}
