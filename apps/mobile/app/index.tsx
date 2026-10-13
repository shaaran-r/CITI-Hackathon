import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { getStudentProfile, sendOtp, verifyOtp } from '../src/api';

const colors = {
  ink: '#183b32',
  leaf: '#2d7658',
  saffron: '#d87936',
  paper: '#f5f3e9',
  white: '#fffefa',
  line: '#d8dfd5',
  muted: '#64766e',
};

export default function LoginScreen(): React.JSX.Element {
  const [phone, setPhone] = useState('+919000000001');
  const [code, setCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    let active = true;
    void (async () => {
      const token = await SecureStore.getItemAsync('accessToken');
      if (!token || !active) return;
      try {
        const profile = await getStudentProfile();
        router.replace(profile.profile?.completedAt ? '/pathways' : '/onboarding');
      } catch {
        await SecureStore.deleteItemAsync('accessToken');
        await SecureStore.deleteItemAsync('refreshToken');
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  async function requestCode(): Promise<void> {
    setBusy(true);
    setMessage('');
    try {
      const result = await sendOtp(phone.trim());
      setCodeSent(true);
      if (result.devCode) setCode(result.devCode);
      setMessage('Code ready for this demo.');
    } catch {
      setMessage('Could not reach the server. Check that the API is running.');
    } finally {
      setBusy(false);
    }
  }

  async function signIn(): Promise<void> {
    setBusy(true);
    setMessage('');
    try {
      await verifyOtp(phone.trim(), code.trim());
      router.replace('/onboarding');
    } catch {
      setMessage('That code did not work. Request a new one and try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      <View style={styles.content}>
        <View style={styles.brandRow}>
          <View style={styles.mark}>
            <Text style={styles.markText}>K</Text>
          </View>
          <Text style={styles.brand}>KaushalSetu</Text>
        </View>
        <Text style={styles.eyebrow}>NAMASTE · WELCOME</Text>
        <Text style={styles.title}>Your next step starts with you.</Text>
        <Text style={styles.subtitle}>Apni taaqat pehchaniye. Apna raasta chuniye.</Text>
        <View style={styles.form}>
          <Text style={styles.label}>Mobile number · मोबाइल नंबर</Text>
          <TextInput
            accessibilityLabel="Mobile number"
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
            disabled={busy}
            onPress={() => void (codeSent ? signIn() : requestCode())}
            style={styles.button}
          >
            {busy ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.buttonText}>
                {codeSent ? 'Continue · आगे बढ़ें' : 'Get a code · कोड पाएँ'}
              </Text>
            )}
          </Pressable>
          {codeSent && (
            <Pressable
              accessibilityRole="button"
              onPress={() => void requestCode()}
              style={styles.secondary}
            >
              <Text style={styles.secondaryText}>Send a new code</Text>
            </Pressable>
          )}
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/parent')}
            style={styles.secondary}
          >
            <Text style={styles.secondaryText}>Family view · परिवार के लिए</Text>
          </Pressable>
        </View>
        <Text style={styles.footer}>Your answers stay on this phone until you submit them.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.paper },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 26,
    paddingVertical: 28,
    maxWidth: 520,
    width: '100%',
    alignSelf: 'center',
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 52 },
  mark: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.leaf,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markText: { color: colors.white, fontSize: 22, fontWeight: '800' },
  brand: { fontSize: 18, fontWeight: '800', color: colors.ink },
  eyebrow: {
    color: colors.saffron,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.4,
    marginBottom: 12,
  },
  title: { color: colors.ink, fontSize: 36, lineHeight: 42, fontWeight: '800' },
  subtitle: { color: colors.muted, fontSize: 15, marginTop: 12 },
  form: { marginTop: 34 },
  label: { color: colors.ink, fontWeight: '700', marginBottom: 8, marginTop: 14 },
  input: {
    backgroundColor: colors.white,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 12,
    minHeight: 54,
    paddingHorizontal: 16,
    color: colors.ink,
    fontSize: 17,
  },
  button: {
    backgroundColor: colors.leaf,
    minHeight: 56,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 22,
  },
  buttonText: { color: colors.white, fontSize: 16, fontWeight: '800' },
  secondary: { minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  secondaryText: { color: colors.leaf, fontWeight: '700' },
  message: { color: colors.saffron, marginTop: 12, lineHeight: 20 },
  footer: { color: colors.muted, fontSize: 13, lineHeight: 19, marginTop: 30 },
});
