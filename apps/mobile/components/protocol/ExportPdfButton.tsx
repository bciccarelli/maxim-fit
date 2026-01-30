import { useState } from 'react';
import { Pressable, ActivityIndicator, Alert, StyleSheet } from 'react-native';
import * as Sharing from 'expo-sharing';
import { FileDown } from 'lucide-react-native';
import type { DailyProtocol } from '@protocol/shared/schemas';
import { generateProtocolPdf, type ProtocolMetadata } from '@/lib/pdf/generateProtocolPdf';

interface ExportPdfButtonProps {
  protocol: DailyProtocol;
  name: string | null;
  scores: {
    weighted_goal_score: number | null;
    viability_score: number | null;
  };
  verified: boolean;
}

export function ExportPdfButton({
  protocol,
  name,
  scores,
  verified,
}: ExportPdfButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    if (isExporting) return;

    setIsExporting(true);

    try {
      const metadata: ProtocolMetadata = {
        name,
        weighted_goal_score: scores.weighted_goal_score,
        viability_score: scores.viability_score,
        verified,
      };

      const fileUri = await generateProtocolPdf(protocol, metadata);

      const isSharingAvailable = await Sharing.isAvailableAsync();

      if (isSharingAvailable) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Export Protocol',
          UTI: 'com.adobe.pdf',
        });
      } else {
        Alert.alert(
          'Export Complete',
          `PDF saved to: ${fileUri}`,
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('PDF export error:', error);
      Alert.alert(
        'Export Failed',
        'Unable to generate PDF. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Pressable
      style={styles.button}
      onPress={handleExport}
      disabled={isExporting}
    >
      {isExporting ? (
        <ActivityIndicator size="small" color="#fff" />
      ) : (
        <FileDown size={22} color="#fff" />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    padding: 8,
  },
});
