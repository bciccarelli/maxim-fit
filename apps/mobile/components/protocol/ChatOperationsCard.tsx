import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { useState, useCallback } from 'react';
import { Pencil, Trash2, PlusCircle, Check, X } from 'lucide-react-native';
import { useProtocol } from '@/contexts/ProtocolContext';
import { apiUrl, getAuthHeaders } from '@/lib/api';
import { getElementNameById } from '@protocol/shared';
import type { ProtocolOperation } from '@protocol/shared';
import type { DailyProtocol } from '@protocol/shared/schemas/protocol';

type Props = {
  operations: ProtocolOperation[];
  protocolId: string;
  protocol: DailyProtocol;
  onApplied: () => void;
};

function OperationIcon({ op }: { op: string }) {
  switch (op) {
    case 'modify':
      return <Pencil size={14} color="#2d5a2d" />;
    case 'delete':
      return <Trash2 size={14} color="#c62828" />;
    case 'create':
      return <PlusCircle size={14} color="#2d5a2d" />;
    default:
      return null;
  }
}

function getOperationLabel(op: ProtocolOperation, protocol: DailyProtocol): string {
  const typeName = op.elementType.replace('_', ' ');

  if (op.op === 'create') {
    const data = op.data as Record<string, unknown>;
    const dataName = data.name || data.activity || '';
    return dataName ? `Add ${dataName}` : `Add new ${typeName}`;
  }

  const name = getElementNameById(protocol, op.elementId) || typeName;

  if (op.op === 'delete') {
    return `Remove ${name}`;
  }

  // modify
  const fieldKeys = Object.keys(op.fields);
  if (fieldKeys.length > 0 && fieldKeys.length <= 2) {
    return `Update ${name} (${fieldKeys.join(', ')})`;
  }
  return `Update ${name}`;
}

export function ChatOperationsCard({ operations, protocolId, protocol, onApplied }: Props) {
  const { refreshVersions, refreshChains } = useProtocol();
  const [status, setStatus] = useState<'idle' | 'applying' | 'applied' | 'error'>('idle');
  const [dismissed, setDismissed] = useState(false);

  const handleAccept = useCallback(async () => {
    setStatus('applying');
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(apiUrl('/api/protocol/apply-operations'), {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ protocolId, operations }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to apply');
      }

      setStatus('applied');
      await refreshVersions();
      await refreshChains();
      onApplied();
    } catch (err) {
      console.error('Error applying operations:', err);
      setStatus('error');
    }
  }, [protocolId, operations, refreshVersions, refreshChains, onApplied]);

  if (dismissed) return null;

  if (status === 'applied') {
    return (
      <View style={[styles.card, styles.cardApplied]}>
        <View style={styles.appliedHeader}>
          <Check size={16} color="#2d5a2d" />
          <Text style={styles.appliedText}>Changes applied</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>Suggested changes</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{operations.length}</Text>
        </View>
      </View>

      <View style={styles.operationsList}>
        {operations.map((op, index) => (
          <View key={index} style={styles.operationRow}>
            <OperationIcon op={op.op} />
            <View style={styles.operationContent}>
              <Text style={styles.operationLabel} numberOfLines={1}>
                {getOperationLabel(op, protocol)}
              </Text>
              {op.reason ? (
                <Text style={styles.operationReason} numberOfLines={2}>
                  {op.reason}
                </Text>
              ) : null}
            </View>
          </View>
        ))}
      </View>

      {status === 'error' && (
        <Text style={styles.errorText}>Failed to apply. Try again.</Text>
      )}

      <View style={styles.actions}>
        <Pressable
          style={styles.acceptButton}
          onPress={handleAccept}
          disabled={status === 'applying'}
        >
          {status === 'applying' ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.acceptButtonText}>Accept all</Text>
          )}
        </Pressable>
        <Pressable
          style={styles.dismissButton}
          onPress={() => setDismissed(true)}
          disabled={status === 'applying'}
        >
          <Text style={styles.dismissButtonText}>Dismiss</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#2d5a2d',
    padding: 12,
    marginTop: 8,
  },
  cardApplied: {
    borderLeftColor: '#4caf50',
    opacity: 0.7,
  },
  appliedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  appliedText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#2d5a2d',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  title: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1a2e1a',
  },
  badge: {
    backgroundColor: '#e8f5e9',
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 1,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#2d5a2d',
  },
  operationsList: {
    gap: 8,
    marginBottom: 12,
  },
  operationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingTop: 2,
  },
  operationContent: {
    flex: 1,
  },
  operationLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#333',
  },
  operationReason: {
    fontSize: 12,
    color: '#666',
    marginTop: 1,
  },
  errorText: {
    fontSize: 12,
    color: '#c62828',
    marginBottom: 8,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  acceptButton: {
    backgroundColor: '#2d5a2d',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 100,
  },
  acceptButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  dismissButton: {
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dismissButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#666',
  },
});
