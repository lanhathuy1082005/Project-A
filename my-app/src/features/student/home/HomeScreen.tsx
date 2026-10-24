import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Calendar } from '@/components/Calendar';
import { AppButton } from '@/components/ui/AppButton';
import { InlineNotice } from '@/components/ui/InlineNotice';
import { useAuth } from '@/context/AuthContext';
import { homeStyles } from './home.styles';
import { useStudentTimetable } from './useStudentTimetable';

export default function HomeScreen() {
  const { user } = useAuth();
  const { classes, loading, error, refetch } = useStudentTimetable();

  return (
    <View style={homeStyles.screen}>
      <ScrollView contentContainerStyle={homeStyles.content}>
        <Text style={homeStyles.title}>Homepage</Text>
        <Text style={homeStyles.description}>
          Welcome, {user?.id}. Select a function below:
        </Text>

        {loading ? (
          <View style={homeStyles.status}>
            <ActivityIndicator accessibilityLabel="Loading weekly timetable" />
            <Text style={homeStyles.description}>Loading your timetable...</Text>
          </View>
        ) : error ? (
          <View style={homeStyles.status}>
            <InlineNotice message={error} tone="error" />
            <AppButton label="Retry timetable" onPress={refetch} />
          </View>
        ) : (
          <Calendar classes={classes} />
        )}

        <View style={homeStyles.actions}>
          <AppButton
            label="Borrow an item"
            onPress={() => router.push('./items')}
          />
          <AppButton
            label="History"
            onPress={() => router.push('./history')}
            variant="secondary"
          />
        </View>
      </ScrollView>
    </View>
  );
}
