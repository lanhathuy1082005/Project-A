import { StyleSheet } from 'react-native';
import { Colors, Spacing } from '@/constants/theme';

export const noticeStyles = StyleSheet.create({
  error: {
    color: '#b91c1c',
    padding: Spacing.two,
  },
  success: {
    color: '#166534',
    padding: Spacing.two,
  },
  info: {
    color: Colors.light.textSecondary,
    padding: Spacing.two,
  },
});
