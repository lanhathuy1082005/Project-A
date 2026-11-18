import { useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { getErrorMessage } from '@/api/client';
import {
  RETURN_FLAG_LABELS,
  returnItemApi,
  type Reservation,
  type ScanConfirmation,
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
  const [returnNotice, setReturnNotice] = useState<string | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const totalPages = Math.ceil(total / limit);

  const confirmReturn = async (confirmation: ScanConfirmation) => {
    if (!pendingReturn || returning) return;

    setReturning(true);
    setReturnError(null);
    try {
      const { returnFlag } = await returnItemApi(pendingReturn.id, confirmation);
      setPendingReturn(null);
      setReturnNotice(
        returnFlag
          ? `Returned. The lab admin will check it because ${RETURN_FLAG_LABELS[returnFlag]}.`
          : 'Returned. The lab admin will check it shortly.',
      );
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
    setReturnNotice(null);
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
        {returnNotice ? <InlineNotice message={returnNotice} tone="info" /> : null}

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
        onConfirm={(confirmation) => void confirmReturn(confirmation)}
      />
      <FeedbackModal
        visible={showFeedback}
        onClose={() => setShowFeedback(false)}
      />
    </View>
  );
}
