import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useSQLiteContext } from 'expo-sqlite';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getRecommendations, selectPathway, type PathwayCard } from '../src/api';
import { readLocalJson, writeLocalJson } from '../src/local-store';

const colors = {
  ink: '#183b32',
  leaf: '#2d7658',
  saffron: '#d87936',
  paper: '#f5f3e9',
  white: '#fffefa',
  line: '#d8dfd5',
  muted: '#64766e',
};
const labels: Record<string, string> = {
  QUICK_EARNING: 'Start nearby',
  VOCATIONAL_GROWTH: 'Build a skill',
  LONG_TERM_ACADEMIC: 'Keep studying',
};

export default function PathwaysScreen(): React.JSX.Element {
  const database = useSQLiteContext();
  const [cards, setCards] = useState<PathwayCard[]>([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    void (async () => {
      const cached = await readLocalJson<PathwayCard[]>(database, 'cached_recommendations');
      if (cached && active) setCards(cached);
      const studentId = await SecureStore.getItemAsync('studentId');
      if (!studentId) {
        if (active) {
          setMessage('Please sign in to see your pathways.');
          setLoading(false);
        }
        return;
      }
      try {
        const result = await getRecommendations(studentId);
        await writeLocalJson(database, 'cached_recommendations', result);
        if (active) setCards(result);
      } catch {
        if (!cached && active)
          setMessage('Finish onboarding while connected to see your pathway cards.');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [database]);

  async function choose(pathwayId: string): Promise<void> {
    setMessage('');
    try {
      await selectPathway(pathwayId);
      setCards((current) =>
        current.map((card) => ({
          ...card,
          status: card.id === pathwayId ? 'SELECTED' : 'RECOMMENDED',
        })),
      );
      setMessage('Saved. You can change this choice later.');
    } catch {
      setMessage('Could not save your choice yet. Try again when connected.');
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.eyebrow}>YOUR NEXT STEPS · AAPKE RAASTE</Text>
        <Text style={styles.title}>Three paths to explore</Text>
        <Text style={styles.subtitle}>
          A starting point based on what you shared. You are in charge of what comes next.
        </Text>
        {loading && cards.length === 0 && (
          <ActivityIndicator color={colors.leaf} size="large" style={styles.loader} />
        )}
        {!loading && cards.length === 0 && (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No pathways yet</Text>
            <Text style={styles.subtitle}>{message}</Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.replace('/onboarding')}
              style={styles.button}
            >
              <Text style={styles.buttonText}>Continue onboarding</Text>
            </Pressable>
          </View>
        )}
        {cards.map((card) => (
          <View key={card.id} style={styles.card}>
            <View style={styles.cardTop}>
              <Text style={styles.rank}>0{card.rank}</Text>
              <Text style={styles.track}>{labels[card.pathwayType] ?? 'Explore'}</Text>
              {card.isDemo && <Text style={styles.demo}>DEMO</Text>}
            </View>
            <Text style={styles.cardTitle}>{card.title}</Text>
            <Text style={styles.description}>{card.description}</Text>
            <View style={styles.meta}>
              <Text style={styles.metaText}>{card.durationWeeks} weeks</Text>
              <Text style={styles.metaText}>Match {Math.round(card.score)}%</Text>
            </View>
            {(card.estimatedMonthlyEarningsMin > 0 || card.estimatedMonthlyEarningsMax > 0) && (
              <Text style={styles.earnings}>
                Sample earning range: ₹{card.estimatedMonthlyEarningsMin.toLocaleString('en-IN')}–₹
                {card.estimatedMonthlyEarningsMax.toLocaleString('en-IN')} / month
              </Text>
            )}
            <Text style={styles.rationale}>{card.rationale}</Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => void choose(card.id)}
              style={[styles.selectButton, card.status === 'SELECTED' && styles.selectedButton]}
            >
              <Text style={[styles.selectText, card.status === 'SELECTED' && styles.selectedText]}>
                {card.status === 'SELECTED' ? 'Chosen · चुना गया' : 'Choose this path'}
              </Text>
            </Pressable>
          </View>
        ))}
        {!!message && cards.length > 0 && (
          <Text accessibilityRole="alert" style={styles.message}>
            {message}
          </Text>
        )}
        <Text style={styles.disclaimer}>
          Demo pathways are examples, not promises of admission, training, or income. Check local
          options with a trusted facilitator.
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.replace('/onboarding')}
          style={styles.edit}
        >
          <Text style={styles.editText}>Update my answers</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/missions')}
          style={styles.missionsButton}
        >
          <Text style={styles.missionsButtonText}>Go to my missions</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.paper },
  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 36,
    maxWidth: 640,
    width: '100%',
    alignSelf: 'center',
  },
  eyebrow: {
    color: colors.saffron,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 10,
  },
  title: { color: colors.ink, fontSize: 30, lineHeight: 36, fontWeight: '800' },
  subtitle: { color: colors.muted, fontSize: 15, lineHeight: 22, marginTop: 9 },
  loader: { marginTop: 50 },
  empty: { marginTop: 28, padding: 20, backgroundColor: colors.white, borderRadius: 14 },
  emptyTitle: { color: colors.ink, fontSize: 18, fontWeight: '800' },
  card: {
    backgroundColor: colors.white,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 14,
    padding: 17,
    marginTop: 14,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  rank: { color: colors.saffron, fontSize: 13, fontWeight: '900' },
  track: { color: colors.leaf, fontSize: 12, fontWeight: '800', flex: 1 },
  demo: { color: colors.saffron, fontSize: 10, fontWeight: '900' },
  cardTitle: { color: colors.ink, fontSize: 19, fontWeight: '800', marginTop: 12 },
  description: { color: colors.muted, lineHeight: 20, marginTop: 6 },
  meta: { flexDirection: 'row', gap: 16, marginTop: 13 },
  metaText: { color: colors.ink, fontWeight: '700', fontSize: 12 },
  earnings: { color: colors.ink, fontSize: 12, marginTop: 9 },
  rationale: { color: colors.leaf, fontSize: 13, lineHeight: 19, marginTop: 11 },
  selectButton: {
    marginTop: 15,
    borderColor: colors.leaf,
    borderWidth: 1,
    minHeight: 46,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedButton: { backgroundColor: colors.leaf },
  selectText: { color: colors.leaf, fontWeight: '800' },
  selectedText: { color: colors.white },
  message: { color: colors.saffron, lineHeight: 20, marginTop: 14 },
  disclaimer: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 20 },
  edit: { minHeight: 50, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  editText: { color: colors.leaf, fontWeight: '800' },
  missionsButton: {
    minHeight: 52,
    borderRadius: 11,
    backgroundColor: colors.leaf,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  missionsButtonText: { color: colors.white, fontWeight: '800' },
  button: {
    backgroundColor: colors.leaf,
    minHeight: 50,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
  },
  buttonText: { color: colors.white, fontWeight: '800' },
});
