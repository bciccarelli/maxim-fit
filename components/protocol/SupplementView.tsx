'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Pill } from 'lucide-react';
import type { SupplementationPlan } from '@/lib/schemas/protocol';

interface SupplementViewProps {
  supplementation: SupplementationPlan;
}

export function SupplementView({ supplementation }: SupplementViewProps) {
  return (
    <Card className="border-l-2 border-l-primary">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Pill className="h-5 w-5" />
          Supplementation
        </CardTitle>
      </CardHeader>
      <CardContent>
        {supplementation.supplements.length === 0 ? (
          <p className="text-sm text-muted-foreground">No supplements recommended.</p>
        ) : (
          <div className="divide-y divide-border">
            {supplementation.supplements.map((supplement, index) => (
              <div key={index} className="py-3">
                <div className="flex items-start justify-between mb-1">
                  <div>
                    <p className="font-medium text-sm">{supplement.name}</p>
                    <p className="font-mono text-sm text-primary">{supplement.dosage}</p>
                  </div>
                  <span className="font-mono text-xs text-muted-foreground">{supplement.timing}</span>
                </div>
                <p className="text-sm text-muted-foreground">{supplement.purpose}</p>
                {supplement.notes && (
                  <p className="mt-1 text-xs text-muted-foreground italic">{supplement.notes}</p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* General Notes */}
        {supplementation.general_notes.length > 0 && (
          <div className="mt-6 border-t pt-4">
            <h4 className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-2">Notes</h4>
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
