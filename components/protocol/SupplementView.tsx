'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Pill } from 'lucide-react';
import type { SupplementationPlan } from '@/lib/schemas/protocol';

interface SupplementViewProps {
  supplementation: SupplementationPlan;
}

export function SupplementView({ supplementation }: SupplementViewProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Pill className="h-5 w-5" />
          Supplementation
        </CardTitle>
      </CardHeader>
      <CardContent>
        {supplementation.supplements.length === 0 ? (
          <p className="text-muted-foreground italic">No supplements recommended.</p>
        ) : (
          <div className="space-y-4">
            {supplementation.supplements.map((supplement, index) => (
              <div key={index} className="p-4 rounded-lg border">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-medium">{supplement.name}</p>
                    <p className="text-sm text-primary">{supplement.dosage}</p>
                  </div>
                  <span className="text-sm text-muted-foreground">{supplement.timing}</span>
                </div>
                <p className="text-sm text-muted-foreground">{supplement.purpose}</p>
                {supplement.notes && (
                  <p className="mt-2 text-xs text-muted-foreground italic">{supplement.notes}</p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* General Notes */}
        {supplementation.general_notes.length > 0 && (
          <div className="mt-6 p-4 rounded-lg bg-muted/50">
            <h4 className="font-semibold mb-2">Notes</h4>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
              {supplementation.general_notes.map((note, index) => (
                <li key={index}>{note}</li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
