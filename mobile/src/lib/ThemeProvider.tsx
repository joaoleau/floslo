import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import { View, useColorScheme } from 'react-native';

import { preferencesStorage } from '@/storage/preferencesStorage';
import { getThemeStyle } from '@/lib/theme-tokens';

export type ThemePreference = 'light' | 'dark' | 'system';

interface ThemeContextValue {
  mode: 'light' | 'dark';
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function isThemePreference(value: string | null): value is ThemePreference {
  return value === 'light' || value === 'dark' || value === 'system';
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>('system');

  useEffect(() => {
    preferencesStorage.getThemeMode().then((saved) => {
      if (isThemePreference(saved)) {
        setPreferenceState(saved);
      }
    });
  }, []);

  function setPreference(next: ThemePreference) {
    setPreferenceState(next);
    preferencesStorage.saveThemeMode(next);
  }

  const mode: 'light' | 'dark' =
    preference === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : preference;

  const style = useMemo(() => getThemeStyle(mode), [mode]);

  const value = useMemo<ThemeContextValue>(
    () => ({ mode, preference, setPreference }),
    [mode, preference],
  );

  return (
    <ThemeContext.Provider value={value}>
      <View style={[{ flex: 1 }, style]}>{children}</View>
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return ctx;
}
