import { StyleSheet } from 'react-native';
import { Colors, Spacing } from '@/constants/theme';

export const historyStyles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  content: {
    padding: Spacing.three,
    gap: Spacing.three,
  },
  title: {
    color: Colors.light.text,
    fontSize: 24,
    fontWeight: '700',
  },
  description: {
    color: Colors.light.textSecondary,
  },
  center: {
    minHeight: 180,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
    padding: Spacing.four,
  },
  card: {
    gap: Spacing.two,
    padding: Spacing.three,
    borderWidth: 1,
    borderColor: Colors.light.backgroundSelected,
    borderRadius: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  itemName: {
    flex: 1,
    color: Colors.light.text,
    fontSize: 17,
    fontWeight: '700',
  },
  status: {
    color: '#854d0e',
    fontWeight: '600',
  },
  detail: {
    color: Colors.light.textSecondary,
  },
  modalBackdrop: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: Spacing.three,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
  },
  modalCard: {
    gap: Spacing.three,
    padding: Spacing.three,
    backgroundColor: Colors.light.background,
    borderRadius: 12,
  },
  modalTitle: {
    color: Colors.light.text,
    fontSize: 20,
    fontWeight: '700',
  },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: Colors.light.textSecondary,
    borderRadius: 8,
    paddingHorizontal: Spacing.three,
    color: Colors.light.text,
  },
  actions: {
    gap: Spacing.two,
  },
});
