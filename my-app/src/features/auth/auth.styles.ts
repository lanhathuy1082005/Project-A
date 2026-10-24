import { StyleSheet } from 'react-native';
import { Colors, Spacing } from '@/constants/theme';

export const authStyles = StyleSheet.create({
  screen: {
    flex: 1,
    justifyContent: 'center',
    padding: Spacing.four,
    backgroundColor: Colors.light.background,
  },
  form: {
    gap: Spacing.three,
  },
  title: {
    color: Colors.light.text,
    fontSize: 24,
    fontWeight: '600',
  },
  field: {
    gap: Spacing.two,
  },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: Colors.light.textSecondary,
    borderRadius: 6,
    paddingHorizontal: Spacing.three,
    color: Colors.light.text,
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
  errorText: {
    color: '#b91c1c',
  },
  statusScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
    padding: Spacing.four,
    backgroundColor: Colors.light.background,
  },
  statusTitle: {
    color: Colors.light.text,
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  statusMessage: {
    color: Colors.light.textSecondary,
    textAlign: 'center',
  },
});
