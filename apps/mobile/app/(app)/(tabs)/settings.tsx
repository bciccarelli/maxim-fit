import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, Alert } from 'react-native';
import { useState, useEffect } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LogOut, User, Target, CheckSquare, CreditCard, MessageSquare, ExternalLink, Pencil, X, Check } from 'lucide-react-native';
import * as WebBrowser from 'expo-web-browser';
import { useAuth } from '@/contexts/AuthContext';
import { apiUrl, getAuthHeaders } from '@/lib/api';
import { NotificationSettingsCard } from '@/components/settings/NotificationSettingsCard';
import { useUserConfig, type UserConfig } from '@/hooks/useUserConfig';
import { PersonalInfoStep } from '@/components/protocol/wizard/PersonalInfoStep';
import { GoalsStep } from '@/components/protocol/wizard/GoalsStep';
import { RequirementsStep } from '@/components/protocol/wizard/RequirementsStep';
import type { PersonalInfo, Goal } from '@protocol/shared/schemas';

type Subscription = {
  tier: 'free' | 'pro';
  renewalDate: string | null;
};

type EditingSection = 'personal' | 'goals' | 'requirements' | null;

export default function SettingsScreen() {
  const { user, signOut } = useAuth();
  const insets = useSafeAreaInsets();
  const { config, isLoading: configLoading, saveConfig, isSaving } = useUserConfig();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [isSubLoading, setIsSubLoading] = useState(true);
  const [isBillingLoading, setIsBillingLoading] = useState(false);

  // Edit mode state
  const [editingSection, setEditingSection] = useState<EditingSection>(null);
  const [draftPersonalInfo, setDraftPersonalInfo] = useState<Partial<PersonalInfo>>({});
  const [draftGoals, setDraftGoals] = useState<Goal[]>([]);
  const [draftRequirements, setDraftRequirements] = useState<string[]>([]);

  useEffect(() => {
    async function fetchSubscription() {
      if (!user) return;

      try {
        const headers = await getAuthHeaders();
        const response = await fetch(apiUrl('/api/subscription'), { headers });
        if (response.ok) {
          const data = await response.json();
          setSubscription({
            tier: data.tier || 'free',
            renewalDate: data.renewalDate || null,
          });
        }
      } catch (err) {
        console.error('Error fetching subscription:', err);
      }

      setIsSubLoading(false);
    }

    fetchSubscription();
  }, [user]);

  const startEditing = (section: EditingSection) => {
    if (!config) return;

    if (section === 'personal') {
      setDraftPersonalInfo(config.personal_info);
    } else if (section === 'goals') {
      setDraftGoals([...config.goals]);
    } else if (section === 'requirements') {
      setDraftRequirements([...config.requirements]);
    }
    setEditingSection(section);
  };

  const cancelEditing = () => {
    setEditingSection(null);
    setDraftPersonalInfo({});
    setDraftGoals([]);
    setDraftRequirements([]);
  };

  const handleSave = async () => {
    if (!config || !editingSection) return;

    try {
      let updatedConfig: UserConfig;

      if (editingSection === 'personal') {
        updatedConfig = {
          ...config,
          personal_info: draftPersonalInfo as PersonalInfo,
        };
      } else if (editingSection === 'goals') {
        updatedConfig = {
          ...config,
          goals: draftGoals,
        };
      } else {
        updatedConfig = {
          ...config,
          requirements: draftRequirements,
        };
      }

      await saveConfig(updatedConfig);
      cancelEditing();
    } catch (err) {
      Alert.alert('Error', 'Failed to save changes. Please try again.');
    }
  };

  const isLoading = configLoading || isSubLoading;

  const handleManageBilling = async () => {
    setIsBillingLoading(true);
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(apiUrl('/api/stripe/portal'), {
        method: 'POST',
        headers,
      });

      if (response.ok) {
        const { url } = await response.json();
        await WebBrowser.openBrowserAsync(url);
      }
    } catch (err) {
      console.error('Error opening billing portal:', err);
    } finally {
      setIsBillingLoading(false);
    }
  };

  const formatHeight = (inches: number) => {
    const feet = Math.floor(inches / 12);
    const remainingInches = inches % 12;
    return `${feet}'${remainingInches}"`;
  };

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color="#2d5a2d" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={[styles.content, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 80 }]}>
      {/* Subscription Status */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <CreditCard size={20} color="#2d5a2d" />
          <Text style={styles.cardTitle}>Subscription</Text>
        </View>
        <View style={styles.subscriptionRow}>
          <View style={[styles.tierBadge, subscription?.tier === 'pro' && styles.tierBadgePro]}>
            <Text style={[styles.tierText, subscription?.tier === 'pro' && styles.tierTextPro]}>
              {subscription?.tier === 'pro' ? 'Pro' : 'Free'}
            </Text>
          </View>
          {subscription?.renewalDate && (
            <Text style={styles.renewalText}>
              Renews {new Date(subscription.renewalDate).toLocaleDateString()}
            </Text>
          )}
        </View>
        {subscription?.tier === 'pro' && (
          <Pressable
            style={styles.billingButton}
            onPress={handleManageBilling}
            disabled={isBillingLoading}
          >
            {isBillingLoading ? (
              <ActivityIndicator size="small" color="#2d5a2d" />
            ) : (
              <Text style={styles.billingButtonText}>Manage Billing</Text>
            )}
          </Pressable>
        )}
      </View>

      {/* Notifications */}
      <NotificationSettingsCard />

      {/* Personal Info */}
      {config?.personal_info && (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <User size={20} color="#2d5a2d" />
            <Text style={styles.cardTitle}>Personal Info</Text>
            <View style={styles.cardHeaderSpacer} />
            {editingSection === 'personal' ? (
              <View style={styles.editActions}>
                <Pressable style={styles.cancelButton} onPress={cancelEditing} disabled={isSaving}>
                  <X size={18} color="#666" />
                </Pressable>
                <Pressable style={styles.saveButton} onPress={handleSave} disabled={isSaving}>
                  {isSaving ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Check size={18} color="#fff" />
                  )}
                </Pressable>
              </View>
            ) : (
              <Pressable style={styles.editButton} onPress={() => startEditing('personal')}>
                <Pencil size={16} color="#666" />
              </Pressable>
            )}
          </View>
          {editingSection === 'personal' ? (
            <PersonalInfoStep
              personalInfo={draftPersonalInfo}
              onChange={setDraftPersonalInfo}
            />
          ) : (
            <>
              <View style={styles.infoGrid}>
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Age</Text>
                  <Text style={styles.infoValue}>{config.personal_info.age}</Text>
                </View>
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Sex</Text>
                  <Text style={styles.infoValue}>{config.personal_info.sex}</Text>
                </View>
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Weight</Text>
                  <Text style={styles.infoValue}>{config.personal_info.weight_lbs} lbs</Text>
                </View>
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Height</Text>
                  <Text style={styles.infoValue}>{formatHeight(config.personal_info.height_in)}</Text>
                </View>
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Fitness Level</Text>
                  <Text style={styles.infoValue}>{config.personal_info.fitness_level}</Text>
                </View>
              </View>
              {config.personal_info.dietary_restrictions.length > 0 && (
                <View style={styles.listSection}>
                  <Text style={styles.listLabel}>Dietary Restrictions</Text>
                  <Text style={styles.listValue}>
                    {config.personal_info.dietary_restrictions.join(', ')}
                  </Text>
                </View>
              )}
              {config.personal_info.lifestyle_considerations.length > 0 && (
                <View style={styles.listSection}>
                  <Text style={styles.listLabel}>Lifestyle</Text>
                  <Text style={styles.listValue}>
                    {config.personal_info.lifestyle_considerations.join(', ')}
                  </Text>
                </View>
              )}
            </>
          )}
        </View>
      )}

      {/* Goals */}
      {(config?.goals && config.goals.length > 0) || editingSection === 'goals' ? (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Target size={20} color="#2d5a2d" />
            <Text style={styles.cardTitle}>Goals</Text>
            <View style={styles.cardHeaderSpacer} />
            {editingSection === 'goals' ? (
              <View style={styles.editActions}>
                <Pressable style={styles.cancelButton} onPress={cancelEditing} disabled={isSaving}>
                  <X size={18} color="#666" />
                </Pressable>
                <Pressable style={styles.saveButton} onPress={handleSave} disabled={isSaving}>
                  {isSaving ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Check size={18} color="#fff" />
                  )}
                </Pressable>
              </View>
            ) : (
              <Pressable style={styles.editButton} onPress={() => startEditing('goals')}>
                <Pencil size={16} color="#666" />
              </Pressable>
            )}
          </View>
          {editingSection === 'goals' ? (
            <GoalsStep
              goals={draftGoals}
              onChange={setDraftGoals}
            />
          ) : (
            config?.goals.map((goal, index) => (
              <View key={index} style={styles.goalItem}>
                <View style={styles.goalHeader}>
                  <Text style={styles.goalName}>{goal.name}</Text>
                  <Text style={styles.goalWeight}>{Math.round(goal.weight * 100)}%</Text>
                </View>
                <View style={styles.goalBar}>
                  <View style={[styles.goalBarFill, { width: `${goal.weight * 100}%` }]} />
                </View>
              </View>
            ))
          )}
        </View>
      ) : null}

      {/* Requirements */}
      {(config?.requirements && config.requirements.length > 0) || editingSection === 'requirements' ? (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <CheckSquare size={20} color="#2d5a2d" />
            <Text style={styles.cardTitle}>Requirements</Text>
            <View style={styles.cardHeaderSpacer} />
            {editingSection === 'requirements' ? (
              <View style={styles.editActions}>
                <Pressable style={styles.cancelButton} onPress={cancelEditing} disabled={isSaving}>
                  <X size={18} color="#666" />
                </Pressable>
                <Pressable style={styles.saveButton} onPress={handleSave} disabled={isSaving}>
                  {isSaving ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Check size={18} color="#fff" />
                  )}
                </Pressable>
              </View>
            ) : (
              <Pressable style={styles.editButton} onPress={() => startEditing('requirements')}>
                <Pencil size={16} color="#666" />
              </Pressable>
            )}
          </View>
          {editingSection === 'requirements' ? (
            <RequirementsStep
              requirements={draftRequirements}
              onChange={setDraftRequirements}
            />
          ) : (
            config?.requirements.map((req, index) => (
              <View key={index} style={styles.requirementItem}>
                <View style={styles.bullet} />
                <Text style={styles.requirementText}>{req}</Text>
              </View>
            ))
          )}
        </View>
      ) : null}

      {/* Feedback */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <MessageSquare size={20} color="#2d5a2d" />
          <Text style={styles.cardTitle}>Feedback</Text>
        </View>
        <Text style={styles.feedbackDescription}>
          Help us improve Maxim Fit by sharing your feedback, reporting bugs, or requesting features.
        </Text>
        <Pressable
          style={styles.feedbackButton}
          onPress={() => WebBrowser.openBrowserAsync('https://maximfit.featurebase.app')}
        >
          <Text style={styles.feedbackButtonText}>Share feedback</Text>
          <ExternalLink size={14} color="#2d5a2d" />
        </Pressable>
      </View>

      {/* Sign Out */}
      <Pressable style={styles.signOutButton} onPress={signOut}>
        <LogOut size={20} color="#c62828" />
        <Text style={styles.signOutText}>Sign Out</Text>
      </Pressable>

      {/* Account Info */}
      <Text style={styles.emailText}>{user?.email}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f0',
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f0',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#2d5a2d',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a2e1a',
    marginLeft: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cardHeaderSpacer: {
    flex: 1,
  },
  editButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#f5f5f0',
  },
  editActions: {
    flexDirection: 'row',
    gap: 8,
  },
  cancelButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#f5f5f0',
  },
  saveButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#2d5a2d',
    minWidth: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subscriptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  tierBadge: {
    backgroundColor: '#f5f5f0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  tierBadgePro: {
    backgroundColor: '#e8f5e9',
  },
  tierText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  tierTextPro: {
    color: '#2d5a2d',
  },
  renewalText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 12,
  },
  billingButton: {
    backgroundColor: '#f5f5f0',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  billingButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2d5a2d',
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  infoItem: {
    width: '50%',
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 11,
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 14,
    color: '#1a2e1a',
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  listSection: {
    marginTop: 4,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  listLabel: {
    fontSize: 11,
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  listValue: {
    fontSize: 14,
    color: '#1a2e1a',
    lineHeight: 20,
  },
  goalItem: {
    marginBottom: 12,
  },
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  goalName: {
    fontSize: 14,
    color: '#1a2e1a',
    fontWeight: '500',
  },
  goalWeight: {
    fontSize: 14,
    color: '#2d5a2d',
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  goalBar: {
    height: 6,
    backgroundColor: '#f0f0f0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  goalBarFill: {
    height: '100%',
    backgroundColor: '#2d5a2d',
    borderRadius: 3,
  },
  requirementItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#2d5a2d',
    marginTop: 6,
    marginRight: 10,
  },
  requirementText: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  feedbackDescription: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
    marginBottom: 12,
  },
  feedbackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f5f5f0',
    borderRadius: 8,
    paddingVertical: 10,
    gap: 6,
  },
  feedbackButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2d5a2d',
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  signOutText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#c62828',
    marginLeft: 8,
  },
  emailText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginTop: 16,
  },
});
