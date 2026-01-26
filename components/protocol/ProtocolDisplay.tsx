'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScheduleView } from './ScheduleView';
import { DietPlanView } from './DietPlanView';
import { SupplementView } from './SupplementView';
import { TrainingView } from './TrainingView';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import type { DailyProtocol, AdherenceScore, GoalScore, Critique } from '@/lib/schemas/protocol';

interface ProtocolDisplayProps {
  protocol: DailyProtocol;
  scores?: {
    requirement_scores?: AdherenceScore[];
    goal_scores?: GoalScore[];
    critiques?: Critique[];
    requirements_met?: boolean;
    weighted_goal_score?: number;
    viability_score?: number;
  };
}

export function ProtocolDisplay({ protocol, scores }: ProtocolDisplayProps) {
  return (
    <div className="space-y-8">
      {/* Scores Summary */}
      {scores && (
        <Card>
          <CardHeader>
            <CardTitle>Protocol evaluation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
              <div className="p-4 rounded-lg bg-muted text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  {scores.requirements_met ? (
                    <CheckCircle className="h-5 w-5 text-success" />
                  ) : (
                    <XCircle className="h-5 w-5 text-destructive" />
                  )}
                  <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Requirements</span>
                </div>
                <p className="text-sm">
                  {scores.requirements_met ? 'All met' : 'Some unmet'}
                </p>
              </div>
              <div className="p-4 rounded-lg bg-muted text-center">
                <p className="font-mono text-2xl font-semibold tabular-nums">
                  {scores.weighted_goal_score?.toFixed(1) ?? 'N/A'}
                </p>
                <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mt-1">Goal score</p>
              </div>
              <div className="p-4 rounded-lg bg-muted text-center">
                <p className="font-mono text-2xl font-semibold tabular-nums">
                  {scores.viability_score?.toFixed(1) ?? 'N/A'}
                </p>
                <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mt-1">Viability score</p>
              </div>
            </div>

            {/* Critiques */}
            {scores.critiques && scores.critiques.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-xs font-medium uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-warning" />
                  Areas for improvement
                </h4>
                <div className="space-y-2">
                  {scores.critiques.slice(0, 3).map((critique, i) => (
                    <div key={i} className={`border-l-2 pl-4 py-2 text-sm ${
                      critique.severity === 'major' ? 'border-l-destructive' :
                      critique.severity === 'moderate' ? 'border-l-warning' :
                      'border-l-border'
                    }`}>
                      <div className="flex items-start gap-2">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium font-mono ${
                          critique.severity === 'major' ? 'bg-destructive/15 text-destructive' :
                          critique.severity === 'moderate' ? 'bg-warning/15 text-warning' :
                          'bg-muted text-muted-foreground'
                        }`}>
                          {critique.severity}
                        </span>
                        <span className="text-muted-foreground">{critique.category}</span>
                      </div>
                      <p className="mt-1">{critique.criticism}</p>
                      <p className="mt-1 text-muted-foreground italic">Suggestion: {critique.suggestion}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Protocol Content */}
      <Tabs defaultValue="schedule" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="schedule">Schedule</TabsTrigger>
          <TabsTrigger value="diet">Diet</TabsTrigger>
          <TabsTrigger value="supplements">Supplements</TabsTrigger>
          <TabsTrigger value="training">Training</TabsTrigger>
        </TabsList>
        <TabsContent value="schedule">
          <ScheduleView schedule={protocol.schedule} />
        </TabsContent>
        <TabsContent value="diet">
          <DietPlanView diet={protocol.diet} />
        </TabsContent>
        <TabsContent value="supplements">
          <SupplementView supplementation={protocol.supplementation} />
        </TabsContent>
        <TabsContent value="training">
          <TrainingView training={protocol.training} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
