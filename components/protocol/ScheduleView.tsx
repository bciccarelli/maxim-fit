'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, Sun, Moon } from 'lucide-react';
import type { DailySchedule } from '@/lib/schemas/protocol';

interface ScheduleViewProps {
  schedule: DailySchedule;
}

export function ScheduleView({ schedule }: ScheduleViewProps) {
  return (
    <Card className="border-l-2 border-l-primary">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Daily schedule
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4 mb-6 text-sm">
          <div className="flex items-center gap-2">
            <Sun className="h-4 w-4 text-warning" />
            <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Wake</span>
            <span className="font-mono text-sm">{schedule.wake_time}</span>
          </div>
          <div className="flex items-center gap-2">
            <Moon className="h-4 w-4 text-info" />
            <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Sleep</span>
            <span className="font-mono text-sm">{schedule.sleep_time}</span>
          </div>
        </div>

        <div className="relative">
          {/* Timeline */}
          <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />

          <div className="space-y-1">
            {schedule.schedule.map((block, index) => (
              <div key={index} className="relative pl-10">
                {/* Timeline dot */}
                <div className="absolute left-2.5 top-3.5 w-3 h-3 rounded-full bg-primary" />

                <div className="p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors duration-150">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-sm">{block.activity}</p>
                      {block.requirement_satisfied && (
                        <p className="text-xs text-success mt-0.5">
                          Satisfies: {block.requirement_satisfied}
                        </p>
                      )}
                    </div>
                    <span className="font-mono text-sm text-muted-foreground whitespace-nowrap tabular-nums">
                      {block.start_time} – {block.end_time}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
