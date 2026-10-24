import { Pressable, StyleSheet, Text } from 'react-native';
import { router } from 'expo-router';
import { Colors, Spacing } from '@/constants/theme';

export function BackToHomeButton() {
  return (
    <Pressable
      accessibilityLabel="Back to Home"
      accessibilityRole="button"
      onPress={() => router.replace('/home')}
      style={styles.button}
    >
      <Text style={styles.arrow}>←</Text>
      <Text style={styles.label}>Home</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: Spacing.one,
    paddingHorizontal: Spacing.three,
  },
  arrow: {
    color: Colors.light.text,
    fontSize: 22,
    fontWeight: '600',
  },
  label: {
    color: Colors.light.text,
    fontSize: 15,
    fontWeight: '600',
  },
});
