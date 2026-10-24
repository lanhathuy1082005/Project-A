import { StyleSheet } from 'react-native';
import { Colors, Spacing } from '@/constants/theme';

export const homeStyles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  content: {
    flexGrow: 1,
    gap: Spacing.three,
    padding: Spacing.four,
  },
  title: {
    color: Colors.light.text,
    fontSize: 28,
    fontWeight: '700',
  },
  description: {
    color: Colors.light.textSecondary,
    fontSize: 16,
  },
  actions: {
    gap: Spacing.two,
  },
  status: {
    gap: Spacing.two,
  },
});
