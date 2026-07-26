import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type CustomTabBarProps = Parameters<NonNullable<React.ComponentProps<typeof Tabs>['tabBar']>>[0];

type TabConfig = {
  name: string;
  active: keyof typeof Ionicons.glyphMap;
  inactive: keyof typeof Ionicons.glyphMap;
};

const TABS: TabConfig[] = [
  { name: 'index', active: 'alarm', inactive: 'alarm-outline' },
  { name: 'object', active: 'folder', inactive: 'folder-outline' },
  { name: 'profile', active: 'person', inactive: 'person-outline' },
];

function Icon({
  focused,
  active,
  inactive,
}: {
  focused: boolean;
  active: keyof typeof Ionicons.glyphMap;
  inactive: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <View
      className={`w-[58px] h-[38px] rounded-full overflow-hidden justify-center items-center ${
        focused ? 'bg-brand-50' : 'bg-transparent'
      }`}
    >
      <Ionicons name={focused ? active : inactive} size={25} color="#FFFFFF" />
    </View>
  );
}

export default function CustomTabBar(props: CustomTabBarProps) {
  const currentRoute = props.state.routes[props.state.index].name;
  const insets = useSafeAreaInsets();

  return (
    <View
      className="absolute left-0 right-0 items-center"
      style={{ bottom: Math.max(insets.bottom + 10, 20) }}
    >
      <View className="w-[220px] h-[50px] rounded-full bg-brand-100 flex-row overflow-hidden shadow-lg">
        {TABS.map((tab) => (
          <Pressable
            key={tab.name}
            className="flex-1 justify-center items-center"
            onPress={() => props.navigation.navigate(tab.name)}
          >
            <Icon focused={currentRoute === tab.name} active={tab.active} inactive={tab.inactive} />
          </Pressable>
        ))}
      </View>
    </View>
  );
}
