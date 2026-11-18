import { Modal, ScrollView, Text, View } from 'react-native';
import type {
  Reservation,
  ScanConfirmation,
} from '@/api/reservation.api';
import { AppButton } from '@/components/ui/AppButton';
import { QRScanner } from '@/components/QRScanner';
import { historyStyles } from './history.styles';

interface ReturnItemModalProps {
  reservation: Reservation | null;
  visible: boolean;
  submitting: boolean;
  error: string | null;
  onCancel: () => void;
  onConfirm: (confirmation: ScanConfirmation) => void;
}

export function ReturnItemModal({
  reservation,
  visible,
  submitting,
  error,
  onCancel,
  onConfirm,
}: ReturnItemModalProps) {
  return (
    <Modal
      animationType="fade"
      onRequestClose={onCancel}
      transparent
      visible={visible}
    >
      <ScrollView
        contentContainerStyle={historyStyles.modalBackdrop}
        keyboardShouldPersistTaps="handled"
      >
        <View style={historyStyles.modalCard}>
          <Text style={historyStyles.modalTitle}>Return item</Text>
          {reservation ? (
            <Text style={historyStyles.detail}>
              Choose a mode and scan {reservation.item_name ?? 'the item'} to return it.
            </Text>
          ) : null}
          {visible ? (
            <QRScanner
              actionLabel="Confirm return"
              busy={submitting}
              error={error}
              onConfirm={onConfirm}
            />
          ) : null}
          <View style={historyStyles.actions}>
            <AppButton
              label="Cancel"
              onPress={onCancel}
              disabled={submitting}
              variant="secondary"
            />
          </View>
        </View>
      </ScrollView>
    </Modal>
  );
}
