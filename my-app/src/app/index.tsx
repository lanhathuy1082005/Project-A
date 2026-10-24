import { useEffect } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { statusStyles } from '@/styles/status.styles';

export default function IndexScreen() {
  const { user, status, error, refreshUser } = useAuth();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('./login');
    } else if (status === 'authenticated' && user) {
      router.replace(user.role === 'student' ? './home' : './dashboard');
    }
  }, [status, user]);

  if (status === 'error') {
    return (
      <View style={statusStyles.screen}>
        <Text style={statusStyles.title}>Could not check your session</Text>
        <Text style={statusStyles.message}>{error}</Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => void refreshUser()}
          style={statusStyles.button}
        >
          <Text style={statusStyles.buttonText}>Retry</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.replace('./login')}
          style={statusStyles.textButton}
        >
          <Text>Go to login</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={statusStyles.screen}>
      <ActivityIndicator accessibilityLabel="Checking sign-in status" />
      <Text>Checking sign-in status...</Text>
    </View>
  );
}
