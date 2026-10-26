import { useState } from 'react';
import { View, Pressable, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/text';
import { Card } from '@/components/ui/card';
import { SUPPORTED_LANGUAGES, SupportedLanguage } from '@/types/domain/Scheduler';
import { useThemeColors } from '@/hooks/useThemeColors';

interface LanguagePickerProps {
  value: SupportedLanguage;
  onChange: (language: SupportedLanguage) => void;
}

// Campo simples com o idioma escolhido; ao tocar abre uma folha inferior com a lista.
export function LanguagePicker({ value, onChange }: LanguagePickerProps) {
  const colors = useThemeColors();
  const [open, setOpen] = useState(false);
  const selected = SUPPORTED_LANGUAGES.find((option) => option.value === value) ?? SUPPORTED_LANGUAGES[0];

  return (
    <View className="gap-2">
      <Text className="font-medium text-foreground">Idioma dos desafios</Text>

      <Pressable
        testID="language-picker"
        onPress={() => setOpen(true)}
        className="h-12 flex-row items-center gap-3 rounded-xl border border-border bg-muted px-4"
      >
        <Text style={{ fontSize: 20 }}>{selected.flag}</Text>
        <Text testID="language-selected-label" className="flex-1 font-medium text-foreground">
          {selected.label}
        </Text>
        <Ionicons name="chevron-down" size={18} color={colors.brand} />
      </Pressable>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <View className="flex-1 justify-end bg-black/40">
          <Card className="rounded-t-3xl p-5 gap-1">
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-lg font-semibold text-foreground">Idioma dos desafios</Text>
              <Pressable hitSlop={8} onPress={() => setOpen(false)}>
                <Ionicons name="close" size={24} color={colors.brand} />
              </Pressable>
            </View>

            {SUPPORTED_LANGUAGES.map((option) => {
              const isSelected = option.value === value;
              return (
                <Pressable
                  key={option.value}
                  testID={`language-option-${option.value}`}
                  onPress={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                  className={`flex-row items-center gap-3 p-3 rounded-xl ${
                    isSelected ? 'bg-brand-100/10' : 'active:bg-secondary'
                  }`}
                >
                  <Text style={{ fontSize: 22 }}>{option.flag}</Text>
                  <Text className={`flex-1 ${isSelected ? 'font-semibold text-foreground' : 'text-foreground'}`}>
                    {option.label}
                  </Text>
                  {isSelected && <Ionicons name="checkmark-circle" size={20} color={colors.success} />}
                </Pressable>
              );
            })}
          </Card>
        </View>
      </Modal>
    </View>
  );
}
