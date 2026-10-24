import { Text, View } from 'react-native';
import type { Reservation } from '@/api/reservation.api';
import { AppButton } from '@/components/ui/AppButton';
import { fmtRsvId, fmtUnitId, formatDate } from '@/utils/format';
import { historyStyles } from './history.styles';

interface ReservationCardProps {
  reservation: Reservation;
  onReturn: (reservation: Reservation) => void;
}

export function ReservationCard({
  reservation,
  onReturn,
}: ReservationCardProps) {
  return (
    <View style={historyStyles.card}>
      <View style={historyStyles.cardHeader}>
        <Text style={historyStyles.itemName}>
          {reservation.item_name ?? 'Unknown item'}
        </Text>
        <Text style={historyStyles.status}>Borrowing</Text>
      </View>
      <Text style={historyStyles.detail}>
        {fmtUnitId(reservation.item_id, reservation.item_unit_id)}
      </Text>
      <Text style={historyStyles.detail}>
        Reservation: {fmtRsvId(reservation.id)}
      </Text>
      {reservation.course_name ? (
        <Text style={historyStyles.detail}>
          Course: {reservation.course_name}
        </Text>
      ) : null}
      {reservation.lab_name ? (
        <Text style={historyStyles.detail}>Lab: {reservation.lab_name}</Text>
      ) : null}
      <Text style={historyStyles.detail}>
        Borrowed: {formatDate(reservation.borrow_date)}
      </Text>
      <AppButton
        label="Return item"
        onPress={() => onReturn(reservation)}
        variant="secondary"
      />
    </View>
  );
}
