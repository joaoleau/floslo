import { View, Pressable } from 'react-native';
import { Text } from '@/components/ui/text';

interface ItemCountPickerProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  max?: number;
}

// Trocamos o Slider por uma faixa curta demais (1-5) por uma linha de pílulas numeradas --
// mais bonito e mais fácil de acertar o valor exato com o dedo do que arrastar uma barra.
export function ItemCountPicker({ label, value, onChange, max = 5 }: ItemCountPickerProps) {
  const options = Array.from({ length: max }, (_, index) => index + 1);

  return (
    <View className="gap-2 mt-4">
      <Text className="font-medium text-foreground">{label}</Text>
      <View className="flex-row gap-2">
        {options.map((option) => {
          const selected = value === option;
          return (
            <Pressable
              key={option}
              onPress={() => onChange(option)}
              className={`flex-1 items-center justify-center rounded-xl border-2 ${
                selected ? 'border-brand-100 bg-brand-100' : 'border-border bg-muted'
              }`}
              style={{ height: 48 }}
            >
              <Text className={`text-lg ${selected ? 'font-bold text-white' : 'font-semibold text-foreground'}`}>
                {option}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
