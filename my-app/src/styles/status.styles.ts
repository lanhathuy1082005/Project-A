import { StyleSheet } from 'react-native';
import { Colors, Spacing } from '@/constants/theme';

export const statusStyles = StyleSheet.create({
  screen: {
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
  button: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
    backgroundColor: Colors.light.text,
    borderRadius: 6,
  },
  buttonText: {
    color: Colors.light.background,
    fontWeight: '600',
  },
  textButton: {
    alignSelf: 'flex-start',
    paddingVertical: Spacing.two,
  },
});
