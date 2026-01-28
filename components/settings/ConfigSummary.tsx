'use client';

import type { PersonalInfo, Goal } from '@/lib/schemas/user-config';

interface ConfigSummaryProps {
  personalInfo: PersonalInfo;
  goals: Goal[];
  requirements: string[];
}

export function ConfigSummary({ personalInfo, goals, requirements }: ConfigSummaryProps) {
  const formatHeight = (inches: number) => {
    const feet = Math.floor(inches / 12);
    const remainingInches = inches % 12;
    return `${feet}'${remainingInches}"`;
  };

  return (
    <div className="space-y-6">
      {/* Personal Info */}
      <div>
        <h4 className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-3">
          Personal Info
        </h4>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <span className="text-xs text-muted-foreground">Age</span>
            <p className="font-mono text-sm">{personalInfo.age}</p>
          </div>
          <div>
            <span className="text-xs text-muted-foreground">Sex</span>
            <p className="text-sm capitalize">{personalInfo.sex}</p>
          </div>
          <div>
            <span className="text-xs text-muted-foreground">Weight</span>
            <p className="font-mono text-sm">
              {personalInfo.weight_lbs}
              <span className="text-xs text-muted-foreground ml-0.5">lbs</span>
            </p>
          </div>
          <div>
            <span className="text-xs text-muted-foreground">Height</span>
            <p className="font-mono text-sm">{formatHeight(personalInfo.height_in)}</p>
          </div>
          <div>
            <span className="text-xs text-muted-foreground">Fitness Level</span>
            <p className="text-sm capitalize">{personalInfo.fitness_level}</p>
          </div>
        </div>

        {personalInfo.dietary_restrictions.length > 0 && (
          <div className="mt-3">
            <span className="text-xs text-muted-foreground">Dietary Restrictions</span>
            <p className="text-sm">{personalInfo.dietary_restrictions.join(', ')}</p>
          </div>
        )}

        {personalInfo.lifestyle_considerations.length > 0 && (
          <div className="mt-3">
            <span className="text-xs text-muted-foreground">Lifestyle</span>
            <p className="text-sm">{personalInfo.lifestyle_considerations.join(', ')}</p>
          </div>
        )}
      </div>

      {/* Goals */}
      <div>
        <h4 className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-3">
          Goals
        </h4>
        <div className="space-y-2">
          {goals.map((goal, index) => (
            <div key={index} className="flex items-center gap-3">
              <div className="flex-1">
                <p className="text-sm font-medium">{goal.name}</p>
                {goal.description && (
                  <p className="text-xs text-muted-foreground">{goal.description}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full"
                    style={{ width: `${goal.weight * 100}%` }}
                  />
                </div>
                <span className="font-mono text-xs text-muted-foreground w-8 text-right">
                  {Math.round(goal.weight * 100)}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Requirements */}
      <div>
        <h4 className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-3">
          Requirements
        </h4>
        {requirements.length > 0 ? (
          <ul className="space-y-1.5">
            {requirements.map((req, index) => (
              <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                <span>{req}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">No requirements set</p>
        )}
      </div>
    </div>
  );
}
