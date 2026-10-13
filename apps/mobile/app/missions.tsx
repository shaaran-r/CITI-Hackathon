import { useCallback, useEffect, useState } from 'react';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useSQLiteContext } from 'expo-sqlite';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getAssignedMissions, type MissionAssignmentCard } from '../src/api';
import {
  cacheMissions,
  getPendingSubmissions,
  readCachedMissions,
  type PendingSubmission,
} from '../src/local-store';
import { syncPendingMissionEvidence } from '../src/mission-sync';

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

export default function MissionsScreen(): React.JSX.Element {
  const database = useSQLiteContext();
  const [missions, setMissions] = useState<MissionAssignmentCard[]>([]);
  const [pending, setPending] = useState<PendingSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [offline, setOffline] = useState(false);
  const [message, setMessage] = useState('');

  const refresh = useCallback(
    async (trySync: boolean): Promise<void> => {
      const cached = await readCachedMissions(database);
      if (cached.length) setMissions(cached);
      setPending(await getPendingSubmissions(database));

      const studentId = await SecureStore.getItemAsync('studentId');
      if (!studentId) {
        setMessage('Sign in to see missions assigned to you.');
        setLoading(false);
        return;
      }

      try {
        const assigned = await getAssignedMissions(studentId);
        await cacheMissions(database, assigned);
        setMissions(assigned);
        setOffline(false);
        if (trySync) {
          const result = await syncPendingMissionEvidence(database);
          setPending(await getPendingSubmissions(database));
          if (result.synced) {
            const refreshed = await getAssignedMissions(studentId);
            await cacheMissions(database, refreshed);
            setMissions(refreshed);
            setMessage(
              `${result.synced} submission${result.synced === 1 ? '' : 's'} sent for review.`,
            );
          }
        }
      } catch {
        setOffline(true);
        if (!cached.length)
          setMessage('Your mission list is unavailable offline. Connect once to load it.');
      } finally {
        setLoading(false);
      }
    },
    [database],
  );

  useEffect(() => {
    void refresh(true);
  }, [refresh]);

  async function syncNow(): Promise<void> {
    setSyncing(true);
    setMessage('');
    try {
      const result = await syncPendingMissionEvidence(database);
      setPending(await getPendingSubmissions(database));
      const studentId = await SecureStore.getItemAsync('studentId');
      if (studentId && result.synced) {
        const assigned = await getAssignedMissions(studentId);
        await cacheMissions(database, assigned);
        setMissions(assigned);
      }
      setMessage(
        result.synced
          ? `${result.synced} submission${result.synced === 1 ? '' : 's'} sent for review.`
          : 'Nothing new could sync. Pending work stays saved on this phone.',
      );
    } finally {
      setSyncing(false);
    }
  }

  const queuedIds = new Set(pending.map((item) => item.assignmentId));

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.replace('/pathways')}
          style={styles.back}
        >
          <Text style={styles.backText}>‹ Pathways</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/wallet')}
          style={styles.walletLink}
        >
          <Text style={styles.walletLinkText}>My skill wallet</Text>
        </Pressable>
        <Text style={styles.eyebrow}>VILLAGE MISSIONS · GAON KE KAAM</Text>
        <Text style={styles.title}>Learn by doing</Text>
        <Text style={styles.subtitle}>
          Small real-world activities help you practice and show what you can do.
        </Text>
        <View style={[styles.syncBar, offline && styles.offlineBar]}>
          <View style={styles.syncCopy}>
            <View style={[styles.dot, !offline && styles.dotOnline]} />
            <Text style={styles.syncText}>
              {offline
                ? 'Offline · saved missions are available'
                : 'Connected · your mission list is up to date'}
            </Text>
          </View>
          <Text style={styles.queueText}>{pending.length} pending</Text>
        </View>
        {pending.length > 0 && (
          <Pressable
            accessibilityRole="button"
            disabled={syncing}
            onPress={() => void syncNow()}
            style={styles.syncButton}
          >
            {syncing ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.syncButtonText}>Sync pending evidence</Text>
            )}
          </Pressable>
        )}
        {loading && missions.length === 0 && (
          <ActivityIndicator color={colors.leaf} size="large" style={styles.loader} />
        )}
        {!loading && missions.length === 0 && (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No missions assigned yet</Text>
            <Text style={styles.subtitle}>A facilitator will add your first activity here.</Text>
          </View>
        )}
        {missions.map((assignment) => {
          const queued = queuedIds.has(assignment.id);
          const statusLabel = queued
            ? 'PENDING SYNC'
            : assignment.status === 'APPROVED' || assignment.status === 'COMPLETED'
              ? 'APPROVED · WALLET UPDATED'
              : assignment.status === 'RESUBMIT_REQUIRED' || assignment.status === 'REJECTED'
                ? 'CHANGES REQUESTED'
                : assignment.status === 'SUBMITTED'
                  ? 'UNDER REVIEW'
                  : 'READY';
          return (
            <Pressable
              accessibilityRole="button"
              key={assignment.id}
              onPress={() =>
                router.push({
                  pathname: '/mission/[assignmentId]',
                  params: { assignmentId: assignment.id },
                })
              }
              style={styles.card}
            >
              <View style={styles.cardTop}>
                <Text style={styles.demo}>
                  {assignment.mission.isDemo ? 'DEMO MISSION' : 'MISSION'}
                </Text>
                <Text style={styles.status}>{statusLabel}</Text>
              </View>
              <Text style={styles.cardTitle}>{assignment.mission.title}</Text>
              <Text style={styles.description}>{assignment.mission.description}</Text>
              {!!assignment.latestSubmission?.reviewNote && (
                <Text style={styles.reviewNote} numberOfLines={2}>
                  Facilitator: {assignment.latestSubmission.reviewNote}
                </Text>
              )}
              <View style={styles.skills}>
                {assignment.mission.skills.map((skill) => (
                  <Text key={skill} style={styles.skill}>
                    {skill}
                  </Text>
                ))}
              </View>
              <View style={styles.cardFooter}>
                <Text style={styles.meta}>{assignment.mission.estimatedMinutes} min</Text>
                <Text style={styles.open}>Open mission ›</Text>
              </View>
            </Pressable>
          );
        })}
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
    paddingTop: 12,
    paddingBottom: 35,
    maxWidth: 640,
    width: '100%',
    alignSelf: 'center',
  },
  back: { minHeight: 40, justifyContent: 'center', alignSelf: 'flex-start', paddingRight: 12 },
  backText: { color: colors.leaf, fontWeight: '800' },
  walletLink: { minHeight: 38, justifyContent: 'center', alignSelf: 'flex-end', marginTop: -39 },
  walletLinkText: { color: colors.leaf, fontWeight: '800', fontSize: 12 },
  eyebrow: {
    color: colors.saffron,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    marginTop: 14,
  },
  title: { color: colors.ink, fontSize: 30, lineHeight: 36, fontWeight: '800', marginTop: 8 },
  subtitle: { color: colors.muted, fontSize: 15, lineHeight: 22, marginTop: 8 },
  syncBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 19,
    padding: 12,
    backgroundColor: colors.pale,
    borderRadius: 10,
  },
  offlineBar: { backgroundColor: '#fff0e6' },
  syncCopy: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.saffron },
  dotOnline: { backgroundColor: colors.leaf },
  syncText: { color: colors.ink, fontSize: 12, fontWeight: '700', flexShrink: 1 },
  queueText: { color: colors.muted, fontSize: 11, fontWeight: '700' },
  syncButton: {
    minHeight: 46,
    marginTop: 10,
    backgroundColor: colors.leaf,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  syncButtonText: { color: colors.white, fontWeight: '800' },
  loader: { marginTop: 45 },
  empty: {
    marginTop: 18,
    padding: 18,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
  },
  emptyTitle: { color: colors.ink, fontSize: 17, fontWeight: '800' },
  card: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  demo: { color: colors.saffron, fontSize: 10, fontWeight: '900' },
  status: { color: colors.leaf, fontSize: 10, fontWeight: '900' },
  cardTitle: { color: colors.ink, fontSize: 18, fontWeight: '800', marginTop: 11 },
  description: { color: colors.muted, lineHeight: 20, marginTop: 6 },
  reviewNote: {
    color: colors.saffron,
    backgroundColor: '#fff0e6',
    borderRadius: 8,
    padding: 9,
    marginTop: 9,
    lineHeight: 18,
    fontSize: 12,
  },
  skills: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 11 },
  skill: {
    color: colors.leaf,
    backgroundColor: colors.pale,
    overflow: 'hidden',
    borderRadius: 7,
    paddingHorizontal: 9,
    paddingVertical: 5,
    fontSize: 11,
    fontWeight: '700',
  },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 14 },
  meta: { color: colors.muted, fontSize: 12 },
  open: { color: colors.leaf, fontSize: 12, fontWeight: '800' },
  message: { color: colors.saffron, lineHeight: 20, marginTop: 14 },
});
