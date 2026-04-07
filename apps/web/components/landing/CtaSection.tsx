import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';
import { PhoneMockup } from './PhoneMockup';

export function CtaSection() {
  return (
    <section className="border-t">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-5xl mx-auto">
          <div className="relative rounded-lg border bg-card/80 p-8 md:p-12 overflow-hidden">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              {/* Text */}
              <div>
                <p className="text-xs font-medium uppercase tracking-widest text-primary mb-3">
                  Ready to start
                </p>
                <h2 className="text-lg font-semibold tracking-tight mb-3">
                  Built for those who demand precision
                </h2>
                <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
                  Maxim Fit doesn&apos;t offer &ldquo;tips.&rdquo; It generates an
                  executable technical document for your life. Every hour
                  accounted for, every gram calculated.
                </p>
                <Link
                  href="/signup"
                  className={buttonVariants({ size: 'default' })}
                >
                  Start Protocol
                </Link>
              </div>

              {/* Phone mockup */}
              <div className="hidden md:block">
                <PhoneMockup />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
