import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Text } from '@/components/ui/text';
import { useTranslation } from 'react-i18next';

interface ItemCountStepperProps {
  testID: string;
  label: string;
  description: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  color: string;
  value: number;
  // Maior valor que este contador aceita agora: o que já tem mais o saldo que sobra nos outros tipos.
  cap: number;
  onChange: (value: number) => void;
}

interface StepButtonProps {
  testID: string;
  icon: 'add' | 'remove';
  color: string;
  label: string;
  disabled: boolean;
  onPress: () => void;
}

function StepButton({ testID, icon, color, label, disabled, onPress }: StepButtonProps) {
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={disabled}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      className="items-center justify-center rounded-full"
      style={{ width: 28, height: 28, backgroundColor: `${color}22`, opacity: disabled ? 0.35 : 1 }}
    >
      <Ionicons name={icon} size={16} color={color} />
    </Pressable>
  );
}

// Quantidade de itens de um tipo de desafio: o número no meio, com um botão de menos de um lado e
// um de mais do outro. O mais para no `cap`, porque o limite de itens é compartilhado entre todos
// os tipos do agendador; o menos para no zero, que tira o tipo do agendador.
export function ItemCountStepper({ testID, label, description, icon, color, value, cap, onChange }: ItemCountStepperProps) {
  const { t } = useTranslation();
  return (
    <View testID={testID} className="flex-row items-center justify-between gap-2">
      <View className="flex-1 flex-row items-center gap-2">
        <Ionicons name={icon} size={20} color={color} />
        <View className="flex-1">
          <Text className="font-semibold text-foreground">{label}</Text>
          <Text className="text-xs text-muted-foreground" numberOfLines={2}>
            {description}
          </Text>
        </View>
      </View>

      <View className="flex-row items-center gap-1.5">
        <StepButton
          testID={`${testID}-decrement`}
          icon="remove"
          color={color}
          label={t('schedulers.form.decrease', { label })}
          disabled={value <= 0}
          onPress={() => onChange(Math.max(value - 1, 0))}
        />
        <Text
          testID={`${testID}-value`}
          className={`text-base font-bold ${value > 0 ? '' : 'text-muted-foreground'}`}
          style={{ minWidth: 22, textAlign: 'center', ...(value > 0 ? { color } : {}) }}
        >
          {value}
        </Text>
        <StepButton
          testID={`${testID}-increment`}
          icon="add"
          color={color}
          label={t('schedulers.form.increase', { label })}
          disabled={value >= cap}
          onPress={() => onChange(Math.min(value + 1, cap))}
        />
      </View>
    </View>
  );
}
