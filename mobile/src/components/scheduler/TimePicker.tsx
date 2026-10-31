import { useMemo, useState } from 'react';
import { Platform, Pressable, Text } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

interface TimePickerProps {
  value: string;
  onChange: (value: string) => void;
}

function parseTime(time: string) {
  const [hours, minutes] = time.split(':').map(Number);

  const date = new Date();
  date.setHours(hours, minutes, 0, 0);

  return date;
}

function formatTime(date: Date) {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  return `${hours}:${minutes}`;
}

export function TimePicker({ value, onChange }: TimePickerProps) {
  const [open, setOpen] = useState(false);

  const date = useMemo(() => parseTime(value), [value]);

  function handleChange(_event: unknown, selectedDate?: Date) {
    if (Platform.OS === 'android') {
      setOpen(false);
    }

    if (!selectedDate) {
      return;
    }

    onChange(formatTime(selectedDate));
  }

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        className="flex-1 w-full h-full rounded-md px-4 py-3 items-center justify-center"
      >
        <Text className="text-6xl font-medium text-foreground">{value}</Text>
      </Pressable>

      {open && (
        <DateTimePicker
          value={date}
          mode="time"
          is24Hour
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleChange}
        />
      )}
    </>
  );
}
