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
              Scan the QR sticker on {reservation.item_name ?? 'the item'}
              {reservation.kit_type_id !== null ? ', then show the open kit' : ''} to return it.
            </Text>
          ) : null}
          {visible && reservation ? (
            <QRScanner
              purpose="return"
              reservation={{ id: reservation.id, itemUnitId: reservation.item_unit_id }}
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
