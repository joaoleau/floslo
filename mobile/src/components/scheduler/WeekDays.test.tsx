import { render, screen, fireEvent } from '@testing-library/react-native';
import { WeekDays } from './WeekDays';

describe('WeekDays', () => {
  it('calls onToggleDay with the specific weekday that was pressed', async () => {
    const onToggleDay = jest.fn();
    await render(<WeekDays weekDays={['monday']} onToggleDay={onToggleDay} />);

    await fireEvent.press(screen.getByTestId('weekday-friday'));

    expect(onToggleDay).toHaveBeenCalledTimes(1);
    expect(onToggleDay).toHaveBeenCalledWith('friday');
  });

  it('renders all 7 days regardless of which ones are selected', async () => {
    await render(<WeekDays weekDays={[]} onToggleDay={jest.fn()} />);

    ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'].forEach((day) => {
      expect(screen.getByTestId(`weekday-${day}`)).toBeTruthy();
    });
  });

  it('is not pressable when no onToggleDay handler is given (read-only display)', async () => {
    await render(<WeekDays weekDays={['monday']} />);
    expect(screen.getByTestId('weekday-monday').props.accessibilityState.disabled).toBe(true);
  });
});
