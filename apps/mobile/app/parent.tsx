import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useSQLiteContext } from 'expo-sqlite';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  getParentChildren,
  getParentSummary,
  getParentTimeline,
  sendOtp,
  verifyParentOtp,
  type DoorOpenerEvent,
  type ParentChild,
  type ParentTrustSummary,
} from '../src/api';
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

const eventLabels: Record<string, string> = {
  MISSION_ASSIGNED: 'A facilitator shared a mission',
  MISSION_SUBMITTED: 'Your child shared mission evidence',
  APPROVED: 'Mission completed and verified',
  REJECTED: 'Facilitator reviewed a mission',
  RESUBMIT_REQUIRED: 'A facilitator suggested another try',
  OPPORTUNITY_RECOMMENDED: 'A facilitator opened an opportunity',
  HELP_REQUESTED: 'Student asked for application help',
  APPLICATION_SUBMITTED: 'Application marked as submitted',
  APPLICATION_SELECTED: 'Application marked as selected',
  APPLICATION_REJECTED: 'Application status updated',
};

export default function ParentScreen(): React.JSX.Element {
  const database = useSQLiteContext();
  const [phone, setPhone] = useState('+919200000001');
  const [code, setCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [parentToken, setParentToken] = useState('');
  const [children, setChildren] = useState<ParentChild[]>([]);
  const [selectedChildId, setSelectedChildId] = useState('');
  const [summary, setSummary] = useState<ParentTrustSummary | null>(null);
  const [timeline, setTimeline] = useState<DoorOpenerEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [offline, setOffline] = useState(false);
  const [message, setMessage] = useState('');

  async function loadChild(token: string, childId: string): Promise<void> {
    setSelectedChildId(childId);
    const cachedSummary = await readLocalJson<ParentTrustSummary>(
      database,
      `parent_summary_${childId}`,
    );
    const cachedTimeline = await readLocalJson<DoorOpenerEvent[]>(
      database,
      `parent_timeline_${childId}`,
    );
    if (cachedSummary) setSummary(cachedSummary);
    if (cachedTimeline) setTimeline(cachedTimeline);
    setLoading(true);
    setMessage('');
    try {
      const [latestSummary, latestTimeline] = await Promise.all([
        getParentSummary(token, childId),
        getParentTimeline(token, childId),
      ]);
      setSummary(latestSummary);
      setTimeline(latestTimeline);
      await writeLocalJson(database, `parent_summary_${childId}`, latestSummary);
      await writeLocalJson(database, `parent_timeline_${childId}`, latestTimeline);
      setOffline(false);
    } catch {
      setOffline(true);
      if (!cachedSummary) setMessage('Connect once to load the family summary on this phone.');
    } finally {
      setLoading(false);
    }
  }

  async function loadParent(token: string): Promise<void> {
    setParentToken(token);
    setLoading(true);
    try {
      const linkedChildren = await getParentChildren(token);
      setChildren(linkedChildren);
      if (linkedChildren[0]) await loadChild(token, linkedChildren[0].id);
      else setMessage('No child profile is linked to this family account yet.');
    } catch {
      setMessage(
        'Could not load the linked family profile. Check the connection and sign in again.',
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    void SecureStore.getItemAsync('parentAccessToken').then((token) => {
      if (active && token) void loadParent(token);
    });
    return () => {
      active = false;
    };
  }, [database]);

  async function signIn(): Promise<void> {
    setLoading(true);
    setMessage('');
    try {
      await verifyParentOtp(phone.trim(), code.trim());
      const token = await SecureStore.getItemAsync('parentAccessToken');
      if (!token) throw new Error('Parent session was not saved.');
      await loadParent(token);
    } catch {
      setMessage('That code did not open a linked family account. Try the seeded family number.');
    } finally {
      setLoading(false);
    }
  }

  async function requestCode(): Promise<void> {
    setLoading(true);
    setMessage('');
    try {
      const result = await sendOtp(phone.trim());
      setCodeSent(true);
      if (result.devCode) setCode(result.devCode);
      setMessage('Demo code ready.');
    } catch {
      setMessage('Could not request a code. Check that the API is running.');
    } finally {
      setLoading(false);
    }
  }

  async function signOut(): Promise<void> {
    await SecureStore.deleteItemAsync('parentAccessToken');
    await SecureStore.deleteItemAsync('parentRefreshToken');
    await SecureStore.deleteItemAsync('parentId');
    setParentToken('');
    setChildren([]);
    setSummary(null);
    setTimeline([]);
    setSelectedChildId('');
  }

  if (!parentToken) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.login}>
          <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.back}>
            <Text style={styles.backText}>‹ Back</Text>
          </Pressable>
          <Text style={styles.eyebrow}>PARENT TRUST MODE · PARIVAAR</Text>
          <Text style={styles.title}>A clear view of the next step</Text>
          <Text style={styles.subtitle}>
            See verified progress, safe options, and who is helping.
          </Text>
          <Text style={styles.label}>Family mobile number · परिवार का नंबर</Text>
          <TextInput
            accessibilityLabel="Family mobile number"
            keyboardType="phone-pad"
            onChangeText={setPhone}
            style={styles.input}
            value={phone}
          />
          {codeSent && (
            <>
              <Text style={styles.label}>One-time code · कोड</Text>
              <TextInput
                accessibilityLabel="One-time code"
                keyboardType="number-pad"
                maxLength={6}
                onChangeText={setCode}
                style={styles.input}
                value={code}
              />
            </>
          )}
          {!!message && (
            <Text accessibilityRole="alert" style={styles.message}>
              {message}
            </Text>
          )}
          <Pressable
            accessibilityRole="button"
            disabled={loading}
            onPress={() => void (codeSent ? signIn() : requestCode())}
            style={styles.primary}
          >
            {loading ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.primaryText}>
                {codeSent ? 'Continue · आगे' : 'Get a code · कोड पाएँ'}
              </Text>
            )}
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.topRow}>
          <View>
            <Text style={styles.eyebrow}>PARENT TRUST MODE · PARIVAAR</Text>
            <Text style={styles.title}>A clear view of the next step</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={() => void signOut()}
            style={styles.signOut}
          >
            <Text style={styles.signOutText}>Sign out</Text>
          </Pressable>
        </View>
        {children.length > 1 && (
          <View style={styles.childChoices}>
            {children.map((child) => (
              <Pressable
                key={child.id}
                accessibilityRole="button"
                onPress={() => void loadChild(parentToken, child.id)}
                style={[
                  styles.childChoice,
                  selectedChildId === child.id && styles.childChoiceSelected,
                ]}
              >
                <Text style={styles.childChoiceText}>{child.displayName}</Text>
              </Pressable>
            ))}
          </View>
        )}
        {loading && !summary && (
          <ActivityIndicator color={colors.leaf} size="large" style={styles.loader} />
        )}
        {summary && (
          <>
            <Text style={styles.greeting}>
              {summary.student.displayName} · Class {summary.student.gradeLevel ?? '—'}
            </Text>
            {!!summary.student.district && (
              <Text style={styles.small}>
                {[summary.student.district, summary.student.state].filter(Boolean).join(', ')}
              </Text>
            )}
            {offline && (
              <View style={styles.offline}>
                <Text style={styles.offlineText}>Offline · showing saved family information</Text>
              </View>
            )}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Strengths · खूबियाँ</Text>
              <Text style={styles.body}>
                {summary.student.strengths.length
                  ? summary.student.strengths.join(' · ')
                  : 'Strengths are still being explored.'}
              </Text>
              {!!summary.student.interests.length && (
                <Text style={styles.small}>Enjoys: {summary.student.interests.join(', ')}</Text>
              )}
            </View>
            <View style={styles.pathway}>
              <Text style={styles.sectionTitle}>
                {summary.pathway?.isSelected
                  ? 'Current pathway · चुना हुआ रास्ता'
                  : 'Suggested pathway · सुझाया हुआ रास्ता'}
              </Text>
              <Text style={styles.pathTitle}>
                {summary.pathway?.title ?? 'Exploring options together'}
              </Text>
              {!!summary.pathway && (
                <>
                  {!summary.pathway.isSelected && (
                    <Text style={styles.small}>
                      A suggestion based on your child’s profile and verified skills. You can
                      discuss it together.
                    </Text>
                  )}
                  <Text style={styles.body}>{summary.pathway.description}</Text>
                  <Text style={styles.stat}>
                    About {summary.pathway.durationWeeks} weeks to learn
                  </Text>
                  <Text style={styles.stat}>
                    Sample earning range after training: ₹
                    {summary.pathway.estimatedMonthlyEarningsMin.toLocaleString('en-IN')}–₹
                    {summary.pathway.estimatedMonthlyEarningsMax.toLocaleString('en-IN')} / month
                  </Text>
                  <Text style={styles.small}>{summary.pathway.costGuidance}</Text>
                </>
              )}
            </View>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Verified progress · पक्की प्रगति</Text>
              <Text style={styles.stat}>
                {summary.wallet.approvedMissionCount} of {summary.wallet.totalMissionCount} missions
                approved · Readiness {summary.wallet.readinessScore}/100
              </Text>
              {summary.wallet.badges.length ? (
                summary.wallet.badges.map((badge) => (
                  <Text key={`${badge.title}-${badge.skill}`} style={styles.body}>
                    ✓ {badge.title} · {badge.skill}
                  </Text>
                ))
              ) : (
                <Text style={styles.small}>
                  Verified badges will appear here after facilitator review.
                </Text>
              )}
              {summary.wallet.approvedMissions.map((mission) => (
                <Text key={`${mission.title}-${mission.approvedAt}`} style={styles.small}>
                  Completed: {mission.title}
                </Text>
              ))}
            </View>
            {!!summary.facilitatorRecommendation && (
              <View style={styles.recommendation}>
                <Text style={styles.sectionTitle}>A person helping · मदद करने वाले</Text>
                <Text style={styles.body}>
                  {summary.facilitatorRecommendation.facilitator} recommends{' '}
                  {summary.facilitatorRecommendation.opportunityTitle}.
                </Text>
                {!!summary.facilitatorRecommendation.note && (
                  <Text style={styles.small}>{summary.facilitatorRecommendation.note}</Text>
                )}
              </View>
            )}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Possible next steps · आगे के मौके</Text>
              {summary.opportunities.length ? (
                summary.opportunities.map((item) => (
                  <View key={item.id} style={styles.opportunity}>
                    <Text style={styles.pathTitle}>
                      {item.title}
                      {item.isDemo ? ' · DEMO' : ''}
                    </Text>
                    <Text style={styles.small}>
                      {item.type.replaceAll('_', ' ')} · Fit {item.score}% ·{' '}
                      {[item.district, item.state].filter(Boolean).join(', ') ||
                        'Location flexible'}
                    </Text>
                    <Text style={styles.body}>
                      {item.reasons[0] ?? 'A possible option to discuss together.'}
                    </Text>
                    {!!item.facilitatorNote && (
                      <Text style={styles.small}>Facilitator: {item.facilitatorNote}</Text>
                    )}
                  </View>
                ))
              ) : (
                <Text style={styles.small}>
                  New matched opportunities will appear as they become available.
                </Text>
              )}
            </View>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Applications · आवेदन</Text>
              {summary.applications.length ? (
                summary.applications.map((application) => (
                  <View key={application.id} style={styles.application}>
                    <Text style={styles.pathTitle}>
                      {application.title}
                      {application.isDemo ? ' · DEMO' : ''}
                    </Text>
                    <Text style={styles.small}>
                      Status: {application.status.replaceAll('_', ' ')}
                    </Text>
                    {!!application.facilitatorNote && (
                      <Text style={styles.body}>{application.facilitatorNote}</Text>
                    )}
                  </View>
                ))
              ) : (
                <Text style={styles.small}>No applications have been started.</Text>
              )}
            </View>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Door-Opener timeline · किसने मदद की</Text>
              {timeline.length ? (
                timeline.map((event) => (
                  <View key={event.id} style={styles.timelineItem}>
                    <View style={styles.timelineDot} />
                    <View style={styles.timelineBody}>
                      <Text style={styles.timelineTitle}>
                        {eventLabels[event.type] ?? event.title}
                      </Text>
                      <Text style={styles.small}>
                        {event.actor} · {new Date(event.at).toLocaleDateString()}
                      </Text>
                      <Text style={styles.body}>{event.detail}</Text>
                    </View>
                  </View>
                ))
              ) : (
                <Text style={styles.small}>Helpful steps will appear here as they happen.</Text>
              )}
            </View>
            <Text style={styles.disclaimer}>{summary.reassurance}</Text>
          </>
        )}
        {!!message && (
          <Text accessibilityRole="alert" style={styles.message}>
            {message}
          </Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.paper },
  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 36,
    maxWidth: 660,
    width: '100%',
    alignSelf: 'center',
  },
  login: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    maxWidth: 540,
    width: '100%',
    alignSelf: 'center',
  },
  back: { minHeight: 40, justifyContent: 'center', alignSelf: 'flex-start' },
  backText: { color: colors.leaf, fontWeight: '800' },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  eyebrow: {
    color: colors.saffron,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
    marginTop: 8,
  },
  title: { color: colors.ink, fontSize: 27, lineHeight: 33, fontWeight: '900', marginTop: 8 },
  subtitle: { color: colors.muted, fontSize: 14, lineHeight: 21, marginTop: 8 },
  label: { color: colors.ink, fontSize: 13, fontWeight: '800', marginTop: 19, marginBottom: 8 },
  input: {
    minHeight: 52,
    paddingHorizontal: 13,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 10,
    backgroundColor: colors.white,
    color: colors.ink,
    fontSize: 16,
  },
  primary: {
    minHeight: 52,
    borderRadius: 10,
    backgroundColor: colors.leaf,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  primaryText: { color: colors.white, fontSize: 15, fontWeight: '900' },
  message: { color: colors.saffron, fontSize: 13, lineHeight: 20, marginTop: 12 },
  signOut: { minHeight: 38, justifyContent: 'center', paddingHorizontal: 9 },
  signOutText: { color: colors.leaf, fontSize: 12, fontWeight: '800' },
  childChoices: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 13 },
  childChoice: {
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 9,
    backgroundColor: colors.white,
  },
  childChoiceSelected: { borderColor: colors.leaf, backgroundColor: colors.pale },
  childChoiceText: { color: colors.ink, fontSize: 12, fontWeight: '800' },
  greeting: { color: colors.ink, fontSize: 18, fontWeight: '900', marginTop: 17 },
  small: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 5 },
  body: { color: colors.ink, fontSize: 13, lineHeight: 20, marginTop: 6 },
  section: {
    marginTop: 15,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 11,
    backgroundColor: colors.white,
  },
  sectionTitle: { color: colors.ink, fontSize: 14, fontWeight: '900' },
  pathway: {
    marginTop: 12,
    padding: 15,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 11,
    backgroundColor: colors.white,
  },
  pathTitle: { color: colors.ink, fontSize: 14, lineHeight: 19, fontWeight: '900' },
  stat: { color: colors.leaf, fontSize: 12, lineHeight: 18, fontWeight: '800', marginTop: 7 },
  recommendation: {
    marginTop: 13,
    padding: 14,
    borderLeftWidth: 3,
    borderLeftColor: colors.saffron,
    borderRadius: 9,
    backgroundColor: '#fff5ee',
  },
  opportunity: { paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: colors.line },
  application: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.line },
  timelineItem: { flexDirection: 'row', gap: 10, paddingTop: 13 },
  timelineDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    marginTop: 4,
    backgroundColor: colors.saffron,
  },
  timelineBody: {
    flex: 1,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  timelineTitle: { color: colors.ink, fontSize: 13, lineHeight: 18, fontWeight: '900' },
  disclaimer: { color: colors.muted, fontSize: 11, lineHeight: 17, marginTop: 15 },
  offline: {
    alignSelf: 'flex-start',
    padding: 8,
    marginTop: 10,
    borderRadius: 8,
    backgroundColor: '#fff0e6',
  },
  offlineText: { color: colors.saffron, fontSize: 11, fontWeight: '800' },
  loader: { marginTop: 40 },
});
