import { View, Text, StyleSheet, Pressable, TextInput, Modal, ScrollView, Alert } from 'react-native';
import { useState, useEffect, useMemo } from 'react';
import { X, Check, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { colors, spacing, fontSize } from '@/lib/theme';
import type { ProtocolChain } from '@/contexts/ProtocolContext';
import type { ProtocolSchedule } from '@/contexts/ScheduleContext';

interface ScheduleFormSheetProps {
  visible: boolean;
  onClose: () => void;
  onSave: (params: {
    id?: string;
    versionChainId: string;
    startDate: string;
    endDate: string | null;
    label: string | null;
  }) => Promise<void>;
  chains: ProtocolChain[];
  editingSchedule?: ProtocolSchedule | null;
  initialDate?: string | null;
}

function toDateStr(date: Date): string {
  return date.toISOString().split('T')[0];
}

function formatDateDisplay(dateStr: string): string {
  const [y, m, d] = dateStr.split('-');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[parseInt(m) - 1]} ${parseInt(d)}, ${y}`;
}

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

// Inline mini-calendar for date picking
function MiniCalendar({
  selected,
  onSelect,
  minDate,
}: {
  selected: string;
  onSelect: (date: string) => void;
  minDate?: string;
}) {
  const selParts = selected.split('-');
  const [year, setYear] = useState(parseInt(selParts[0]));
  const [month, setMonth] = useState(parseInt(selParts[1]) - 1);

  const weeks = useMemo(() => {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const result: (number | null)[][] = [];
    let week: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) week.push(null);
    for (let day = 1; day <= daysInMonth; day++) {
      week.push(day);
      if (week.length === 7) { result.push(week); week = []; }
    }
    if (week.length > 0) {
      while (week.length < 7) week.push(null);
      result.push(week);
    }
    return result;
  }, [year, month]);

  const prevMonth = () => {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
  };

  return (
    <View style={miniStyles.container}>
      <View style={miniStyles.header}>
        <Pressable onPress={prevMonth} style={miniStyles.nav}>
          <ChevronLeft size={16} color={colors.onSurfaceVariant} />
        </Pressable>
        <Text style={miniStyles.title}>{MONTH_NAMES[month]} {year}</Text>
        <Pressable onPress={nextMonth} style={miniStyles.nav}>
          <ChevronRight size={16} color={colors.onSurfaceVariant} />
        </Pressable>
      </View>
      <View style={miniStyles.row}>
        {DAY_LABELS.map((l, i) => (
          <View key={i} style={miniStyles.cell}>
            <Text style={miniStyles.dayLabel}>{l}</Text>
          </View>
        ))}
      </View>
      {weeks.map((week, wi) => (
        <View key={wi} style={miniStyles.row}>
          {week.map((day, di) => {
            if (day === null) return <View key={di} style={miniStyles.cell} />;
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const isSelected = dateStr === selected;
            const isDisabled = minDate ? dateStr < minDate : false;
            return (
              <Pressable
                key={di}
                style={miniStyles.cell}
                onPress={() => !isDisabled && onSelect(dateStr)}
                disabled={isDisabled}
              >
                <View style={[miniStyles.dayContent, isSelected && miniStyles.daySelected]}>
                  <Text style={[
                    miniStyles.dayText,
                    isSelected && miniStyles.dayTextSelected,
                    isDisabled && miniStyles.dayTextDisabled,
                  ]}>
                    {day}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const miniStyles = StyleSheet.create({
  container: { backgroundColor: colors.surfaceContainerLow, padding: spacing.sm },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.xs },
  nav: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: fontSize.sm, fontWeight: '600', color: colors.onSurface, fontVariant: ['tabular-nums'] },
  row: { flexDirection: 'row' },
  cell: { flex: 1, height: 36, alignItems: 'center', justifyContent: 'center' },
  dayLabel: { fontSize: 10, fontWeight: '500', color: colors.onSurfaceVariant },
  dayContent: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  daySelected: { backgroundColor: colors.primaryContainer },
  dayText: { fontSize: fontSize.xs, color: colors.onSurface, fontVariant: ['tabular-nums'] },
  dayTextSelected: { color: colors.onPrimary, fontWeight: '600' },
  dayTextDisabled: { color: colors.outlineVariant },
});

export function ScheduleFormSheet({
  visible,
  onClose,
  onSave,
  chains,
  editingSchedule,
  initialDate,
}: ScheduleFormSheetProps) {
  const [selectedChainId, setSelectedChainId] = useState<string>('');
  const [startDate, setStartDate] = useState<string>(toDateStr(new Date()));
  const [endDate, setEndDate] = useState<string>(toDateStr(new Date()));
  const [isIndefinite, setIsIndefinite] = useState(true);
  const [label, setLabel] = useState('');
  const [showChainPicker, setShowChainPicker] = useState(false);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Initialize form when opening
  useEffect(() => {
    if (visible) {
      if (editingSchedule) {
        setSelectedChainId(editingSchedule.version_chain_id);
        setStartDate(editingSchedule.start_date);
        if (editingSchedule.end_date) {
          setEndDate(editingSchedule.end_date);
          setIsIndefinite(false);
        } else {
          setEndDate(editingSchedule.start_date);
          setIsIndefinite(true);
        }
        setLabel(editingSchedule.label || '');
      } else {
        setSelectedChainId(chains[0]?.version_chain_id || '');
        const defaultStart = initialDate || toDateStr(new Date());
        setStartDate(defaultStart);
        setEndDate(defaultStart);
        setIsIndefinite(true);
        setLabel('');
      }
      setShowStartPicker(false);
      setShowEndPicker(false);
      setShowChainPicker(false);
    }
  }, [visible, editingSchedule, initialDate]);

  const selectedChain = chains.find(c => c.version_chain_id === selectedChainId);

  const handleSave = async () => {
    if (!selectedChainId) {
      Alert.alert('Error', 'Please select a protocol.');
      return;
    }

    setIsSaving(true);
    try {
      await onSave({
        id: editingSchedule?.id,
        versionChainId: selectedChainId,
        startDate,
        endDate: isIndefinite ? null : endDate,
        label: label.trim() || null,
      });
      onClose();
    } catch (error: any) {
      if (error.message?.includes('overlaps')) {
        Alert.alert('Schedule Conflict', 'This date range overlaps with an existing schedule. Please choose different dates.');
      } else {
        Alert.alert('Error', error.message || 'Failed to save schedule.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={onClose} style={styles.headerButton}>
            <X size={20} color={colors.onSurface} />
          </Pressable>
          <Text style={styles.headerTitle}>
            {editingSchedule ? 'Edit Schedule' : 'Add to Calendar'}
          </Text>
          <Pressable
            onPress={handleSave}
            style={styles.headerButton}
            disabled={isSaving || !selectedChainId}
          >
            <Check size={20} color={isSaving || !selectedChainId ? colors.onSurfaceVariant : colors.primaryContainer} />
          </Pressable>
        </View>

        <ScrollView style={styles.form} contentContainerStyle={styles.formContent}>
          {/* Protocol Picker */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Protocol</Text>
            <Pressable
              style={styles.pickerButton}
              onPress={() => setShowChainPicker(!showChainPicker)}
            >
              <Text style={styles.pickerButtonText} numberOfLines={1}>
                {selectedChain?.name || 'Select protocol'}
              </Text>
              <ChevronDown size={16} color={colors.onSurfaceVariant} />
            </Pressable>
            {showChainPicker && (
              <View style={styles.pickerMenu}>
                {chains.map((chain) => (
                  <Pressable
                    key={chain.id}
                    style={[
                      styles.pickerItem,
                      chain.version_chain_id === selectedChainId && styles.pickerItemSelected,
                    ]}
                    onPress={() => {
                      setSelectedChainId(chain.version_chain_id);
                      setShowChainPicker(false);
                      if (!label.trim()) setLabel(chain.name || '');
                    }}
                  >
                    <Text
                      style={[
                        styles.pickerItemText,
                        chain.version_chain_id === selectedChainId && styles.pickerItemTextSelected,
                      ]}
                      numberOfLines={1}
                    >
                      {chain.name || 'Untitled Protocol'}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}
          </View>

          {/* Label */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Label (optional)</Text>
            <TextInput
              style={styles.textInput}
              value={label}
              onChangeText={setLabel}
              placeholder="e.g., Cutting Phase"
              placeholderTextColor={colors.onSurfaceVariant}
              maxLength={100}
            />
          </View>

          {/* Start Date */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Start Date</Text>
            <Pressable
              style={styles.dateButton}
              onPress={() => { setShowStartPicker(!showStartPicker); setShowEndPicker(false); }}
            >
              <Text style={styles.dateButtonText}>{formatDateDisplay(startDate)}</Text>
            </Pressable>
            {showStartPicker && (
              <MiniCalendar
                selected={startDate}
                onSelect={(d) => {
                  setStartDate(d);
                  if (endDate < d) setEndDate(d);
                  setShowStartPicker(false);
                }}
              />
            )}
          </View>

          {/* End Date */}
          <View style={styles.field}>
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>End Date</Text>
              <Pressable
                style={styles.indefiniteToggle}
                onPress={() => {
                  const next = !isIndefinite;
                  setIsIndefinite(next);
                  if (!next) {
                    // Default to 4 weeks from start
                    const d = new Date(startDate + 'T00:00:00');
                    d.setDate(d.getDate() + 28);
                    setEndDate(toDateStr(d));
                  }
                }}
              >
                <View style={[styles.toggleBox, isIndefinite && styles.toggleBoxChecked]}>
                  {isIndefinite && <Check size={12} color={colors.onPrimary} strokeWidth={3} />}
                </View>
                <Text style={styles.toggleLabel}>Indefinite</Text>
              </Pressable>
            </View>
            {!isIndefinite && (
              <>
                <Pressable
                  style={styles.dateButton}
                  onPress={() => { setShowEndPicker(!showEndPicker); setShowStartPicker(false); }}
                >
                  <Text style={styles.dateButtonText}>{formatDateDisplay(endDate)}</Text>
                </Pressable>
                {showEndPicker && (
                  <MiniCalendar
                    selected={endDate}
                    onSelect={(d) => { setEndDate(d); setShowEndPicker(false); }}
                    minDate={startDate}
                  />
                )}
              </>
            )}
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.outlineVariant,
  },
  headerButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.onSurface,
  },
  form: {
    flex: 1,
  },
  formContent: {
    padding: spacing.md,
    gap: spacing.lg,
  },
  field: {
    gap: spacing.sm,
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  fieldLabel: {
    fontSize: fontSize.xs,
    fontWeight: '500',
    color: colors.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceContainerLowest,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  pickerButtonText: {
    fontSize: fontSize.sm,
    color: colors.onSurface,
    flex: 1,
  },
  pickerMenu: {
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderTopWidth: 0,
  },
  pickerItem: {
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceContainerLow,
  },
  pickerItemSelected: {
    backgroundColor: colors.selectedBg,
  },
  pickerItemText: {
    fontSize: fontSize.sm,
    color: colors.onSurface,
  },
  pickerItemTextSelected: {
    color: colors.primaryContainer,
    fontWeight: '500',
  },
  textInput: {
    backgroundColor: colors.surfaceContainerLowest,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    fontSize: fontSize.sm,
    color: colors.onSurface,
  },
  dateButton: {
    backgroundColor: colors.surfaceContainerLowest,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  dateButtonText: {
    fontSize: fontSize.sm,
    color: colors.onSurface,
    fontVariant: ['tabular-nums'],
  },
  indefiniteToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  toggleBox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: colors.outlineVariant,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleBoxChecked: {
    backgroundColor: colors.primaryContainer,
    borderColor: colors.primaryContainer,
  },
  toggleLabel: {
    fontSize: fontSize.sm,
    color: colors.onSurface,
  },
});
