import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useSQLiteContext } from 'expo-sqlite';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getMatchedOpportunities, setOpportunitySaved, type OpportunityCard } from '../src/api';
import { readLocalJson, writeLocalJson } from '../src/local-store';

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

const typeLabels: Record<string, string> = {
  SCHOLARSHIP: 'Scholarship',
  GOVERNMENT_SCHEME: 'Government scheme',
  TRAINING: 'Training',
  INTERNSHIP: 'Internship',
  APPRENTICESHIP: 'Apprenticeship',
  JOB: 'Job',
};

export default function OpportunitiesScreen(): React.JSX.Element {
  const database = useSQLiteContext();
  const [opportunities, setOpportunities] = useState<OpportunityCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);
  const [savingId, setSavingId] = useState('');
  const [message, setMessage] = useState('');

  async function load(): Promise<void> {
    setLoading(true);
    setMessage('');
    const cached = await readLocalJson<OpportunityCard[]>(database, 'cached_opportunities');
    if (cached) setOpportunities(cached);
    const studentId = await SecureStore.getItemAsync('studentId');
    if (!studentId) {
      setMessage('Sign in to see opportunities matched to you.');
      setLoading(false);
      return;
    }
    try {
      const matches = await getMatchedOpportunities(studentId);
      setOpportunities(matches);
      await writeLocalJson(database, 'cached_opportunities', matches);
      setOffline(false);
    } catch {
      setOffline(true);
      if (!cached)
        setMessage('Connect once to find opportunities matched to your profile and skills.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [database]);

  async function toggleSave(opportunity: OpportunityCard): Promise<void> {
    setSavingId(opportunity.id);
    setMessage('');
    try {
      await setOpportunitySaved(opportunity.id, !opportunity.savedAt);
      setOpportunities((current) =>
        current.map((item) =>
          item.id === opportunity.id
            ? { ...item, savedAt: item.savedAt ? null : new Date().toISOString() }
            : item,
        ),
      );
    } catch {
      setMessage('Could not save this opportunity. Try again when connected.');
    } finally {
      setSavingId('');
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.replace('/wallet')}
          style={styles.back}
        >
          <Text style={styles.backText}>‹ Skill wallet</Text>
        </Pressable>
        <Text style={styles.eyebrow}>OPPORTUNITY LOCKER · AVSAR</Text>
        <Text style={styles.title}>A next step that fits</Text>
        <Text style={styles.subtitle}>
          Matches use your study level, location, chosen pathway, travel needs, and verified skills.
        </Text>
        <View style={[styles.connection, offline && styles.offline]}>
          <View style={[styles.dot, !offline && styles.online]} />
          <Text style={styles.connectionText}>
            {offline
              ? 'Offline · showing saved matches'
              : 'Matched to your profile and Skill Wallet'}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/applications')}
          style={styles.applicationsLink}
        >
          <Text style={styles.applicationsText}>My applications · Track progress ›</Text>
        </Pressable>
        {loading && !opportunities.length && (
          <ActivityIndicator color={colors.leaf} size="large" style={styles.loader} />
        )}
        {!loading && !opportunities.length && (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No eligible matches yet</Text>
            <Text style={styles.subtitle}>
              Complete your location and pathway details, then check back. New verified skills can
              open more options.
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.replace('/onboarding')}
              style={styles.outlineButton}
            >
              <Text style={styles.outlineText}>Update my profile</Text>
            </Pressable>
          </View>
        )}
        {opportunities.map((item) => (
          <View key={item.id} style={styles.card}>
            <View style={styles.cardTop}>
              <Text style={styles.type}>{typeLabels[item.type] ?? 'Opportunity'}</Text>
              {item.isDemo && <Text style={styles.demo}>DEMO</Text>}
            </View>
            <Text style={styles.cardTitle}>{item.title}</Text>
            <Text style={styles.provider}>{item.provider}</Text>
            <View style={styles.metaRow}>
              <Text style={styles.meta}>
                {[item.district, item.state].filter(Boolean).join(', ') || 'Location flexible'}
              </Text>
              <Text style={styles.fit}>Fit {item.score}%</Text>
            </View>
            {item.applyBy && (
              <Text style={styles.deadline}>
                Apply by {new Date(item.applyBy).toLocaleDateString()}
              </Text>
            )}
            {!!item.reasons[0] && <Text style={styles.reason}>{item.reasons[0]}</Text>}
            <View style={styles.actions}>
              <Pressable
                accessibilityRole="button"
                onPress={() =>
                  router.push({ pathname: '/opportunity/[id]', params: { id: item.id } })
                }
                style={styles.primary}
              >
                <Text style={styles.primaryText}>View details</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                disabled={savingId === item.id}
                onPress={() => void toggleSave(item)}
                style={styles.save}
              >
                <Text style={styles.saveText}>
                  {savingId === item.id ? 'Saving…' : item.savedAt ? 'Saved ✓' : 'Save'}
                </Text>
              </Pressable>
            </View>
          </View>
        ))}
        {!!message && (
          <Text accessibilityRole="alert" style={styles.message}>
            {message}
          </Text>
        )}
        <Text style={styles.disclaimer}>
          Demo records are fictional and are not official programs or job offers. Verify eligibility
          and dates with the provider.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.paper },
  content: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 36,
    maxWidth: 640,
    width: '100%',
    alignSelf: 'center',
  },
  back: { minHeight: 40, justifyContent: 'center', alignSelf: 'flex-start', paddingRight: 12 },
  backText: { color: colors.leaf, fontWeight: '800' },
  eyebrow: {
    color: colors.saffron,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    marginTop: 14,
  },
  title: { color: colors.ink, fontSize: 29, lineHeight: 35, fontWeight: '800', marginTop: 8 },
  subtitle: { color: colors.muted, fontSize: 14, lineHeight: 21, marginTop: 8 },
  connection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    padding: 10,
    marginTop: 14,
    borderRadius: 8,
    backgroundColor: colors.pale,
  },
  offline: { backgroundColor: '#fff0e6' },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.saffron },
  online: { backgroundColor: colors.leaf },
  connectionText: { color: colors.ink, fontSize: 11, fontWeight: '700' },
  applicationsLink: {
    alignSelf: 'flex-end',
    minHeight: 42,
    justifyContent: 'center',
    marginTop: -42,
  },
  applicationsText: { color: colors.leaf, fontSize: 12, fontWeight: '800' },
  loader: { marginTop: 45 },
  empty: {
    marginTop: 18,
    padding: 18,
    backgroundColor: colors.white,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 11,
  },
  emptyTitle: { color: colors.ink, fontSize: 17, fontWeight: '800', marginBottom: 5 },
  card: {
    padding: 15,
    marginTop: 12,
    backgroundColor: colors.white,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 11,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  type: { color: colors.leaf, fontSize: 11, fontWeight: '900', flex: 1 },
  demo: { color: colors.saffron, fontSize: 10, fontWeight: '900' },
  cardTitle: { color: colors.ink, fontSize: 17, fontWeight: '800', marginTop: 9 },
  provider: { color: colors.muted, fontSize: 12, marginTop: 4 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, marginTop: 12 },
  meta: { color: colors.muted, fontSize: 12, flex: 1 },
  fit: { color: colors.leaf, fontSize: 11, fontWeight: '900' },
  deadline: { color: colors.ink, fontSize: 12, marginTop: 7 },
  reason: { color: colors.leaf, fontSize: 12, lineHeight: 18, marginTop: 9 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 13 },
  primary: {
    flex: 1,
    minHeight: 43,
    borderRadius: 9,
    backgroundColor: colors.leaf,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: { color: colors.white, fontWeight: '800', fontSize: 12 },
  save: {
    minWidth: 82,
    minHeight: 43,
    borderRadius: 9,
    borderColor: colors.line,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveText: { color: colors.ink, fontWeight: '800', fontSize: 12 },
  outlineButton: {
    alignSelf: 'flex-start',
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 12,
    marginTop: 13,
    borderWidth: 1,
    borderColor: colors.leaf,
    borderRadius: 9,
  },
  outlineText: { color: colors.leaf, fontWeight: '800' },
  message: { color: colors.saffron, lineHeight: 20, marginTop: 12 },
  disclaimer: { color: colors.muted, fontSize: 11, lineHeight: 17, marginTop: 18 },
});
