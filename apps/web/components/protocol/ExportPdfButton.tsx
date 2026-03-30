'use client';

import { useCallback } from 'react';
import { FileDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { generateProtocolHtml, type ProtocolMetadata } from '@/lib/pdf/generateProtocolHtml';
import type { DailyProtocol } from '@protocol/shared/schemas/protocol';

interface ExportPdfButtonProps {
  protocol: DailyProtocol;
  metadata: ProtocolMetadata;
}

export function ExportPdfButton({ protocol, metadata }: ExportPdfButtonProps) {
  const handleExport = useCallback(() => {
    const html = generateProtocolHtml(protocol, metadata);

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);

    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) {
      document.body.removeChild(iframe);
      return;
    }

    doc.open();
    doc.write(html);
    doc.close();

    // Wait for content to render, then print
    setTimeout(() => {
      iframe.contentWindow?.print();
      // Cleanup after print dialog closes
      setTimeout(() => {
        document.body.removeChild(iframe);
      }, 1000);
    }, 250);
  }, [protocol, metadata]);

  return (
    <Button variant="outline" size="sm" onClick={handleExport}>
      <FileDown className="h-4 w-4 mr-2" />
      Export
    </Button>
  );
}
