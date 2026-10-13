import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useSQLiteContext } from 'expo-sqlite';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  getApplications,
  updateApplicationStatus,
  type OpportunityApplicationCard,
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

function statusLabel(status: string): string {
  return status
    .replaceAll('_', ' ')
    .toLocaleLowerCase()
    .replace(/(^|\s)\S/g, (letter) => letter.toUpperCase());
}

export default function ApplicationsScreen(): React.JSX.Element {
  const database = useSQLiteContext();
  const [applications, setApplications] = useState<OpportunityApplicationCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState('');
  const [message, setMessage] = useState('');

  async function load(): Promise<void> {
    setLoading(true);
    const cached = await readLocalJson<OpportunityApplicationCard[]>(
      database,
      'cached_applications',
    );
    if (cached) setApplications(cached);
    const studentId = await SecureStore.getItemAsync('studentId');
    if (!studentId) {
      setMessage('Sign in to see your applications.');
      setLoading(false);
      return;
    }
    try {
      const rows = await getApplications(studentId);
      setApplications(rows);
      await writeLocalJson(database, 'cached_applications', rows);
    } catch {
      if (!cached)
        setMessage('Applications are not available offline yet. Connect once to load them.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [database]);

  async function submit(application: OpportunityApplicationCard): Promise<void> {
    setBusyId(application.id);
    setMessage('');
    try {
      const updated = await updateApplicationStatus(application.id, 'SUBMITTED');
      setApplications((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      );
      await writeLocalJson(
        database,
        'cached_applications',
        applications.map((item) => (item.id === updated.id ? updated : item)),
      );
      setMessage('Your application is marked as submitted.');
    } catch {
      setMessage('Could not update the application. Try again when connected.');
    } finally {
      setBusyId('');
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.replace('/opportunities')}
          style={styles.back}
        >
          <Text style={styles.backText}>‹ Opportunities</Text>
        </Pressable>
        <Text style={styles.eyebrow}>APPLICATIONS · AAVEDAN</Text>
        <Text style={styles.title}>Your next steps</Text>
        <Text style={styles.subtitle}>
          Track progress and ask your facilitator for help when you need it.
        </Text>
        {loading && !applications.length && (
          <ActivityIndicator color={colors.leaf} size="large" style={styles.loader} />
        )}
        {!loading && !applications.length && (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No applications started</Text>
            <Text style={styles.subtitle}>
              Open a matched opportunity to review its requirements and start one.
            </Text>
            <Pressable onPress={() => router.replace('/opportunities')} style={styles.primary}>
              <Text style={styles.primaryText}>See matched opportunities</Text>
            </Pressable>
          </View>
        )}
        {applications.map((application) => (
          <View key={application.id} style={styles.card}>
            <View style={styles.top}>
              <Text style={styles.type}>{application.opportunity.type.replaceAll('_', ' ')}</Text>
              <Text style={styles.status}>{statusLabel(application.status)}</Text>
            </View>
            <Text style={styles.cardTitle}>{application.opportunity.title}</Text>
            {application.opportunity.applyBy && (
              <Text style={styles.deadline}>
                Deadline · {new Date(application.opportunity.applyBy).toLocaleDateString()}
              </Text>
            )}
            <Text style={styles.sectionLabel}>Documents to prepare</Text>
            {application.documentsChecklist.map((document) => (
              <Text key={document} style={styles.document}>
                □ {document}
              </Text>
            ))}
            {!!application.facilitatorNote && (
              <Text style={styles.facilitatorNote}>Facilitator: {application.facilitatorNote}</Text>
            )}
            {application.status === 'IN_PROGRESS' && (
              <Pressable
                accessibilityRole="button"
                disabled={busyId === application.id}
                onPress={() => void submit(application)}
                style={styles.submit}
              >
                <Text style={styles.submitText}>
                  {busyId === application.id ? 'Saving…' : 'Mark application submitted'}
                </Text>
              </Pressable>
            )}
            {application.helpRequestedAt && (
              <Text style={styles.helpState}>Facilitator help requested</Text>
            )}
          </View>
        ))}
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
    paddingTop: 10,
    paddingBottom: 36,
    maxWidth: 640,
    width: '100%',
    alignSelf: 'center',
  },
  back: { minHeight: 40, justifyContent: 'center', alignSelf: 'flex-start' },
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
  loader: { marginTop: 45 },
  empty: {
    marginTop: 18,
    padding: 18,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 11,
  },
  emptyTitle: { color: colors.ink, fontSize: 17, fontWeight: '800' },
  card: {
    padding: 15,
    marginTop: 12,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 11,
  },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  type: { color: colors.saffron, fontSize: 10, fontWeight: '900' },
  status: { color: colors.leaf, fontSize: 10, fontWeight: '900' },
  cardTitle: { color: colors.ink, fontSize: 17, fontWeight: '800', marginTop: 9 },
  deadline: { color: colors.muted, fontSize: 12, marginTop: 6 },
  sectionLabel: {
    color: colors.ink,
    fontSize: 12,
    fontWeight: '800',
    marginTop: 14,
    marginBottom: 5,
  },
  document: { color: colors.muted, fontSize: 12, lineHeight: 20 },
  facilitatorNote: {
    color: colors.leaf,
    backgroundColor: colors.pale,
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
    fontSize: 12,
    lineHeight: 18,
  },
  submit: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.leaf,
    borderRadius: 9,
    marginTop: 12,
  },
  submitText: { color: colors.white, fontWeight: '800', fontSize: 12 },
  helpState: { color: colors.saffron, fontSize: 11, fontWeight: '800', marginTop: 10 },
  primary: {
    minHeight: 45,
    backgroundColor: colors.leaf,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9,
    marginTop: 13,
  },
  primaryText: { color: colors.white, fontWeight: '800', fontSize: 12 },
  message: { color: colors.saffron, lineHeight: 20, marginTop: 13 },
});
