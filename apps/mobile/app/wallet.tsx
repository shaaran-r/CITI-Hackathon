import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useSQLiteContext } from 'expo-sqlite';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getWallet, type WalletSummary } from '../src/api';
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

export default function WalletScreen(): React.JSX.Element {
  const database = useSQLiteContext();
  const [wallet, setWallet] = useState<WalletSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);
  const [message, setMessage] = useState('');

  async function load(): Promise<void> {
    setLoading(true);
    setMessage('');
    const cached = await readLocalJson<WalletSummary>(database, 'cached_wallet');
    if (cached) setWallet(cached);
    const studentId = await SecureStore.getItemAsync('studentId');
    if (!studentId) {
      setMessage('Sign in to see your verified skills.');
      setLoading(false);
      return;
    }
    try {
      const latest = await getWallet(studentId);
      await writeLocalJson(database, 'cached_wallet', latest);
      setWallet(latest);
      setOffline(false);
    } catch {
      setOffline(true);
      if (!cached) setMessage('Your wallet is not available offline yet. Connect once to load it.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [database]);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.replace('/missions')}
          style={styles.back}
        >
          <Text style={styles.backText}>‹ Missions</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/parent')}
          style={styles.familyLink}
        >
          <Text style={styles.familyLinkText}>Family view · परिवार के लिए</Text>
        </Pressable>
        <Text style={styles.eyebrow}>SKILL WALLET · KAUSHAL THAILA</Text>
        <Text style={styles.title}>What you can do</Text>
        <Text style={styles.subtitle}>
          Skills appear here after a facilitator verifies your mission work.
        </Text>
        <View style={[styles.sync, offline && styles.offline]}>
          <View style={[styles.dot, !offline && styles.online]} />
          <Text style={styles.syncText}>
            {offline ? 'Showing saved wallet' : 'Wallet is up to date'}
          </Text>
        </View>
        {loading && !wallet && (
          <ActivityIndicator color={colors.leaf} size="large" style={styles.loader} />
        )}
        {wallet && (
          <>
            <View style={styles.scoreRow}>
              <View style={styles.scoreBlock}>
                <Text style={styles.score}>{wallet.readinessScore}</Text>
                <Text style={styles.scoreLabel}>readiness score</Text>
              </View>
              <View style={styles.scoreDivider} />
              <View style={styles.countBlock}>
                <Text style={styles.count}>
                  {wallet.missionSummary.approved} / {wallet.missionSummary.total}
                </Text>
                <Text style={styles.scoreLabel}>missions approved</Text>
                <Text style={styles.small}>
                  {wallet.missionSummary.awaitingReview} under review
                </Text>
              </View>
            </View>

            <Text style={styles.sectionTitle}>Verified skills</Text>
            {wallet.verifiedSkills.length ? (
              <View style={styles.skillList}>
                {wallet.verifiedSkills.map((skill) => (
                  <View key={skill} style={styles.skillRow}>
                    <View style={styles.check}>
                      <Text style={styles.checkText}>✓</Text>
                    </View>
                    <Text style={styles.skillText}>{skill}</Text>
                    <Text style={styles.verified}>VERIFIED</Text>
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.empty}>
                <Text style={styles.emptyTitle}>Your first skill is waiting</Text>
                <Text style={styles.small}>
                  Complete a mission and ask your facilitator to review it.
                </Text>
              </View>
            )}

            <Text style={styles.sectionTitle}>Badges</Text>
            {wallet.badges.length ? (
              wallet.badges.map((badge) => (
                <View key={badge.id} style={styles.badgeRow}>
                  <View style={styles.badgeMark}>✦</View>
                  <View style={styles.badgeCopy}>
                    <Text style={styles.badgeTitle}>{badge.title}</Text>
                    <Text style={styles.small}>{badge.description}</Text>
                  </View>
                  <Text style={styles.verified}>✓</Text>
                </View>
              ))
            ) : (
              <Text style={styles.small}>Verified badges will appear here.</Text>
            )}

            <Text style={styles.sectionTitle}>Your pathway</Text>
            <View style={styles.pathway}>
              <Text style={styles.pathwayTitle}>
                {wallet.pathwayProgress?.title ?? 'Choose a pathway'}
              </Text>
              <Text style={styles.small}>
                {wallet.pathwayProgress?.trackingAvailable
                  ? `${wallet.pathwayProgress.progressPercent}% complete`
                  : 'Learning progress will show here as lessons are added.'}
              </Text>
            </View>

            {!!wallet.recentComments.length && (
              <>
                <Text style={styles.sectionTitle}>Facilitator notes</Text>
                {wallet.recentComments.map((comment) => (
                  <View key={comment.submissionId} style={styles.comment}>
                    <Text style={styles.commentStatus}>{comment.status.replaceAll('_', ' ')}</Text>
                    <Text style={styles.commentText}>{comment.note}</Text>
                  </View>
                ))}
              </>
            )}
            <Text style={styles.small}>
              Verified by facilitators · {wallet.missionSummary.facilitatorValidations} review
              {wallet.missionSummary.facilitatorValidations === 1 ? '' : 's'}
            </Text>
          </>
        )}
        {!!message && (
          <Text accessibilityRole="alert" style={styles.message}>
            {message}
          </Text>
        )}
        <Pressable accessibilityRole="button" onPress={() => void load()} style={styles.refresh}>
          <Text style={styles.refreshText}>{loading ? 'Refreshing…' : 'Refresh wallet'}</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.paper },
  content: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 36,
    maxWidth: 640,
    width: '100%',
    alignSelf: 'center',
  },
  back: { minHeight: 40, justifyContent: 'center', alignSelf: 'flex-start', paddingRight: 12 },
  backText: { color: colors.leaf, fontWeight: '800' },
  familyLink: { minHeight: 38, justifyContent: 'center', alignSelf: 'flex-end', marginTop: -39 },
  familyLinkText: { color: colors.leaf, fontSize: 12, fontWeight: '800' },
  eyebrow: {
    color: colors.saffron,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    marginTop: 14,
  },
  title: { color: colors.ink, fontSize: 30, lineHeight: 36, fontWeight: '800', marginTop: 8 },
  subtitle: { color: colors.muted, fontSize: 15, lineHeight: 22, marginTop: 8 },
  sync: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 11,
    marginTop: 15,
    backgroundColor: colors.pale,
    borderRadius: 8,
  },
  offline: { backgroundColor: '#fff0e6' },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.saffron },
  online: { backgroundColor: colors.leaf },
  syncText: { color: colors.ink, fontSize: 12, fontWeight: '700' },
  loader: { marginTop: 45 },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.ink,
    borderRadius: 13,
    padding: 18,
    marginTop: 17,
  },
  scoreBlock: { alignItems: 'center', minWidth: 104 },
  score: { color: colors.white, fontSize: 42, lineHeight: 48, fontWeight: '900' },
  scoreLabel: { color: colors.white, fontSize: 11, fontWeight: '700', marginTop: 3 },
  scoreDivider: { height: 52, width: 1, backgroundColor: '#587268', marginHorizontal: 13 },
  countBlock: { flex: 1, alignItems: 'center' },
  count: { color: colors.white, fontSize: 23, fontWeight: '900' },
  small: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 4 },
  sectionTitle: {
    color: colors.ink,
    fontSize: 17,
    fontWeight: '900',
    marginTop: 25,
    marginBottom: 10,
  },
  skillList: {
    backgroundColor: colors.white,
    borderRadius: 11,
    borderColor: colors.line,
    borderWidth: 1,
    paddingHorizontal: 13,
  },
  skillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    minHeight: 48,
    borderBottomColor: colors.line,
    borderBottomWidth: 1,
  },
  check: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.pale,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkText: { color: colors.leaf, fontWeight: '900', fontSize: 12 },
  skillText: { color: colors.ink, flex: 1, fontSize: 14, fontWeight: '700' },
  verified: { color: colors.leaf, fontSize: 10, fontWeight: '900' },
  empty: {
    padding: 15,
    backgroundColor: colors.white,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 10,
  },
  emptyTitle: { color: colors.ink, fontWeight: '800' },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    padding: 13,
    marginBottom: 8,
    backgroundColor: colors.white,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 10,
  },
  badgeMark: {
    width: 35,
    height: 35,
    borderRadius: 10,
    backgroundColor: '#fff0e6',
    color: colors.saffron,
    textAlign: 'center',
    textAlignVertical: 'center',
    fontSize: 19,
  },
  badgeCopy: { flex: 1 },
  badgeTitle: { color: colors.ink, fontSize: 14, fontWeight: '800' },
  pathway: {
    padding: 14,
    backgroundColor: colors.white,
    borderRadius: 10,
    borderColor: colors.line,
    borderWidth: 1,
  },
  pathwayTitle: { color: colors.ink, fontSize: 15, fontWeight: '800' },
  comment: {
    padding: 12,
    marginBottom: 8,
    backgroundColor: colors.white,
    borderRadius: 9,
    borderLeftWidth: 3,
    borderLeftColor: colors.saffron,
  },
  commentStatus: { color: colors.leaf, fontSize: 10, fontWeight: '900' },
  commentText: { color: colors.ink, fontSize: 13, lineHeight: 19, marginTop: 5 },
  message: { color: colors.saffron, lineHeight: 20, marginTop: 13 },
  refresh: { minHeight: 48, alignItems: 'center', justifyContent: 'center', marginTop: 16 },
  refreshText: { color: colors.leaf, fontWeight: '800' },
});
