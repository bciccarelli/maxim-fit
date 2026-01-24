'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, Sun, Moon } from 'lucide-react';
import type { DailySchedule } from '@/lib/schemas/protocol';

interface ScheduleViewProps {
  schedule: DailySchedule;
}

export function ScheduleView({ schedule }: ScheduleViewProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Daily Schedule
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4 mb-6 text-sm">
          <div className="flex items-center gap-2">
            <Sun className="h-4 w-4 text-yellow-500" />
            <span>Wake: {schedule.wake_time}</span>
          </div>
          <div className="flex items-center gap-2">
            <Moon className="h-4 w-4 text-blue-500" />
            <span>Sleep: {schedule.sleep_time}</span>
          </div>
        </div>

        <div className="relative">
          {/* Timeline */}
          <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-muted" />

          <div className="space-y-4">
            {schedule.schedule.map((block, index) => (
              <div key={index} className="relative pl-10">
                {/* Timeline dot */}
                <div className="absolute left-2.5 top-1.5 w-3 h-3 rounded-full bg-primary" />

                <div className="p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium">{block.activity}</p>
                      {block.requirement_satisfied && (
                        <p className="text-xs text-green-600 mt-1">
                          Satisfies: {block.requirement_satisfied}
                        </p>
                      )}
                    </div>
                    <span className="text-sm text-muted-foreground whitespace-nowrap">
                      {block.start_time} - {block.end_time}
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
