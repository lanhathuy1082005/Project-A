import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  type TextInputInstance,
} from 'react-native';
import { router } from 'expo-router';
import { getErrorMessage } from '@/api/client';
import { useAuth } from '@/context/AuthContext';
import { authStyles } from './auth.styles';

export default function LoginScreen() {
  const { user, status, error: sessionError, signIn, refreshUser } = useAuth();
  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const passwordInputRef = useRef<TextInputInstance>(null);

  useEffect(() => {
    if (status === 'authenticated' && user) {
      router.replace(user.role === 'student' ? '../home' : '../dashboard');
    }
  }, [status, user]);

  const handleSubmit = async () => {
    if (submitting) return;

    setError(null);
    if (!id.trim() || !password) {
      setError('Enter both your student ID and password.');
      return;
    }

    setSubmitting(true);
    try {
      await signIn({ id: id.trim(), password });
    } catch (loginError) {
      setError(getErrorMessage(loginError, 'Login failed. Please try again.'));
    } finally {
      setSubmitting(false);
    }
  };

  if (status === 'loading' || status === 'authenticated') {
    return (
      <View style={authStyles.statusScreen}>
        <ActivityIndicator accessibilityLabel="Loading sign-in status" />
        <Text>
          {status === 'authenticated'
            ? 'Opening your account...'
            : 'Checking sign-in status...'}
        </Text>
      </View>
    );
  }

  return (
    <View style={authStyles.screen}>
      <ScrollView
        contentContainerStyle={authStyles.form}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={authStyles.title}>Login</Text>

        {sessionError ? (
          <View>
            <Text style={authStyles.errorText}>
              Could not check your existing session: {sessionError}
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => void refreshUser()}
              style={authStyles.textButton}
            >
              <Text>Retry session check</Text>
            </Pressable>
          </View>
        ) : null}

        <View style={authStyles.field}>
          <Text>Student ID</Text>
          <TextInput
            accessibilityLabel="Student ID"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!submitting}
            onChangeText={setId}
            onSubmitEditing={() => passwordInputRef.current?.focus()}
            placeholder="Enter your ID"
            returnKeyType="next"
            style={authStyles.input}
            value={id}
          />
        </View>

        <View style={authStyles.field}>
          <Text>Password</Text>
          <TextInput
            accessibilityLabel="Password"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!submitting}
            ref={passwordInputRef}
            onChangeText={setPassword}
            onSubmitEditing={handleSubmit}
            placeholder="Enter your password"
            returnKeyType="done"
            secureTextEntry
            style={authStyles.input}
            value={password}
          />
        </View>

        {error ? (
          <Text accessibilityRole="alert" style={authStyles.errorText}>
            {error}
          </Text>
        ) : null}

        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: submitting }}
          disabled={submitting}
          onPress={() => void handleSubmit()}
          style={authStyles.button}
        >
          {submitting ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={authStyles.buttonText}>Login</Text>
          )}
        </Pressable>
      </ScrollView>
    </View>
  );
}
