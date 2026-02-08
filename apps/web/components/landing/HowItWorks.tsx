export function HowItWorks() {
  const steps = [
    {
      number: 1,
      title: 'Set your goals',
      description: 'Weight the goals that matter most to you.'
    },
    {
      number: 2,
      title: 'Add requirements',
      description: 'Your constraints: work hours, dietary needs, equipment.'
    },
    {
      number: 3,
      title: 'Generate',
      description: 'AI creates a scored, verifiable daily protocol.'
    }
  ];

  return (
    <section className="border-t">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-2 text-center">
            How it works
          </p>
          <h2 className="text-lg font-semibold tracking-tight mb-8 text-center">
            Three minutes to your protocol
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {steps.map((step) => (
              <div key={step.number} className="text-center">
                <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-mono text-lg font-semibold mx-auto mb-3">
                  {step.number}
                </div>
                <h3 className="text-sm font-semibold mb-1">{step.title}</h3>
                <p className="text-xs text-muted-foreground">
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
