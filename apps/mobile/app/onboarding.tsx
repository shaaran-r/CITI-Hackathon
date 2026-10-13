import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { completeProfile } from '../src/api';
import { readLocalJson, writeLocalJson } from '../src/local-store';
import type {
  DeviceAccess,
  FutureGoal,
  IncomeUrgency,
  Mobility,
  OnboardingAnswers,
} from '@kaushalsetu/types';

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
const interestOptions = ['agriculture', 'technology', 'health', 'business', 'science', 'design'];
const strengthOptions = [
  'communication',
  'observation',
  'planning',
  'problem-solving',
  'practical work',
  'care',
];
const languageOptions: [string, string][] = [
  ['hi', 'हिंदी'],
  ['en', 'English'],
  ['mr', 'मराठी'],
  ['bn', 'বাংলা'],
];
const timeOptions: [number, string][] = [
  [30, '30 min'],
  [60, '1 hour'],
  [120, '2 hours'],
];
const mobilityOptions: [Mobility, string][] = [
  ['LOCAL_ONLY', 'Close to home'],
  ['SOME_TRAVEL', 'Nearby travel'],
  ['CAN_RELOCATE', 'Can relocate'],
];
const deviceOptions: [DeviceAccess, string][] = [
  ['PERSONAL', 'My own'],
  ['SHARED', 'Shared'],
  ['LIMITED', 'Limited'],
];
const urgencyOptions: [IncomeUrgency, string][] = [
  ['HIGH', 'Soon'],
  ['MEDIUM', 'In time'],
  ['LOW', 'Not urgent'],
];
const defaultAnswers: OnboardingAnswers = {
  gradeLevel: '10',
  preferredLanguage: 'hi',
  district: '',
  state: '',
  interests: [],
  strengths: [],
  dailyAvailableMinutes: 60,
  mobility: 'LOCAL_ONLY',
  deviceAccess: 'SHARED',
  incomeUrgency: 'MEDIUM',
  futureGoal: 'BALANCED',
};

export default function OnboardingScreen(): React.JSX.Element {
  const database = useSQLiteContext();
  const [answers, setAnswers] = useState<OnboardingAnswers>(defaultAnswers);
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    let active = true;
    void readLocalJson<OnboardingAnswers>(database, 'onboarding_draft').then((draft) => {
      if (active && draft) setAnswers(draft);
    });
    return () => {
      active = false;
    };
  }, [database]);

  function update<K extends keyof OnboardingAnswers>(key: K, value: OnboardingAnswers[K]): void {
    setAnswers((current) => ({ ...current, [key]: value }));
  }

  function toggle(key: 'interests' | 'strengths', value: string): void {
    const current = answers[key];
    update(
      key,
      current.includes(value) ? current.filter((item) => item !== value) : [...current, value],
    );
  }

  async function next(): Promise<void> {
    setMessage('');
    if (step === 0 && !answers.gradeLevel.trim()) {
      setMessage('Please add your class or year.');
      return;
    }
    if (step === 1 && answers.interests.length === 0) {
      setMessage('Choose at least one interest so we can tailor your options.');
      return;
    }
    await writeLocalJson(database, 'onboarding_draft', answers);
    if (step < 3) {
      setStep((current) => current + 1);
      return;
    }

    setBusy(true);
    try {
      const result = await completeProfile(answers);
      await writeLocalJson(database, 'cached_recommendations', result.recommendations);
      await writeLocalJson(database, 'cached_profile', answers);
      await writeLocalJson(database, 'onboarding_draft', null);
      router.replace('/pathways');
    } catch {
      setMessage(
        'Your answers are saved on this phone. Connect to the server to get your pathway cards.',
      );
    } finally {
      setBusy(false);
    }
  }

  const headings = [
    ['About you', 'Aapke baare mein'],
    ['What feels like you?', 'Aapko kya pasand hai?'],
    ['Your day, your way', 'Aapki suvidha'],
    ['What would you like next?', 'Aapka agla kadam'],
  ] as const;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.topline}>
          <Text style={styles.brand}>KaushalSetu</Text>
          <Text style={styles.stepLabel}>{step + 1} / 4</Text>
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${((step + 1) / 4) * 100}%` }]} />
        </View>
        <Text style={styles.eyebrow}>YOUR STRENGTHS · AAPKI TAQAT</Text>
        <Text style={styles.title}>{headings[step]?.[0]}</Text>
        <Text style={styles.subtitle}>{headings[step]?.[1]}</Text>

        {step === 0 && (
          <>
            <Text style={styles.label}>Class or year · कक्षा</Text>
            <TextInput
              accessibilityLabel="Class or year"
              onChangeText={(value) => update('gradeLevel', value)}
              placeholder="For example, 10 or 1st year"
              style={styles.input}
              value={answers.gradeLevel}
            />
            <Text style={styles.label}>Language · भाषा</Text>
            <View style={styles.row}>
              {languageOptions.map(([value, label]) => (
                <Choice
                  key={value}
                  selected={answers.preferredLanguage === value}
                  label={label}
                  onPress={() => update('preferredLanguage', value)}
                />
              ))}
            </View>
            <Text style={styles.label}>District · ज़िला (optional)</Text>
            <TextInput
              accessibilityLabel="District"
              onChangeText={(value) => update('district', value)}
              placeholder="For example, Mysuru"
              style={styles.input}
              value={answers.district ?? ''}
            />
            <Text style={styles.label}>State · राज्य (optional)</Text>
            <TextInput
              accessibilityLabel="State"
              onChangeText={(value) => update('state', value)}
              placeholder="For example, Karnataka"
              style={styles.input}
              value={answers.state ?? ''}
            />
          </>
        )}

        {step === 1 && (
          <>
            <Text style={styles.label}>Things you enjoy · रुचियाँ</Text>
            <View style={styles.row}>
              {interestOptions.map((item) => (
                <Choice
                  key={item}
                  selected={answers.interests.includes(item)}
                  label={item}
                  onPress={() => toggle('interests', item)}
                />
              ))}
            </View>
            <Text style={styles.label}>Things you are good at · आपकी खूबियाँ</Text>
            <View style={styles.row}>
              {strengthOptions.map((item) => (
                <Choice
                  key={item}
                  selected={answers.strengths.includes(item)}
                  label={item}
                  onPress={() => toggle('strengths', item)}
                />
              ))}
            </View>
          </>
        )}

        {step === 2 && (
          <>
            <Text style={styles.label}>Time you can set aside each day</Text>
            <View style={styles.row}>
              {timeOptions.map(([value, label]) => (
                <Choice
                  key={value}
                  selected={answers.dailyAvailableMinutes === value}
                  label={label}
                  onPress={() => update('dailyAvailableMinutes', value)}
                />
              ))}
            </View>
            <Text style={styles.label}>Travel · आने-जाने की सुविधा</Text>
            <View style={styles.row}>
              {mobilityOptions.map(([value, label]) => (
                <Choice
                  key={value}
                  selected={answers.mobility === value}
                  label={label}
                  onPress={() => update('mobility', value)}
                />
              ))}
            </View>
            <Text style={styles.label}>Device access · फ़ोन की सुविधा</Text>
            <View style={styles.row}>
              {deviceOptions.map(([value, label]) => (
                <Choice
                  key={value}
                  selected={answers.deviceAccess === value}
                  label={label}
                  onPress={() => update('deviceAccess', value)}
                />
              ))}
            </View>
            <Text style={styles.label}>How soon would earning help?</Text>
            <View style={styles.row}>
              {urgencyOptions.map(([value, label]) => (
                <Choice
                  key={value}
                  selected={answers.incomeUrgency === value}
                  label={label}
                  onPress={() => update('incomeUrgency', value)}
                />
              ))}
            </View>
          </>
        )}

        {step === 3 && (
          <>
            <Text style={styles.label}>Choose what matters most right now</Text>
            <View style={styles.options}>
              {(
                [
                  ['EARN_SOON', 'Earn soon', 'A shorter first step toward local income'],
                  [
                    'PRACTICAL_SKILLS',
                    'Learn a practical skill',
                    'Build ability through hands-on practice',
                  ],
                  ['HIGHER_STUDIES', 'Continue my studies', 'Keep an academic path open'],
                  ['BALANCED', 'I am still exploring', 'Show me a mix of next steps'],
                ] as [FutureGoal, string, string][]
              ).map(([value, title, description]) => (
                <Pressable
                  key={value}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: answers.futureGoal === value }}
                  onPress={() => update('futureGoal', value)}
                  style={[styles.goal, answers.futureGoal === value && styles.goalSelected]}
                >
                  <Text style={styles.goalTitle}>{title}</Text>
                  <Text style={styles.goalDescription}>{description}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.summary}>
              You can change these answers later. Your options are guidance, not a promise of work
              or income.
            </Text>
          </>
        )}

        {!!message && (
          <Text accessibilityRole="alert" style={styles.message}>
            {message}
          </Text>
        )}
        <View style={styles.actions}>
          {step > 0 && (
            <Pressable
              accessibilityRole="button"
              onPress={() => setStep((current) => current - 1)}
              style={styles.back}
            >
              <Text style={styles.backText}>Back</Text>
            </Pressable>
          )}
          <Pressable
            accessibilityRole="button"
            disabled={busy}
            onPress={() => void next()}
            style={styles.primary}
          >
            <Text style={styles.primaryText}>
              {busy ? 'Saving…' : step === 3 ? 'See my pathways' : 'Next · आगे'}
            </Text>
          </Pressable>
        </View>
        <Text style={styles.saved}>Your progress is saved on this phone.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function Choice({
  selected,
  label,
  onPress,
}: {
  selected: boolean;
  label: string;
  onPress: () => void;
}): React.JSX.Element {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={[styles.choice, selected && styles.choiceSelected]}
    >
      <Text style={[styles.choiceText, selected && styles.choiceTextSelected]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.paper },
  content: {
    paddingHorizontal: 22,
    paddingTop: 10,
    paddingBottom: 30,
    maxWidth: 620,
    width: '100%',
    alignSelf: 'center',
  },
  topline: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  brand: { color: colors.ink, fontSize: 16, fontWeight: '800' },
  stepLabel: { color: colors.muted, fontWeight: '700' },
  progressTrack: {
    height: 6,
    borderRadius: 4,
    backgroundColor: colors.line,
    overflow: 'hidden',
    marginBottom: 30,
  },
  progressFill: { height: 6, backgroundColor: colors.leaf, borderRadius: 4 },
  eyebrow: {
    color: colors.saffron,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 10,
  },
  title: { color: colors.ink, fontSize: 30, lineHeight: 36, fontWeight: '800' },
  subtitle: { color: colors.muted, fontSize: 15, marginTop: 5, marginBottom: 24 },
  label: { color: colors.ink, fontSize: 14, fontWeight: '800', marginBottom: 10, marginTop: 18 },
  input: {
    backgroundColor: colors.white,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 12,
    minHeight: 54,
    paddingHorizontal: 15,
    color: colors.ink,
    fontSize: 16,
  },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  choice: {
    minHeight: 43,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.white,
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  choiceSelected: { backgroundColor: colors.pale, borderColor: colors.leaf },
  choiceText: { color: colors.ink, fontSize: 14, fontWeight: '600' },
  choiceTextSelected: { color: colors.leaf, fontWeight: '800' },
  options: { gap: 10 },
  goal: {
    backgroundColor: colors.white,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 12,
    padding: 15,
    minHeight: 78,
  },
  goalSelected: { backgroundColor: colors.pale, borderColor: colors.leaf, borderWidth: 2 },
  goalTitle: { color: colors.ink, fontSize: 16, fontWeight: '800' },
  goalDescription: { color: colors.muted, marginTop: 5, lineHeight: 19 },
  summary: { color: colors.muted, lineHeight: 20, marginTop: 18 },
  message: { color: colors.saffron, lineHeight: 20, marginTop: 16 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 24 },
  back: {
    minHeight: 54,
    minWidth: 90,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backText: { color: colors.ink, fontWeight: '800' },
  primary: {
    flex: 1,
    minHeight: 54,
    borderRadius: 12,
    backgroundColor: colors.leaf,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: { color: colors.white, fontSize: 16, fontWeight: '800' },
  saved: { textAlign: 'center', color: colors.muted, fontSize: 12, marginTop: 18 },
});
