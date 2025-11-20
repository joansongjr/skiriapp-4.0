import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { createUserWithEmailAndPassword, signInAnonymously } from 'firebase/auth';
import { auth } from '@/firebase/config';

export default function SignUpScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState<'email' | 'guest' | null>(null);
  const [error, setError] = useState('');

  const getErrorMessage = (code: string) => {
    switch (code) {
      case 'auth/email-already-in-use':
        return 'This email is already in use.';
      case 'auth/invalid-email':
        return 'Invalid email format.';
      case 'auth/weak-password':
        return 'Password should be at least 6 characters.';
      case 'auth/network-request-failed':
        return 'Network error. Please check your connection.';
      default:
        return 'Sign up failed. Please try again.';
    }
  };

  const handleSignUp = async () => {
    if (!email.trim() || !password.trim() || !confirm.trim()) {
      setError('Please fill in all fields.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    setLoading('email');
    setError('');

    try {
      await createUserWithEmailAndPassword(auth, email.trim(), password);
      router.replace('/(tabs)/home');
    } catch (e: any) {
      setError(getErrorMessage(e?.code));
    } finally {
      setLoading(null);
    }
  };

  const handleGuestLogin = async () => {
    setLoading('guest');
    setError('');

    try {
      await signInAnonymously(auth);
      router.replace('/(tabs)/home');
    } catch (e: any) {
      setError(getErrorMessage(e?.code));
    } finally {
      setLoading(null);
    }
  };

  const goBack = () => router.back();
  const goSignIn = () => router.push('/auth/sign-in');

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.inner}>
          {/* Back */}
          <TouchableOpacity onPress={goBack} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={styles.backText}>{'\u2190'} Back</Text>
          </TouchableOpacity>

          {/* Title */}
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Sign up to start your skin health journey</Text>

          {/* Form */}
          <View style={styles.form}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your email"
              placeholderTextColor="#9CA3AF"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              value={email}
              onChangeText={(t) => {
                setEmail(t);
                setError('');
              }}
              editable={!loading}
            />

            <Text style={[styles.label, { marginTop: 16 }]}>Password</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your password"
              placeholderTextColor="#9CA3AF"
              secureTextEntry
              value={password}
              onChangeText={(t) => {
                setPassword(t);
                setError('');
              }}
              editable={!loading}
            />

            <Text style={[styles.label, { marginTop: 16 }]}>Confirm Password</Text>
            <TextInput
              style={styles.input}
              placeholder="Re-enter your password"
              placeholderTextColor="#9CA3AF"
              secureTextEntry
              value={confirm}
              onChangeText={(t) => {
                setConfirm(t);
                setError('');
              }}
              editable={!loading}
            />

            {!!error && <Text style={styles.error}>{error}</Text>}

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleSignUp}
              disabled={!!loading}
            >
              {loading === 'email' ? (
                <ActivityIndicator color="#0B0F0E" />
              ) : (
                <Text style={styles.buttonText}>Sign Up</Text>
              )}
            </TouchableOpacity>

            <View style={styles.guestWrap}>
              <TouchableOpacity onPress={handleGuestLogin} disabled={!!loading}>
                {loading === 'guest' ? (
                  <ActivityIndicator />
                ) : (
                  <Text style={styles.guestText}>Continue as Guest</Text>
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.signinWrap}>
              <Text style={styles.muted}>
                Already have an account?{' '}
                <Text style={styles.signinLink} onPress={goSignIn}>
                  Sign In
                </Text>
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  scrollContent: { flexGrow: 1 },
  inner: { flex: 1, paddingTop: 60, paddingHorizontal: 20 },
  backText: { fontSize: 16, color: '#111827', marginBottom: 12 },
  title: {
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: 0.2,
    color: '#111827',
    marginTop: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 8,
    marginBottom: 18,
  },
  form: { marginTop: 12 },
  label: { fontSize: 14, color: '#111827', fontWeight: '600', marginBottom: 8 },
  input: {
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 14,
    backgroundColor: '#FAFAFA',
    fontSize: 16,
  },
  button: {
    height: 56,
    borderRadius: 28,
    backgroundColor: '#18e4aa', // same as Take Photo button
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 22,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
  },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { fontSize: 18, fontWeight: '700', color: '#0B0F0E' },
  error: { color: '#B91C1C', marginTop: 10, fontSize: 14 },
  guestWrap: { alignItems: 'center', marginTop: 18 },
  guestText: { fontSize: 16, color: '#6B7280', fontWeight: '600' },
  signinWrap: { marginTop: 24, alignItems: 'center', marginBottom: 20 },
  muted: { fontSize: 16, color: '#6B7280' },
  signinLink: { color: '#111827', fontWeight: '700' },
});

