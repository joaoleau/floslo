import { View, Text, Pressable } from 'react-native';

export default function Upload() {
  return (
    <View className="flex-1 items-center justify-center">
      <Text className="text-lg font-bold">Upload</Text>
      <Pressable className="mt-4 rounded bg-blue-500 px-4 py-2">
        <Text className="text-white">Upload File</Text>
      </Pressable>
    </View>
  );
}
