import { screen, fireEvent } from '@testing-library/react-native';
import { renderWithProviders } from '@/test-utils/renderWithProviders';
import { LanguagePicker } from './LanguagePicker';
import { SUPPORTED_LANGUAGES } from '@/types/domain/Scheduler';

describe('LanguagePicker', () => {
  it('shows the field with the label and the selected language, and no list yet', async () => {
    await renderWithProviders(<LanguagePicker value="es" onChange={jest.fn()} />);
    expect(screen.getByText('Idioma dos desafios')).toBeTruthy();
    expect(screen.getByTestId('language-selected-label').props.children).toBe('Espanhol');
    expect(screen.queryByTestId('language-option-pt')).toBeNull();
  });

  it('opens the list with every supported language when the field is tapped', async () => {
    await renderWithProviders(<LanguagePicker value="pt" onChange={jest.fn()} />);
    await fireEvent.press(screen.getByTestId('language-picker'));
    for (const option of SUPPORTED_LANGUAGES) {
      expect(screen.getByTestId(`language-option-${option.value}`)).toBeTruthy();
    }
  });

  it('reports the chosen language and closes the list', async () => {
    const onChange = jest.fn();
    await renderWithProviders(<LanguagePicker value="pt" onChange={onChange} />);
    await fireEvent.press(screen.getByTestId('language-picker'));
    await fireEvent.press(screen.getByTestId('language-option-de'));
    expect(onChange).toHaveBeenCalledWith('de');
    expect(screen.queryByTestId('language-option-de')).toBeNull();
  });
});
