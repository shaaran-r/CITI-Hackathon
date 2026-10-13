import { useEffect, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useSQLiteContext } from 'expo-sqlite';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getAssignedMissions, type MissionAssignmentCard } from '../../src/api';
import {
  cacheMissions,
  getPendingSubmissions,
  queueMissionEvidence,
  readCachedMissions,
  setSubmissionSyncState,
} from '../../src/local-store';
import { submitMissionEvidence } from '../../src/api';

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
const checklistItems = [
  'I completed the activity',
  'I followed the safety steps',
  'I can describe what I learned',
];

export default function MissionDetailScreen(): React.JSX.Element {
  const { assignmentId } = useLocalSearchParams<{ assignmentId: string }>();
  const database = useSQLiteContext();
  const [assignment, setAssignment] = useState<MissionAssignmentCard | null>(null);
  const [localPendingEvidence, setLocalPendingEvidence] = useState(false);
  const [evidenceType, setEvidenceType] = useState<'NOTE' | 'CHECKLIST'>('NOTE');
  const [note, setNote] = useState('');
  const [checked, setChecked] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    let active = true;
    void (async () => {
      const pending = await getPendingSubmissions(database);
      if (active)
        setLocalPendingEvidence(pending.some((item) => item.assignmentId === assignmentId));
      const cached = await readCachedMissions(database);
      const found = cached.find((item) => item.id === assignmentId);
      if (found && active) setAssignment(found);
      try {
        const studentId = await SecureStore.getItemAsync('studentId');
        if (!studentId) return;
        const missions = await getAssignedMissions(studentId);
        await cacheMissions(database, missions);
        const current = missions.find((item) => item.id === assignmentId);
        if (current && active) setAssignment(current);
      } catch {
        if (!found && active)
          setMessage(
            'This mission is not in your offline list yet. Open the mission board while connected first.',
          );
      }
    })();
    return () => {
      active = false;
    };
  }, [assignmentId, database]);

  function toggleChecklist(item: string): void {
    setChecked((current) =>
      current.includes(item) ? current.filter((value) => value !== item) : [...current, item],
    );
  }

  async function submit(): Promise<void> {
    const evidenceNote = evidenceType === 'CHECKLIST' ? checked.join('\n') : note.trim();
    if (!assignment || !evidenceNote) {
      setMessage(
        evidenceType === 'CHECKLIST'
          ? 'Choose at least one completed step.'
          : 'Add a short note about what you did.',
      );
      return;
    }

    const clientSubmissionId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 14)}`;
    setBusy(true);
    setMessage('');
    try {
      await queueMissionEvidence(database, {
        clientSubmissionId,
        assignmentId: assignment.id,
        evidenceType,
        evidenceNote,
      });
      try {
        await submitMissionEvidence({
          assignmentId: assignment.id,
          clientSubmissionId,
          evidenceType,
          evidenceNote,
        });
        await setSubmissionSyncState(database, clientSubmissionId, 'SYNCED');
        setAssignment((current) => (current ? { ...current, status: 'SUBMITTED' } : current));
        setMessage('Your evidence was sent to your facilitator for review.');
      } catch {
        await setSubmissionSyncState(
          database,
          clientSubmissionId,
          'FAILED',
          'Waiting for a connection.',
        );
        setLocalPendingEvidence(true);
        setMessage('Saved on this phone. It will be sent when you sync while connected.');
      }
    } finally {
      setBusy(false);
    }
  }

  if (!assignment) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loading}>
          <Text style={styles.subtitle}>{message || 'Loading mission…'}</Text>
          <Pressable onPress={() => router.replace('/missions')} style={styles.back}>
            <Text style={styles.backText}>Back to missions</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const approved = assignment.status === 'APPROVED' || assignment.status === 'COMPLETED';
  const submitted = localPendingEvidence || assignment.status === 'SUBMITTED' || approved;
  const needsChanges =
    assignment.status === 'REJECTED' || assignment.status === 'RESUBMIT_REQUIRED';
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Pressable
          accessibilityRole="button"
          onPress={() => router.replace('/missions')}
          style={styles.back}
        >
          <Text style={styles.backText}>‹ All missions</Text>
        </Pressable>
        <Text style={styles.eyebrow}>MISSION DETAILS · KAAM KI JAANKARI</Text>
        <Text style={styles.title}>{assignment.mission.title}</Text>
        <Text style={styles.description}>{assignment.mission.description}</Text>
        <View style={styles.meta}>
          <Text style={styles.metaText}>{assignment.mission.estimatedMinutes} minutes</Text>
          <Text style={styles.metaText}>{assignment.mission.isDemo ? 'DEMO' : 'ASSIGNED'}</Text>
        </View>
        <Text style={styles.label}>Skills you will practice</Text>
        <View style={styles.skills}>
          {assignment.mission.skills.map((skill) => (
            <Text key={skill} style={styles.skill}>
              {skill}
            </Text>
          ))}
        </View>
        {submitted ? (
          <View style={styles.notice}>
            <Text style={styles.noticeTitle}>
              {localPendingEvidence
                ? 'Evidence saved on this phone'
                : approved
                  ? 'Mission approved · skill wallet updated'
                  : 'Under facilitator review'}
            </Text>
            <Text style={styles.subtitle}>
              {localPendingEvidence
                ? 'Sync from your mission list when you are connected.'
                : approved
                  ? 'Your verified skills and badges are now in your wallet.'
                  : 'Your work is saved. Your facilitator will review it.'}
            </Text>
            {!!assignment.latestSubmission?.reviewNote && (
              <Text style={styles.reviewNote}>
                Facilitator: {assignment.latestSubmission.reviewNote}
              </Text>
            )}
          </View>
        ) : (
          <>
            {needsChanges && (
              <View style={styles.revisionNotice}>
                <Text style={styles.noticeTitle}>Your facilitator asked you to try again</Text>
                <Text style={styles.subtitle}>
                  {assignment.latestSubmission?.reviewNote ||
                    'Add a little more detail and send it again.'}
                </Text>
              </View>
            )}
            <Text style={styles.label}>Show what you did</Text>
            <View style={styles.typeRow}>
              {(['NOTE', 'CHECKLIST'] as const)
                .filter((type) => assignment.mission.evidenceTypes.includes(type))
                .map((type) => (
                  <Pressable
                    key={type}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: evidenceType === type }}
                    onPress={() => setEvidenceType(type)}
                    style={[styles.typeButton, evidenceType === type && styles.typeSelected]}
                  >
                    <Text
                      style={[styles.typeText, evidenceType === type && styles.typeTextSelected]}
                    >
                      {type === 'NOTE' ? 'Write a note' : 'Checklist'}
                    </Text>
                  </Pressable>
                ))}
            </View>
            {evidenceType === 'NOTE' ? (
              <TextInput
                accessibilityLabel="Evidence note"
                maxLength={4000}
                multiline
                onChangeText={setNote}
                placeholder="What did you try? What did you notice?"
                style={styles.input}
                textAlignVertical="top"
                value={note}
              />
            ) : (
              <View style={styles.checklist}>
                {checklistItems.map((item) => (
                  <Pressable
                    key={item}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: checked.includes(item) }}
                    onPress={() => toggleChecklist(item)}
                    style={styles.checkRow}
                  >
                    <View style={[styles.check, checked.includes(item) && styles.checkOn]}>
                      <Text style={styles.checkMark}>{checked.includes(item) ? '✓' : ''}</Text>
                    </View>
                    <Text style={styles.checkLabel}>{item}</Text>
                  </Pressable>
                ))}
              </View>
            )}
            <Text style={styles.hint}>
              No photo or personal details are needed for this demo mission.
            </Text>
            {!!message && (
              <Text accessibilityRole="alert" style={styles.message}>
                {message}
              </Text>
            )}
            <Pressable
              accessibilityRole="button"
              disabled={busy}
              onPress={() => void submit()}
              style={styles.submit}
            >
              <Text style={styles.submitText}>{busy ? 'Saving…' : 'Save and send evidence'}</Text>
            </Pressable>
          </>
        )}
        {!!message && submitted && (
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
  loading: { flex: 1, justifyContent: 'center', padding: 24 },
  back: { minHeight: 42, justifyContent: 'center', alignSelf: 'flex-start', paddingRight: 12 },
  backText: { color: colors.leaf, fontWeight: '800' },
  eyebrow: {
    color: colors.saffron,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    marginTop: 14,
  },
  title: { color: colors.ink, fontSize: 28, lineHeight: 34, fontWeight: '800', marginTop: 9 },
  description: { color: colors.muted, fontSize: 15, lineHeight: 22, marginTop: 10 },
  meta: { flexDirection: 'row', gap: 18, marginTop: 15 },
  metaText: { color: colors.ink, fontSize: 12, fontWeight: '800' },
  label: { color: colors.ink, fontSize: 14, fontWeight: '800', marginTop: 24, marginBottom: 10 },
  skills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  skill: {
    color: colors.leaf,
    backgroundColor: colors.pale,
    borderRadius: 7,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 12,
    fontWeight: '700',
    overflow: 'hidden',
  },
  typeRow: { flexDirection: 'row', gap: 10 },
  typeButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 10,
    borderColor: colors.line,
    borderWidth: 1,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeSelected: { borderColor: colors.leaf, backgroundColor: colors.pale },
  typeText: { color: colors.ink, fontWeight: '700' },
  typeTextSelected: { color: colors.leaf, fontWeight: '900' },
  input: {
    minHeight: 150,
    backgroundColor: colors.white,
    color: colors.ink,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 11,
    padding: 14,
    marginTop: 12,
    fontSize: 15,
    lineHeight: 22,
  },
  checklist: { gap: 8, marginTop: 12 },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    minHeight: 48,
    padding: 10,
    backgroundColor: colors.white,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 10,
  },
  check: {
    width: 23,
    height: 23,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkOn: { backgroundColor: colors.leaf, borderColor: colors.leaf },
  checkMark: { color: colors.white, fontWeight: '900' },
  checkLabel: { flex: 1, color: colors.ink, lineHeight: 19 },
  hint: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 10 },
  submit: {
    minHeight: 54,
    borderRadius: 11,
    backgroundColor: colors.leaf,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
  },
  submitText: { color: colors.white, fontSize: 15, fontWeight: '800' },
  message: { color: colors.saffron, lineHeight: 20, marginTop: 14 },
  notice: { marginTop: 26, padding: 16, backgroundColor: colors.pale, borderRadius: 11 },
  revisionNotice: { marginTop: 22, padding: 16, backgroundColor: '#fff0e6', borderRadius: 11 },
  reviewNote: { color: colors.leaf, lineHeight: 20, marginTop: 10, fontWeight: '700' },
  noticeTitle: { color: colors.leaf, fontSize: 16, fontWeight: '900', marginBottom: 6 },
  subtitle: { color: colors.muted, lineHeight: 21 },
});
