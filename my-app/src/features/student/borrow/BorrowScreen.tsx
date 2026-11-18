import { useState } from 'react';
import { Keyboard, ScrollView, Text, View } from 'react-native';
import { InlineNotice } from '@/components/ui/InlineNotice';
import { QRScanner } from '@/components/QRScanner';
import { BackToHomeButton } from '@/components/ui/BackToHomeButton';
import { getErrorMessage } from '@/api/client';
import { borrowItemApi, type ScanConfirmation } from '@/api/reservation.api';
import { borrowStyles } from './borrow.styles';

export default function BorrowScreen() {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [scannerKey, setScannerKey] = useState(0);

  const handleBorrow = async (confirmation: ScanConfirmation) => {
    if (submitting) return;

    Keyboard.dismiss();
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      await borrowItemApi(confirmation);
      setSuccess('Item borrowed successfully.');
      setScannerKey((key) => key + 1);
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Could not borrow this item.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={borrowStyles.screen}>
      <BackToHomeButton />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        style={borrowStyles.scroll}
        contentContainerStyle={borrowStyles.content}
      >
        <Text style={borrowStyles.title}>Borrow an item</Text>
        <Text style={borrowStyles.description}>
          Scan the QR sticker on an item or kit box to borrow it.
        </Text>
        {success ? <InlineNotice message={success} tone="success" /> : null}
        <QRScanner
          key={scannerKey}
          purpose="checkout"
          actionLabel="Confirm borrow"
          busy={submitting}
          error={error}
          onConfirm={(confirmation) => void handleBorrow(confirmation)}
        />
      </ScrollView>
    </View>
  );
}
