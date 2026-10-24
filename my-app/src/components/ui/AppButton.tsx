import { ActivityIndicator, Pressable, Text } from 'react-native';
import { buttonStyles } from './app-button.styles';

interface AppButtonProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  busy?: boolean;
  variant?: 'primary' | 'secondary';
  accessibilityLabel?: string;
}

export function AppButton({
  label,
  onPress,
  disabled = false,
  busy = false,
  variant = 'primary',
  accessibilityLabel,
}: AppButtonProps) {
  const isDisabled = disabled || busy;
  const buttonStyle =
    variant === 'primary'
      ? buttonStyles.primary
      : buttonStyles.secondary;
  const textStyle =
    variant === 'primary'
      ? buttonStyles.primaryText
      : buttonStyles.secondaryText;

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy }}
      disabled={isDisabled}
      onPress={onPress}
      style={[buttonStyles.button, buttonStyle, isDisabled && buttonStyles.disabled]}
    >
      {busy ? (
        <ActivityIndicator
          color={variant === 'primary' ? '#ffffff' : '#111111'}
        />
      ) : (
        <Text style={textStyle}>{label}</Text>
      )}
    </Pressable>
  );
}
