import { useRef } from 'react';
import { TextInput, View } from 'react-native';

import { Text } from '@/components/ui/text';

interface CodeInputProps {
  length?: number;
  value: string;
  onChangeText: (value: string) => void;
  editable?: boolean;
  autoFocus?: boolean;
}

export function CodeInput({ length = 6, value, onChangeText, editable = true, autoFocus = true }: CodeInputProps) {
  const inputRef = useRef<TextInput>(null);
  const digits = Array.from({ length }, (_, i) => value[i] ?? '');

  function handleChange(text: string) {
    onChangeText(text.replace(/[^0-9]/g, '').slice(0, length));
  }

  return (
    <View className="relative">
      <View className="flex-row justify-center gap-2" pointerEvents="none">
        {digits.map((digit, index) => {
          const isActive = editable && index === value.length;
          return (
            <View
              key={index}
              className={`h-14 w-11 items-center justify-center rounded-xl border bg-card ${
                isActive ? 'border-foreground' : 'border-border'
              }`}
            >
              <Text className="text-xl font-semibold text-foreground">{digit}</Text>
            </View>
          );
        })}
      </View>
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={handleChange}
        keyboardType="number-pad"
        maxLength={length}
        editable={editable}
        autoFocus={autoFocus}
        caretHidden
        testID="code-input-field"
        className="absolute inset-0 opacity-0"
      />
    </View>
  );
}
