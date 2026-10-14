import { useEffect, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSQLiteContext } from 'expo-sqlite';
import type { InitiativeSource } from '@kaushalsetu/types';
import { getInitiativeSources } from '../src/api';
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

export default function ResourcesScreen(): React.JSX.Element {
  const database = useSQLiteContext();
  const [sources, setSources] = useState<InitiativeSource[]>([]);
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    let active = true;
    void (async () => {
      const cached = await readLocalJson<InitiativeSource[]>(database, 'reference_sources');
      if (cached && active) setSources(cached);
      try {
        const latest = await getInitiativeSources();
        await writeLocalJson(database, 'reference_sources', latest);
        if (active) {
          setSources(latest);
          setOffline(false);
        }
      } catch {
        if (active) setOffline(true);
      }
    })();
    return () => {
      active = false;
    };
  }, [database]);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.eyebrow}>LEARNING AND LIVELIHOOD SOURCES</Text>
        <Text style={styles.title}>Start with trusted portals</Text>
        <Text style={styles.subtitle}>
          These official sites are reference points. KaushalSetu does not yet import live schemes,
          courses, or openings from them.
        </Text>
        <View style={[styles.status, offline && styles.statusOffline]}>
          <Text style={styles.statusText}>
            {offline ? 'Saved source list · offline' : 'Source list available'}
          </Text>
        </View>
        {sources.map((source) => (
          <View key={source.id} style={styles.source}>
            <Text style={styles.category}>{source.category}</Text>
            <Text style={styles.name}>{source.name}</Text>
            <Text style={styles.overview}>{source.overview}</Text>
            <Text style={styles.useFor}>{source.useFor}</Text>
            <Text style={styles.referenceOnly}>OFFICIAL REFERENCE · NOT A LIVE LISTING</Text>
            <Pressable
              accessibilityRole="link"
              onPress={() => void Linking.openURL(source.officialUrl)}
              style={styles.openButton}
            >
              <Text style={styles.openText}>Open official portal ↗</Text>
            </Pressable>
          </View>
        ))}
        <Text style={styles.footer}>
          Check eligibility, dates, documents, and application status on the official portal or with
          a trusted facilitator. Never share OTPs or Aadhaar details through an unverified link.
        </Text>
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
  eyebrow: { color: colors.saffron, fontSize: 11, fontWeight: '800', marginBottom: 10 },
  title: { color: colors.ink, fontSize: 29, lineHeight: 35, fontWeight: '800' },
  subtitle: { color: colors.muted, fontSize: 14, lineHeight: 21, marginTop: 8 },
  status: { alignSelf: 'flex-start', backgroundColor: colors.pale, padding: 9, marginTop: 14 },
  statusOffline: { backgroundColor: '#fff0e6' },
  statusText: { color: colors.ink, fontSize: 12, fontWeight: '700' },
  source: {
    backgroundColor: colors.white,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 8,
    padding: 15,
    marginTop: 12,
  },
  category: { color: colors.leaf, fontSize: 11, fontWeight: '800' },
  name: { color: colors.ink, fontSize: 18, fontWeight: '800', marginTop: 6 },
  overview: { color: colors.muted, fontSize: 13, lineHeight: 19, marginTop: 6 },
  useFor: { color: colors.ink, fontSize: 12, lineHeight: 18, marginTop: 9 },
  referenceOnly: { color: colors.saffron, fontSize: 10, fontWeight: '900', marginTop: 10 },
  openButton: { minHeight: 42, justifyContent: 'center', alignSelf: 'flex-start' },
  openText: { color: colors.leaf, fontWeight: '800', fontSize: 13 },
  footer: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 16 },
});
