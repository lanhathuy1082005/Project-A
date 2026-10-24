import { useState } from 'react';
import { Modal, Text, TextInput, View } from 'react-native';
import { getErrorMessage } from '@/api/client';
import { submitFeedbackApi } from '@/api/feedback.api';
import { AppButton } from '@/components/ui/AppButton';
import { InlineNotice } from '@/components/ui/InlineNotice';
import { historyStyles } from './history.styles';

interface FeedbackModalProps {
  visible: boolean;
  onClose: () => void;
}

export function FeedbackModal({ visible, onClose }: FeedbackModalProps) {
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const submit = async () => {
    const trimmedContent = content.trim();
    if (!trimmedContent || submitting) return;

    setSubmitting(true);
    setError(null);
    setSuccess(false);
    try {
      await submitFeedbackApi(trimmedContent);
      setContent('');
      setSuccess(true);
    } catch (requestError) {
      setError(
        getErrorMessage(requestError, 'Could not submit your feedback.'),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const close = () => {
    if (submitting) return;
    setError(null);
    setSuccess(false);
    onClose();
  };

  return (
    <Modal
      animationType="fade"
      onRequestClose={close}
      transparent
      visible={visible}
    >
      <View style={historyStyles.modalBackdrop}>
        <View style={historyStyles.modalCard}>
          <Text style={historyStyles.modalTitle}>Send feedback</Text>
          <TextInput
            accessibilityLabel="Feedback"
            editable={!submitting && !success}
            multiline
            onChangeText={setContent}
            placeholder="Share your feedback..."
            style={[historyStyles.input, { minHeight: 120, textAlignVertical: 'top', paddingVertical: 12 }]}
            value={content}
          />
          {error ? <InlineNotice message={error} tone="error" /> : null}
          {success ? (
            <InlineNotice
              message="Feedback submitted successfully."
              tone="success"
            />
          ) : null}
          <View style={historyStyles.actions}>
            {success ? (
              <AppButton label="Done" onPress={close} />
            ) : (
              <AppButton
                label="Submit feedback"
                onPress={() => void submit()}
                disabled={!content.trim()}
                busy={submitting}
              />
            )}
            {!success ? (
              <AppButton
                label="Not now"
                onPress={close}
                disabled={submitting}
                variant="secondary"
              />
            ) : null}
          </View>
        </View>
      </View>
    </Modal>
  );
}
