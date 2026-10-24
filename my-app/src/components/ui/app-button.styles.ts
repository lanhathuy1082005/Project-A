import { StyleSheet } from 'react-native';
import { Colors, Spacing } from '@/constants/theme';

export const buttonStyles = StyleSheet.create({
  button: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
    borderWidth: 1,
    borderRadius: 8,
  },
  primary: {
    backgroundColor: Colors.light.text,
    borderColor: Colors.light.text,
  },
  secondary: {
    backgroundColor: Colors.light.background,
    borderColor: Colors.light.textSecondary,
  },
  primaryText: {
    color: Colors.light.background,
    fontWeight: '600',
  },
  secondaryText: {
    color: Colors.light.text,
    fontWeight: '600',
  },
  disabled: {
    opacity: 0.55,
  },
});
