import { useEffect, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useSQLiteContext } from 'expo-sqlite';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  getMatchedOpportunities,
  getOpportunity,
  setOpportunitySaved,
  startOpportunityApplication,
  type OpportunityCard,
} from '../../src/api';
import { readLocalJson, writeLocalJson } from '../../src/local-store';

const colors = {
  ink: '#183b32',
  leaf: '#2d7658',
  saffron: '#d87936',
  paper: '#f5f3e9',
  white: '#fffefa',
  line: '#d8dfd5',
  muted: '#64766e',
  pale: '#e7eee6',
};
const labels: Record<string, string> = {
  SCHOLARSHIP: 'Scholarship',
  GOVERNMENT_SCHEME: 'Government scheme',
  TRAINING: 'Training program',
  INTERNSHIP: 'Internship',
  APPRENTICESHIP: 'Apprenticeship',
  JOB: 'Job',
};

export default function OpportunityDetailScreen(): React.JSX.Element {
  const { id } = useLocalSearchParams<{ id: string }>();
  const database = useSQLiteContext();
  const [opportunity, setOpportunity] = useState<OpportunityCard | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    let active = true;
    void (async () => {
      const cached = await readLocalJson<OpportunityCard[]>(database, 'cached_opportunities');
      const local = cached?.find((item) => item.id === id) ?? null;
      if (local && active) setOpportunity(local);
      try {
        const latest = await getOpportunity(id);
        if (active) setOpportunity(latest);
      } catch {
        if (!local && active)
          setMessage('This opportunity is not in your saved list yet. Connect to load details.');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [database, id]);

  async function toggleSaved(): Promise<void> {
    if (!opportunity) return;
    setBusy(true);
    try {
      await setOpportunitySaved(opportunity.id, !opportunity.savedAt);
      setOpportunity((current) =>
        current
          ? { ...current, savedAt: current.savedAt ? null : new Date().toISOString() }
          : current,
      );
    } catch {
      setMessage('Could not save this opportunity. Try again when connected.');
    } finally {
      setBusy(false);
    }
  }

  async function startApplication(): Promise<void> {
    if (!opportunity) return;
    setBusy(true);
    setMessage('');
    try {
      await startOpportunityApplication(opportunity.id);
      const studentId = await SecureStore.getItemAsync('studentId');
      if (studentId) {
        const matches = await getMatchedOpportunities(studentId);
        await writeLocalJson(database, 'cached_opportunities', matches);
      }
      router.push('/applications');
    } catch {
      setMessage('Could not start this application yet. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  }

  if (!opportunity) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loading}>
          <Text style={styles.subtitle}>
            {loading ? 'Loading opportunity…' : message || 'Opportunity not found.'}
          </Text>
          <Pressable onPress={() => router.replace('/opportunities')} style={styles.back}>
            <Text style={styles.backText}>Back to matches</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.replace('/opportunities')}
          style={styles.back}
        >
          <Text style={styles.backText}>‹ Matched opportunities</Text>
        </Pressable>
        <Text style={styles.eyebrow}>
          {labels[opportunity.type] ?? 'Opportunity'} ·{' '}
          {opportunity.isDemo ? 'DEMO RECORD' : 'OPPORTUNITY'}
        </Text>
        <Text style={styles.title}>{opportunity.title}</Text>
        <Text style={styles.provider}>{opportunity.provider}</Text>
        <Text style={styles.description}>{opportunity.description}</Text>
        <View style={styles.meta}>
          <Text style={styles.metaText}>
            {[opportunity.district, opportunity.state].filter(Boolean).join(', ') ||
              'Location flexible'}
          </Text>
          <Text style={styles.fit}>Fit {opportunity.score}%</Text>
        </View>
        {opportunity.applyBy && (
          <Text style={styles.deadline}>
            Deadline · {new Date(opportunity.applyBy).toLocaleDateString()}
          </Text>
        )}
        {(opportunity.stipendMin !== null || opportunity.stipendMax !== null) && (
          <Text style={styles.money}>
            Sample range: ₹{(opportunity.stipendMin ?? 0).toLocaleString('en-IN')}–₹
            {(opportunity.stipendMax ?? 0).toLocaleString('en-IN')} / month
          </Text>
        )}

        <Text style={styles.sectionTitle}>Why this matches</Text>
        <View style={styles.reasonList}>
          {opportunity.reasons.map((reason) => (
            <View key={reason} style={styles.reasonRow}>
              <Text style={styles.reasonMark}>✓</Text>
              <Text style={styles.reasonText}>{reason}</Text>
            </View>
          ))}
        </View>
        {!opportunity.eligible && (
          <View style={styles.requirements}>
            <Text style={styles.sectionTitle}>What is still needed</Text>
            {opportunity.missingRequirements.map((item) => (
              <Text key={item} style={styles.missing}>
                • {item}
              </Text>
            ))}
          </View>
        )}
        <Text style={styles.sectionTitle}>Documents to prepare</Text>
        {opportunity.requiredDocuments.length ? (
          opportunity.requiredDocuments.map((document) => (
            <Text key={document} style={styles.document}>
              □ {document}
            </Text>
          ))
        ) : (
          <Text style={styles.muted}>Confirm required documents with the provider.</Text>
        )}
        <Text style={styles.disclaimer}>
          This is demo guidance, not an official offer. Check eligibility, deadlines, costs, and
          provider details with a trusted facilitator.
        </Text>
        {!!message && (
          <Text accessibilityRole="alert" style={styles.message}>
            {message}
          </Text>
        )}
        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            disabled={busy}
            onPress={() => void toggleSaved()}
            style={styles.save}
          >
            <Text style={styles.saveText}>{opportunity.savedAt ? 'Saved ✓' : 'Save'}</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            disabled={busy || !opportunity.eligible}
            onPress={() => void startApplication()}
            style={[styles.primary, !opportunity.eligible && styles.disabled]}
          >
            <Text style={styles.primaryText}>
              {busy
                ? 'Working…'
                : opportunity.applicationId
                  ? 'Continue application'
                  : 'Start application'}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.paper },
  content: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 34,
    maxWidth: 640,
    width: '100%',
    alignSelf: 'center',
  },
  loading: { flex: 1, justifyContent: 'center', padding: 24 },
  subtitle: { color: colors.muted, fontSize: 14, lineHeight: 21, marginTop: 8 },
  back: { minHeight: 40, justifyContent: 'center', alignSelf: 'flex-start', paddingRight: 12 },
  backText: { color: colors.leaf, fontWeight: '800' },
  eyebrow: {
    color: colors.saffron,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
    marginTop: 14,
  },
  title: { color: colors.ink, fontSize: 27, lineHeight: 33, fontWeight: '800', marginTop: 8 },
  provider: { color: colors.muted, fontSize: 13, marginTop: 5 },
  description: { color: colors.ink, fontSize: 15, lineHeight: 23, marginTop: 15 },
  meta: { flexDirection: 'row', justifyContent: 'space-between', gap: 10, marginTop: 15 },
  metaText: { color: colors.muted, fontSize: 12 },
  fit: { color: colors.leaf, fontWeight: '900', fontSize: 12 },
  deadline: { color: colors.ink, fontSize: 13, fontWeight: '700', marginTop: 8 },
  money: { color: colors.ink, fontSize: 13, marginTop: 8 },
  sectionTitle: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: '900',
    marginTop: 23,
    marginBottom: 9,
  },
  reasonList: { gap: 9 },
  reasonRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 9 },
  reasonMark: { color: colors.leaf, fontWeight: '900' },
  reasonText: { color: colors.leaf, flex: 1, fontSize: 13, lineHeight: 19 },
  requirements: { marginTop: 16, padding: 13, backgroundColor: '#fff0e6', borderRadius: 9 },
  missing: { color: '#7d4528', lineHeight: 20, marginTop: 4 },
  document: { color: colors.ink, lineHeight: 24 },
  muted: { color: colors.muted, lineHeight: 20 },
  disclaimer: { color: colors.muted, fontSize: 11, lineHeight: 17, marginTop: 20 },
  message: { color: colors.saffron, lineHeight: 20, marginTop: 10 },
  actions: { flexDirection: 'row', gap: 9, marginTop: 18 },
  save: {
    minWidth: 82,
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.line,
  },
  saveText: { color: colors.ink, fontWeight: '800' },
  primary: {
    flex: 1,
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.leaf,
    borderRadius: 10,
  },
  primaryText: { color: colors.white, fontWeight: '800' },
  disabled: { opacity: 0.5 },
});
