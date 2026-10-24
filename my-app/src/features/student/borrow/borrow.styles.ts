import { StyleSheet } from 'react-native';
import { Colors, Spacing } from '@/constants/theme';

export const borrowStyles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  scroll: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    gap: Spacing.three,
    justifyContent: 'center',
    padding: Spacing.four,
  },
  title: {
    color: Colors.light.text,
    fontSize: 24,
    fontWeight: '700',
  },
  description: {
    color: Colors.light.textSecondary,
  },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: Colors.light.textSecondary,
    borderRadius: 8,
    paddingHorizontal: Spacing.three,
    color: Colors.light.text,
  },
});
