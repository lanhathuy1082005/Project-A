import { useCallback, useEffect, useState } from 'react';
import { Keyboard, ScrollView, Text, View } from 'react-native';
import { InlineNotice } from '@/components/ui/InlineNotice';
import { QRScanner } from '@/components/QRScanner';
import { BackToHomeButton } from '@/components/ui/BackToHomeButton';
import { getErrorMessage } from '@/api/client';
import {
  getAvailableKitsApi,
  borrowItemApi,
  type AvailableKit,
  type ScanConfirmation,
} from '@/api/reservation.api';
import { borrowStyles } from './borrow.styles';

export default function BorrowScreen() {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [scannerKey, setScannerKey] = useState(0);
  const [kits, setKits] = useState<AvailableKit[]>([]);
  const [kitsLoading, setKitsLoading] = useState(true);
  const [kitsError, setKitsError] = useState<string | null>(null);

  const requestKits = useCallback(async () => {
    try {
      return { data: await getAvailableKitsApi(), error: null };
    } catch (requestError) {
      return {
        data: null,
        error: getErrorMessage(requestError, 'Could not load available kits.'),
      };
    }
  }, []);

  const refreshKits = useCallback(async () => {
    setKitsLoading(true);
    const result = await requestKits();
    if (result.data) setKits(result.data);
    setKitsError(result.error);
    setKitsLoading(false);
  }, [requestKits]);

  useEffect(() => {
    let active = true;
    void requestKits().then((result) => {
      if (!active) return;
      if (result.data) setKits(result.data);
      setKitsError(result.error);
      setKitsLoading(false);
    });
    return () => {
      active = false;
    };
  }, [requestKits]);

  const handleBorrow = async (confirmation: ScanConfirmation) => {
    if (submitting) return;

    Keyboard.dismiss();
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      await borrowItemApi(
        confirmation.unitId,
        confirmation.imageB64,
        confirmation.kitScanId,
        confirmation.singleScanId,
      );
      setSuccess('Item borrowed successfully.');
      setScannerKey((key) => key + 1);
      refreshKits();
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
          Choose a mode, then scan an item or kit to borrow it.
        </Text>
        {success ? <InlineNotice message={success} tone="success" /> : null}
        <QRScanner
          key={scannerKey}
          actionLabel="Confirm borrow"
          busy={submitting}
          error={error}
          kitOptions={kits}
          kitOptionsLoading={kitsLoading}
          kitOptionsError={kitsError}
          onRefreshKitOptions={refreshKits}
          allowIncompleteKit
          persistKitScans
          verifySingleItems
          persistSingleScans
          onConfirm={(confirmation) => void handleBorrow(confirmation)}
        />
      </ScrollView>
    </View>
  );
}
