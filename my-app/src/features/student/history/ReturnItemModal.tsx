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
              {reservation.kit_type_id !== null
                ? `Open ${reservation.item_name ?? 'the kit'} and show its contents to the camera to return it.`
                : `Scan the QR sticker on ${reservation.item_name ?? 'the item'} to return it.`}
            </Text>
          ) : null}
          {visible && reservation ? (
            <QRScanner
              purpose="return"
              reservation={{
                id: reservation.id,
                itemUnitId: reservation.item_unit_id,
                isKit: reservation.kit_type_id !== null,
                itemName: reservation.item_name ?? 'Kit',
              }}
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
