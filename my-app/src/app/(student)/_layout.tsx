import { useEffect } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { Stack, router } from 'expo-router';
import { AppButton } from '@/components/ui/AppButton';
import { useAuth } from '@/context/AuthContext';
import { studentLayoutStyles } from '@/features/student/student-layout.styles';

export default function StudentLayout() {
  const { user, status, error, refreshUser } = useAuth();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('../login');
    } else if (
      status === 'authenticated' &&
      user &&
      user.role !== 'student'
    ) {
      router.replace('../dashboard');
    }
  }, [status, user]);

  if (status === 'error') {
    return (
      <View style={studentLayoutStyles.center}>
        <Text style={studentLayoutStyles.title}>
          Could not verify student access
        </Text>
        <Text style={studentLayoutStyles.message}>{error}</Text>
        <AppButton label="Retry" onPress={() => void refreshUser()} />
        <AppButton
          label="Go to login"
          onPress={() => router.replace('../login')}
          variant="secondary"
        />
      </View>
    );
  }

  if (status !== 'authenticated' || user?.role !== 'student') {
    return (
      <View style={studentLayoutStyles.center}>
        <ActivityIndicator accessibilityLabel="Verifying student access" />
        <Text>Verifying student access...</Text>
      </View>
    );
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
