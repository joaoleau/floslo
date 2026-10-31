import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui/text';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useMeQuery } from '@/hooks/useUser';
import { displayedStreak } from '@/lib/streak';

type CustomTabBarProps = Parameters<NonNullable<React.ComponentProps<typeof Tabs>['tabBar']>>[0];

type TabConfig = {
  name: string;
  active: keyof typeof Ionicons.glyphMap;
  inactive: keyof typeof Ionicons.glyphMap;
};

const TABS: TabConfig[] = [
  { name: 'index', active: 'alarm', inactive: 'alarm-outline' },
  { name: 'object', active: 'folder', inactive: 'folder-outline' },
  { name: 'history', active: 'extension-puzzle', inactive: 'extension-puzzle-outline' },
  { name: 'profile', active: 'person', inactive: 'person-outline' },
];

function Icon({
  focused,
  active,
  inactive,
  ink,
}: {
  focused: boolean;
  active: keyof typeof Ionicons.glyphMap;
  inactive: keyof typeof Ionicons.glyphMap;
  ink: string;
}) {
  return (
    <View
      className={`w-[42px] h-[42px] rounded-full overflow-hidden justify-center items-center ${
        focused ? 'bg-brand-100' : 'bg-transparent'
      }`}
    >
      <Ionicons name={focused ? active : inactive} size={22} color={focused ? '#FFFFFF' : ink} />
    </View>
  );
}

export default function CustomTabBar(props: CustomTabBarProps) {
  const currentRoute = props.state.routes[props.state.index].name;
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const { data: user } = useMeQuery();
  const streak = user ? displayedStreak(user.currentStreak, user.lastActiveDate) : undefined;

  return (
    <View
      className="absolute left-0 right-0 items-center"
      style={{ bottom: Math.max(insets.bottom + 10, 20) }}
    >
      <View>
        <View className="w-[216px] h-[62px] rounded-full bg-card border border-border flex-row overflow-hidden shadow-lg">
          {TABS.map((tab) => (
            <Pressable
              key={tab.name}
              className="flex-1 justify-center items-center"
              onPress={() => props.navigation.navigate(tab.name)}
            >
              <Icon
                focused={currentRoute === tab.name}
                active={tab.active}
                inactive={tab.inactive}
                ink={colors.primary}
              />
            </Pressable>
          ))}
        </View>

        {!!streak && streak > 0 && (
          <View
            className="absolute -top-3 -right-2 h-7 flex-row items-center gap-1 rounded-full border-2 border-background px-2"
            style={{ backgroundColor: '#F59E0B' }}
          >
            <Ionicons name="flame" size={13} color="#FFFFFF" />
            <Text className="text-xs font-bold text-white">{streak}</Text>
          </View>
        )}
      </View>
    </View>
  );
}
