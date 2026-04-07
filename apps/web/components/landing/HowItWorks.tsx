export function HowItWorks() {
  const steps = [
    {
      number: 1,
      title: 'Set your goals',
      description:
        'Choose what matters: muscle gain, longevity, fat loss. Our engine prioritizes your primary outcomes.',
    },
    {
      number: 2,
      title: 'Add requirements',
      description:
        'Hard constraints: work hours, sleep needs, dietary requirements, and available equipment.',
    },
    {
      number: 3,
      title: 'Generate',
      description:
        'AI creates your complete daily protocol in seconds, fully integrated and ready to execute.',
    },
  ];

  return (
    <section className="border-t">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-2 text-center">
            How it works
          </p>
          <h2 className="text-lg font-semibold tracking-tight mb-12 text-center">
            Three minutes to your protocol
          </h2>

          <div className="relative grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Connecting line (desktop only) */}
            <div className="hidden md:block absolute top-5 left-[calc(16.67%+20px)] right-[calc(16.67%+20px)] h-px bg-border" />

            {steps.map((step) => (
              <div key={step.number} className="relative text-center">
                <div className="relative z-10 w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-mono text-lg font-semibold mx-auto mb-4">
                  {step.number}
                </div>
                <h3 className="text-sm font-semibold mb-2">{step.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed max-w-[200px] mx-auto">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
