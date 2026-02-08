import { Check, Smartphone } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { PhoneMockup } from './PhoneMockup';

interface MobileAppSectionProps {
  testFlightUrl?: string;
}

export function MobileAppSection({
  testFlightUrl = 'https://testflight.apple.com/join/PNvnFMjp'
}: MobileAppSectionProps) {
  return (
    <section className="border-t bg-muted/30">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-8 items-center">
          {/* Text content */}
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-primary mb-3">
              Mobile app
            </p>
            <h2 className="text-lg font-semibold tracking-tight mb-3">
              Your protocol, in your pocket
            </h2>
            <p className="text-sm text-muted-foreground mb-6">
              Check your schedule, track your meals, and get reminders throughout
              the day. The Maxim mobile app syncs with your web protocol.
            </p>

            {/* App features list */}
            <ul className="space-y-2 mb-6">
              <li className="flex items-start gap-2 text-sm">
                <Check className="h-4 w-4 text-success mt-0.5 shrink-0" />
                <span>Daily protocol notifications</span>
              </li>
              <li className="flex items-start gap-2 text-sm">
                <Check className="h-4 w-4 text-success mt-0.5 shrink-0" />
                <span>Offline access to your schedule</span>
              </li>
              <li className="flex items-start gap-2 text-sm">
                <Check className="h-4 w-4 text-success mt-0.5 shrink-0" />
                <span>AI modifications on the go</span>
              </li>
            </ul>

            {/* CTA - TestFlight/Coming Soon */}
            <div className="flex flex-col sm:flex-row gap-3">
              <a
                href={`https://testflight.apple.com/join/${testFlightUrl}`}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonVariants({ variant: 'outline' })}
              >
                <Smartphone className="h-4 w-4 mr-2" />
                Join iOS TestFlight
              </a>
              <Button variant="ghost" disabled>
                Android coming soon
              </Button>
            </div>
          </div>

          {/* Phone mockup */}
          <PhoneMockup />
        </div>
      </div>
    </section>
  );
}
