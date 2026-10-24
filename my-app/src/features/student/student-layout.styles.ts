import { StyleSheet } from 'react-native';
import { Colors, Spacing } from '@/constants/theme';

export const studentLayoutStyles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
    padding: Spacing.four,
    backgroundColor: Colors.light.background,
  },
  title: {
    color: Colors.light.text,
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  message: {
    color: Colors.light.textSecondary,
    textAlign: 'center',
  },
});
