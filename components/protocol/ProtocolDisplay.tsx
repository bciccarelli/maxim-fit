'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScheduleView } from './ScheduleView';
import { DietPlanView } from './DietPlanView';
import { SupplementView } from './SupplementView';
import { TrainingView } from './TrainingView';
import { VerifyBanner } from './VerifyBanner';
import type { DailyProtocol, ScheduleVariant, DietPlan, SupplementationPlan, TrainingProgram } from '@/lib/schemas/protocol';

interface ProtocolDisplayProps {
  protocol: DailyProtocol;
  protocolId?: string;
  editable?: boolean;
  verified?: boolean;
  onProtocolChange?: (protocol: DailyProtocol) => void;
  onVerify?: () => Promise<void>;
  onMealsGenerated?: (newId: string) => void;
}

export function ProtocolDisplay({ protocol, protocolId, editable = false, verified = true, onProtocolChange, onVerify, onMealsGenerated }: ProtocolDisplayProps) {
  const handleSchedulesChange = (schedules: ScheduleVariant[]) => {
    onProtocolChange?.({ ...protocol, schedules });
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

  return (
    <div className="space-y-8">
      {/* Wellness Disclaimer */}
      <p className="text-xs text-muted-foreground border-l-2 border-l-muted pl-3 py-1">
        This is a general wellness protocol, not medical advice. Consult healthcare professionals before starting any new regimen.
      </p>

      {/* Verify Banner */}
      {!verified && onVerify && (
        <VerifyBanner onVerify={onVerify} />
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
          <ScheduleView schedules={protocol.schedules} editable={editable} onChange={handleSchedulesChange} />
        </TabsContent>
        <TabsContent value="diet">
          <DietPlanView
            diet={protocol.diet}
            editable={editable}
            onChange={handleDietChange}
            protocolId={protocolId}
            onMealsGenerated={onMealsGenerated}
          />
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
