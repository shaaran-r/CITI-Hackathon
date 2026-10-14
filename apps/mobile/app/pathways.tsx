import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { Linking } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { useSQLiteContext } from 'expo-sqlite';
import * as Speech from 'expo-speech';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getLearningAdvice, getRecommendations, selectPathway, type PathwayCard } from '../src/api';
import type { LearningAdvice } from '@kaushalsetu/types';
import { readLocalJson, writeLocalJson } from '../src/local-store';
import type { OnboardingAnswers } from '@kaushalsetu/types';

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
  const [language, setLanguage] = useState('hi');
  const [advice, setAdvice] = useState<LearningAdvice | null>(null);
  const [adviceLoading, setAdviceLoading] = useState(false);
  const [adviceError, setAdviceError] = useState('');

  useEffect(() => {
    let active = true;
    void (async () => {
      const cached = await readLocalJson<PathwayCard[]>(database, 'cached_recommendations');
      if (cached && active) setCards(cached);
      const profile = await readLocalJson<OnboardingAnswers>(database, 'cached_profile');
      if (profile && active) setLanguage(profile.preferredLanguage);
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

  function readPathwayAloud(card: PathwayCard): void {
    const guidance: Record<string, string> = {
      hi: 'यह आपकी रुचियों के आधार पर एक सुझाव है, नौकरी या आय की गारंटी नहीं। अपने फैसले पर भरोसेमंद फ़ैसिलिटेटर से बात करें।',
      en: 'This is a suggestion based on your interests, not a promise of work or income. Discuss your next step with a trusted facilitator.',
      mr: 'हा तुमच्या आवडींवर आधारित एक पर्याय आहे; नोकरी किंवा उत्पन्नाची हमी नाही. पुढील पायरीबद्दल विश्वासू मार्गदर्शकाशी बोला.',
      bn: 'এটি আপনার আগ্রহের ভিত্তিতে একটি পরামর্শ, কাজ বা আয়ের নিশ্চয়তা নয়। পরের পদক্ষেপ নিয়ে বিশ্বস্ত সহায়কের সঙ্গে কথা বলুন।',
    };
    Speech.stop();
    Speech.speak(`${card.title}. ${guidance[language] ?? guidance.hi}`, {
      language: { hi: 'hi-IN', en: 'en-IN', mr: 'mr-IN', bn: 'bn-IN' }[language] ?? 'hi-IN',
    });
  }

  async function requestAdvice(): Promise<void> {
    setAdviceLoading(true);
    setAdviceError('');
    try {
      const studentId = await SecureStore.getItemAsync('studentId');
      if (!studentId) throw new Error('Sign in to get learning advice.');
      setAdvice(await getLearningAdvice(studentId));
    } catch (cause) {
      setAdviceError(cause instanceof Error ? cause.message : 'Learning advice is unavailable.');
    } finally {
      setAdviceLoading(false);
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
        <Pressable
          accessibilityRole="button"
          disabled={adviceLoading}
          onPress={() => void requestAdvice()}
          style={styles.adviceButton}
        >
          <Text style={styles.adviceButtonText}>
            {adviceLoading ? 'Thinking…' : 'Ask the learning guide'}
          </Text>
        </Pressable>
        {!!adviceError && (
          <Text accessibilityRole="alert" style={styles.message}>
            {adviceError}
          </Text>
        )}
        {advice && (
          <View style={styles.advicePanel}>
            <Text style={styles.adviceMode}>
              {advice.mode === 'LLM' ? 'SOURCE-GROUNDED AI' : 'EXPLAINABLE GUIDE'}
            </Text>
            <Text style={styles.adviceSummary}>{advice.summary}</Text>
            {advice.nextSteps.map((step, index) => (
              <View key={`${index}-${step.text}`} style={styles.adviceStep}>
                <Text style={styles.stepDescription}>{step.text}</Text>
                <View style={styles.adviceSources}>
                  {step.sources.map((source) => (
                    <Pressable
                      accessibilityRole="link"
                      key={`${step.text}-${source.name}`}
                      onPress={() => void Linking.openURL(source.url)}
                    >
                      <Text style={styles.sourceLinkText}>{source.name} ↗</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            ))}
            <Text style={styles.guidanceNote}>{advice.note}</Text>
          </View>
        )}
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
            <Text style={styles.sectionTitle}>What to learn next</Text>
            {(card.learningSteps ?? []).map((step) => (
              <View key={`${card.id}-${step.title}`} style={styles.learningStep}>
                <Text style={styles.stepTitle}>{step.title}</Text>
                <Text style={styles.stepDescription}>{step.description}</Text>
                <Pressable
                  accessibilityRole="link"
                  onPress={() => void Linking.openURL(step.sourceUrl)}
                  style={styles.sourceLink}
                >
                  <Text style={styles.sourceLinkText}>Explore {step.sourceName} ↗</Text>
                </Pressable>
              </View>
            ))}
            {(card.examOptions ?? []).length > 0 && (
              <View style={styles.examSection}>
                <Text style={styles.sectionTitle}>Exam to explore</Text>
                {(card.examOptions ?? []).map((exam) => (
                  <View key={`${card.id}-${exam.name}`}>
                    <Pressable
                      accessibilityRole="link"
                      onPress={() => void Linking.openURL(exam.url)}
                      style={styles.sourceLink}
                    >
                      <Text style={styles.sourceLinkText}>{exam.name} ↗</Text>
                    </Pressable>
                    <Text style={styles.stepDescription}>{exam.relevance}</Text>
                  </View>
                ))}
              </View>
            )}
            <Text style={styles.guidanceNote}>{card.guidanceNote}</Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => readPathwayAloud(card)}
              style={styles.listenButton}
            >
              <Text style={styles.listenText}>Hear guidance · सुनें</Text>
            </Pressable>
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
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/modules')}
          style={styles.modulesButton}
        >
          <Text style={styles.modulesButtonText}>Explore facilitator lessons</Text>
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
  sectionTitle: { color: colors.ink, fontSize: 13, fontWeight: '800', marginTop: 12 },
  learningStep: { borderLeftWidth: 2, borderLeftColor: colors.line, paddingLeft: 10, marginTop: 9 },
  stepTitle: { color: colors.ink, fontSize: 12, fontWeight: '800' },
  stepDescription: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 3 },
  sourceLink: { minHeight: 34, justifyContent: 'center', alignSelf: 'flex-start' },
  sourceLinkText: { color: colors.leaf, fontSize: 12, fontWeight: '800' },
  examSection: { borderTopWidth: 1, borderTopColor: colors.line, marginTop: 12, paddingTop: 2 },
  guidanceNote: { color: colors.muted, fontSize: 11, lineHeight: 16, marginTop: 8 },
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
  modulesButton: {
    minHeight: 50,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: colors.leaf,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  modulesButtonText: { color: colors.leaf, fontWeight: '800' },
  adviceButton: {
    alignSelf: 'flex-start',
    minHeight: 42,
    justifyContent: 'center',
    paddingHorizontal: 13,
    borderRadius: 8,
    backgroundColor: colors.leaf,
    marginTop: 12,
  },
  adviceButtonText: { color: colors.white, fontSize: 12, fontWeight: '800' },
  advicePanel: {
    padding: 14,
    marginTop: 12,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 8,
    backgroundColor: colors.white,
  },
  adviceMode: { color: colors.saffron, fontSize: 10, fontWeight: '900' },
  adviceSummary: { color: colors.ink, fontSize: 14, lineHeight: 20, marginTop: 6 },
  adviceStep: { borderTopWidth: 1, borderTopColor: colors.line, marginTop: 10, paddingTop: 8 },
  adviceSources: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  listenButton: { minHeight: 40, justifyContent: 'center', alignSelf: 'flex-start', marginTop: 4 },
  listenText: { color: colors.leaf, fontWeight: '700', fontSize: 13 },
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
