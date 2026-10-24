import { Text } from 'react-native';
import { noticeStyles } from './inline-notice.styles';

interface InlineNoticeProps {
  message: string;
  tone?: 'error' | 'success' | 'info';
}

export function InlineNotice({ message, tone = 'info' }: InlineNoticeProps) {
  const style =
    tone === 'error'
      ? noticeStyles.error
      : tone === 'success'
        ? noticeStyles.success
        : noticeStyles.info;

  return (
    <Text accessibilityRole={tone === 'error' ? 'alert' : undefined} style={style}>
      {message}
    </Text>
  );
}
