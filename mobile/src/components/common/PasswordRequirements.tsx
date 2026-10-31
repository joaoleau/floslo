import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Text } from '@/components/ui/text';
import { useTranslation } from 'react-i18next';
import { checkPasswordRequirements } from '@/lib/passwordPolicy';
import { useThemeColors } from '@/hooks/useThemeColors';

interface PasswordRequirementsProps {
  password: string;
  variant?: 'default' | 'onColor';
}

export function PasswordRequirements({ password, variant = 'default' }: PasswordRequirementsProps) {
  const colors = useThemeColors();
  const { t } = useTranslation();
  const requirements = checkPasswordRequirements(password);
  const onColor = variant === 'onColor';

  return (
    <View className="gap-1 px-2" testID="password-requirements">
      {requirements.map((req) => (
        <View key={req.key} className="flex-row items-center gap-2">
          <Ionicons
            name={req.met ? 'checkmark-circle' : 'ellipse-outline'}
            size={14}
            color={req.met ? '#6BAE8E' : onColor ? 'rgba(255,255,255,0.5)' : colors.mutedForeground}
          />
          <Text
            className={onColor ? `text-xs ${req.met ? 'text-white' : 'text-white/60'}` : 'text-xs'}
            style={onColor ? undefined : { color: req.met ? colors.foreground : colors.mutedForeground }}
          >
            {t(`auth.passwordRules.${req.key}`)}
          </Text>
        </View>
      ))}
    </View>
  );
}
