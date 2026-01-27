'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Shield, Wand2, MessageCircleQuestion, Loader2 } from 'lucide-react';
import { ModifyModal } from './ModifyModal';
import { AskModal } from './AskModal';
import type { DailyProtocol, VerificationResult } from '@/lib/schemas/protocol';

interface ProtocolActionsProps {
  protocolId: string;
  protocol: DailyProtocol;
  verified: boolean;
  versionChainId: string;
  onVerify: () => Promise<void>;
  onModificationAccepted: (newId: string) => void;
}

export function ProtocolActions({
  protocolId,
  protocol,
  verified,
  versionChainId,
  onVerify,
  onModificationAccepted,
}: ProtocolActionsProps) {
  const [verifying, setVerifying] = useState(false);
  const [modifyOpen, setModifyOpen] = useState(false);
  const [askOpen, setAskOpen] = useState(false);
  const [modifyPrefilledMessage, setModifyPrefilledMessage] = useState<string | undefined>();

  const handleVerify = async () => {
    setVerifying(true);
    try {
      await onVerify();
    } finally {
      setVerifying(false);
    }
  };

  const handleExportToModify = (context: string) => {
    setAskOpen(false);
    setModifyPrefilledMessage(context);
    setModifyOpen(true);
  };

  const handleModifyOpenChange = (open: boolean) => {
    setModifyOpen(open);
    if (!open) {
      setModifyPrefilledMessage(undefined);
    }
  };

  return (
    <>
      <div className="flex items-center gap-2">
        {!verified && (
          <Button onClick={handleVerify} disabled={verifying}>
            {verifying ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Verifying...
              </>
            ) : (
              <>
                <Shield className="h-4 w-4 mr-2" />
                Verify
              </>
            )}
          </Button>
        )}
        <Button onClick={() => setModifyOpen(true)}>
          <Wand2 className="h-4 w-4 mr-2" />
          Modify
        </Button>
        <Button variant="outline" onClick={() => setAskOpen(true)}>
          <MessageCircleQuestion className="h-4 w-4 mr-2" />
          Ask
        </Button>
      </div>

      <ModifyModal
        open={modifyOpen}
        onOpenChange={handleModifyOpenChange}
        protocolId={protocolId}
        onAccepted={onModificationAccepted}
        initialMessage={modifyPrefilledMessage}
      />

      <AskModal
        open={askOpen}
        onOpenChange={setAskOpen}
        protocolId={protocolId}
        versionChainId={versionChainId}
        onExportToModify={handleExportToModify}
      />
    </>
  );
}
