'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScheduleView } from './ScheduleView';
import { DietPlanView } from './DietPlanView';
import { SupplementView } from './SupplementView';
import { TrainingView } from './TrainingView';
import { VerifyBanner } from './VerifyBanner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, AlertCircle, ShieldOff, Loader2, X, Sparkles } from 'lucide-react';
import type { DailyProtocol, DailySchedule, DietPlan, SupplementationPlan, TrainingProgram, AdherenceScore, GoalScore, Critique } from '@/lib/schemas/protocol';

interface ProtocolDisplayProps {
  protocol: DailyProtocol;
  protocolId?: string;
  scores?: {
    requirement_scores?: AdherenceScore[];
    goal_scores?: GoalScore[];
    critiques?: Critique[];
    requirements_met?: boolean;
    weighted_goal_score?: number;
    viability_score?: number;
  };
  editable?: boolean;
  verified?: boolean;
  onProtocolChange?: (protocol: DailyProtocol) => void;
  onVerify?: () => Promise<void>;
  onCritiquesUpdated?: (critiques: Critique[]) => void;
}

export function ProtocolDisplay({ protocol, protocolId, scores, editable = false, verified = true, onProtocolChange, onVerify, onCritiquesUpdated }: ProtocolDisplayProps) {
  const router = useRouter();
  const [selectedCritiques, setSelectedCritiques] = useState<Set<number>>(new Set());
  const [dismissing, setDismissing] = useState(false);
  const [applying, setApplying] = useState(false);
  const [displayCritiques, setDisplayCritiques] = useState<Critique[] | undefined>(scores?.critiques);

  const critiques = displayCritiques ?? scores?.critiques;

  const handleScheduleChange = (schedule: DailySchedule) => {
    onProtocolChange?.({ ...protocol, schedule });
  };

  const handleDietChange = (diet: DietPlan) => {
    onProtocolChange?.({ ...protocol, diet });
  };

  const handleSupplementChange = (supplementation: SupplementationPlan) => {
    onProtocolChange?.({ ...protocol, supplementation });
  };

  const handleTrainingChange = (training: TrainingProgram) => {
    onProtocolChange?.({ ...protocol, training });
  };

  const toggleCritique = (index: number) => {
    setSelectedCritiques((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const handleDismiss = async () => {
    if (!protocolId || selectedCritiques.size === 0) return;
    setDismissing(true);
    try {
      const response = await fetch('/api/protocol/critiques', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          protocolId,
          critiqueIndices: Array.from(selectedCritiques),
          action: 'dismiss',
        }),
      });
      const data = await response.json();
      if (response.ok) {
        setDisplayCritiques(data.critiques);
        setSelectedCritiques(new Set());
        onCritiquesUpdated?.(data.critiques);
      }
    } catch {
      // silent fail
    } finally {
      setDismissing(false);
    }
  };

  const handleApply = async () => {
    if (!protocolId || selectedCritiques.size === 0) return;
    setApplying(true);
    try {
      const response = await fetch('/api/protocol/critiques', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          protocolId,
          critiqueIndices: Array.from(selectedCritiques),
          action: 'apply',
        }),
      });
      const data = await response.json();
      if (response.ok) {
        setDisplayCritiques(data.critiques);
        setSelectedCritiques(new Set());
        onCritiquesUpdated?.(data.critiques);
        router.refresh();
      }
    } catch {
      // silent fail
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Verify Banner */}
      {!verified && onVerify && (
        <VerifyBanner onVerify={onVerify} />
      )}

      {/* Scores Summary */}
      {scores && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Protocol evaluation
              {!verified && (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-warning/15 text-warning">
                  <ShieldOff className="h-3 w-3" />
                  Unverified
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className={!verified ? 'opacity-60' : ''}>
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

            {/* Critiques with multi-select */}
            {critiques && critiques.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-xs font-medium uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-warning" />
                  Areas for improvement
                </h4>
                <div className="space-y-2">
                  {critiques.map((critique, i) => (
                    <div
                      key={i}
                      className={`border-l-2 pl-4 py-2 text-sm flex gap-3 ${
                        critique.severity === 'major' ? 'border-l-destructive' :
                        critique.severity === 'moderate' ? 'border-l-warning' :
                        'border-l-border'
                      } ${selectedCritiques.has(i) ? 'bg-muted/50 rounded-r-lg' : ''}`}
                    >
                      {protocolId && (
                        <div className="flex-shrink-0 pt-0.5">
                          <input
                            type="checkbox"
                            checked={selectedCritiques.has(i)}
                            onChange={() => toggleCritique(i)}
                            className="h-4 w-4 rounded border-input accent-primary cursor-pointer"
                          />
                        </div>
                      )}
                      <div className="flex-1">
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
                    </div>
                  ))}
                </div>

                {/* Action buttons */}
                {protocolId && selectedCritiques.size > 0 && (
                  <div className="flex items-center gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDismiss}
                      disabled={dismissing || applying}
                    >
                      {dismissing ? (
                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      ) : (
                        <X className="h-4 w-4 mr-1" />
                      )}
                      Dismiss
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleApply}
                      disabled={dismissing || applying}
                    >
                      {applying ? (
                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      ) : (
                        <Sparkles className="h-4 w-4 mr-1" />
                      )}
                      Apply recommendations
                    </Button>
                  </div>
                )}
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
          <ScheduleView schedule={protocol.schedule} editable={editable} onChange={handleScheduleChange} />
        </TabsContent>
        <TabsContent value="diet">
          <DietPlanView diet={protocol.diet} editable={editable} onChange={handleDietChange} />
        </TabsContent>
        <TabsContent value="supplements">
          <SupplementView supplementation={protocol.supplementation} editable={editable} onChange={handleSupplementChange} />
        </TabsContent>
        <TabsContent value="training">
          <TrainingView training={protocol.training} editable={editable} onChange={handleTrainingChange} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
