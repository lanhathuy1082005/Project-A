import { useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { getErrorMessage } from '@/api/client';
import {
  returnItemApi,
  type Reservation,
} from '@/api/reservation.api';
import { AppButton } from '@/components/ui/AppButton';
import { InlineNotice } from '@/components/ui/InlineNotice';
import { BackToHomeButton } from '@/components/ui/BackToHomeButton';
import { ReservationCard } from './ReservationCard';
import { ReturnItemModal } from './ReturnItemModal';
import { FeedbackModal } from './FeedbackModal';
import { historyStyles } from './history.styles';
import { useMyReservations } from './useMyReservations';

export default function HistoryScreen() {
  const {
    data,
    page,
    setPage,
    total,
    limit,
    loading,
    error,
    refetch,
  } = useMyReservations();
  const [pendingReturn, setPendingReturn] = useState<Reservation | null>(null);
  const [returnError, setReturnError] = useState<string | null>(null);
  const [returning, setReturning] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const totalPages = Math.ceil(total / limit);

  const confirmReturn = async (scannedUnitId: number) => {
    if (!pendingReturn || returning) return;

    setReturning(true);
    setReturnError(null);
    try {
      await returnItemApi(
        pendingReturn.id,
        pendingReturn.item_unit_id,
        scannedUnitId,
      );
      setPendingReturn(null);
      refetch();
      setShowFeedback(true);
    } catch (requestError) {
      setReturnError(
        getErrorMessage(requestError, 'Could not return this item.'),
      );
    } finally {
      setReturning(false);
    }
  };

  const openReturn = (reservation: Reservation) => {
    setReturnError(null);
    setPendingReturn(reservation);
  };

  return (
    <View style={historyStyles.screen}>
      <BackToHomeButton />
      <ScrollView contentContainerStyle={historyStyles.content}>
        <View>
          <Text style={historyStyles.title}>My History</Text>
          <Text style={historyStyles.description}>
            Your personal borrowing records.
          </Text>
        </View>

        {loading ? (
          <View style={historyStyles.center}>
            <ActivityIndicator accessibilityLabel="Loading history" />
            <Text>Loading history...</Text>
          </View>
        ) : error ? (
          <View style={historyStyles.center}>
            <InlineNotice message={error} tone="error" />
            <AppButton label="Retry" onPress={refetch} />
          </View>
        ) : data.length === 0 ? (
          <View style={historyStyles.center}>
            <Text>No reservation records found.</Text>
          </View>
        ) : (
          data.map((reservation) => (
            <ReservationCard
              key={reservation.id}
              reservation={reservation}
              onReturn={openReturn}
            />
          ))
        )}

        {!loading && !error && totalPages > 1 ? (
          <View style={historyStyles.actions}>
            <AppButton
              label="Previous page"
              onPress={() => setPage((current) => Math.max(1, current - 1))}
              disabled={page <= 1}
              variant="secondary"
            />
            <Text>
              Page {page} of {totalPages} reservation records
            </Text>
            <AppButton
              label="Next page"
              onPress={() =>
                setPage((current) => Math.min(totalPages, current + 1))
              }
              disabled={page >= totalPages}
              variant="secondary"
            />
          </View>
        ) : null}
      </ScrollView>

      <ReturnItemModal
        key={pendingReturn?.id ?? 'closed'}
        reservation={pendingReturn}
        visible={pendingReturn !== null}
        submitting={returning}
        error={returnError}
        onCancel={() => {
          if (returning) return;
          setPendingReturn(null);
          setReturnError(null);
        }}
        onConfirm={(scannedUnitId) => void confirmReturn(scannedUnitId)}
      />
      <FeedbackModal
        visible={showFeedback}
        onClose={() => setShowFeedback(false)}
      />
    </View>
  );
}
