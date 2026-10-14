import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { LearningModuleCard } from '@kaushalsetu/types';
import { getLearningModules } from '../src/api';
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

function priceLabel(module: LearningModuleCard): string {
  if (module.pricingModel === 'FREE') return 'Free';
  if (module.pricingModel === 'SUBSCRIPTION') return `₹${module.priceInr} / month`;
  return `₹${module.priceInr} one-time`;
}

export default function ModulesScreen(): React.JSX.Element {
  const database = useSQLiteContext();
  const [modules, setModules] = useState<LearningModuleCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    let active = true;
    void (async () => {
      const cached = await readLocalJson<LearningModuleCard[]>(
        database,
        'published_learning_modules',
      );
      if (cached && active) setModules(cached);
      try {
        const latest = await getLearningModules();
        await writeLocalJson(database, 'published_learning_modules', latest);
        if (active) {
          setModules(latest);
          setOffline(false);
        }
      } catch {
        if (active) setOffline(true);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [database]);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.back}>
          <Text style={styles.backText}>‹ Pathways</Text>
        </Pressable>
        <Text style={styles.eyebrow}>FACILITATOR LEARNING</Text>
        <Text style={styles.title}>Lessons from your community</Text>
        <Text style={styles.subtitle}>
          Published lessons can be read offline after one connected visit. Check the listed price
          and learning support with the facilitator before joining.
        </Text>
        <View style={[styles.connection, offline && styles.offline]}>
          <Text style={styles.connectionText}>
            {offline ? 'Offline · saved lessons remain available' : 'Community lessons'}
          </Text>
        </View>
        {loading && modules.length === 0 && (
          <ActivityIndicator color={colors.leaf} size="large" style={styles.loader} />
        )}
        {!loading && modules.length === 0 && (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No published modules yet</Text>
            <Text style={styles.subtitle}>
              Ask your facilitator about local lessons or explore the official learning sources.
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push('/resources')}
              style={styles.outlineButton}
            >
              <Text style={styles.outlineText}>Open learning sources</Text>
            </Pressable>
          </View>
        )}
        {modules.map((module) => (
          <View key={module.id} style={styles.module}>
            <View style={styles.moduleTop}>
              <Text style={styles.category}>{module.category}</Text>
              <Text style={styles.price}>{priceLabel(module)}</Text>
            </View>
            <Text style={styles.moduleTitle}>{module.title}</Text>
            <Text style={styles.meta}>
              {module.language.toUpperCase()} · {module.lessons.length} lessons
            </Text>
            <Text style={styles.description}>{module.description}</Text>
            <View style={styles.lessons}>
              {module.lessons.map((lesson, index) => (
                <View key={`${module.id}-${index}`} style={styles.lesson}>
                  <Text style={styles.lessonNumber}>{index + 1}</Text>
                  <Text style={styles.lessonText}>{lesson}</Text>
                </View>
              ))}
            </View>
            <Text style={styles.note}>
              Price is set by the facilitator; payment is arranged directly.
            </Text>
          </View>
        ))}
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
  eyebrow: { color: colors.saffron, fontSize: 11, fontWeight: '800', marginTop: 12 },
  title: { color: colors.ink, fontSize: 29, lineHeight: 35, fontWeight: '800', marginTop: 8 },
  subtitle: { color: colors.muted, fontSize: 14, lineHeight: 21, marginTop: 8 },
  connection: { alignSelf: 'flex-start', padding: 9, marginTop: 13, backgroundColor: colors.pale },
  offline: { backgroundColor: '#fff0e6' },
  connectionText: { color: colors.ink, fontSize: 12, fontWeight: '700' },
  loader: { marginTop: 44 },
  empty: { marginTop: 18, padding: 18, backgroundColor: colors.white, borderRadius: 8 },
  emptyTitle: { color: colors.ink, fontSize: 17, fontWeight: '800' },
  outlineButton: {
    alignSelf: 'flex-start',
    minHeight: 42,
    justifyContent: 'center',
    marginTop: 10,
  },
  outlineText: { color: colors.leaf, fontWeight: '800' },
  module: {
    marginTop: 12,
    padding: 15,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 8,
    backgroundColor: colors.white,
  },
  moduleTop: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  category: { color: colors.leaf, fontSize: 11, fontWeight: '800', flex: 1 },
  price: { color: colors.saffron, fontSize: 11, fontWeight: '900' },
  moduleTitle: { color: colors.ink, fontSize: 18, fontWeight: '800', marginTop: 7 },
  meta: { color: colors.muted, fontSize: 11, fontWeight: '700', marginTop: 4 },
  description: { color: colors.muted, fontSize: 13, lineHeight: 19, marginTop: 7 },
  lessons: { gap: 8, marginTop: 12 },
  lesson: { flexDirection: 'row', gap: 9, alignItems: 'flex-start' },
  lessonNumber: { color: colors.saffron, fontSize: 12, fontWeight: '900', width: 18 },
  lessonText: { flex: 1, color: colors.ink, fontSize: 13, lineHeight: 19 },
  note: { color: colors.muted, fontSize: 11, lineHeight: 16, marginTop: 12 },
});
