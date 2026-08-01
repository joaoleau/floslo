import { Pressable, View } from 'react-native';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Text } from '@/components/ui/text';

import { ObjectTags } from '@/components/object/ObjectTags';
import { ObjectStatusBadge } from '@/components/object/ObjectStatusBadge';
import { ObjectType } from '@/types/domain/Object';

interface ObjectCardProps {
  object: ObjectType;
  onPress?: () => void;
}

export function ObjectCard({ object, onPress }: ObjectCardProps) {
  return (
    <Pressable onPress={onPress}>
      <Card className="w-full rounded-[32px] bg-background px-5 py-4">
        <View className="flex-row items-start justify-between">
          <Text className="mr-3 flex-1 text-lg font-medium text-brand-100" numberOfLines={1}>
            {object.name}
          </Text>

          <Badge className="rounded-full bg-muted px-3">
            <Text className="text-xs font-medium uppercase text-brand-100">{object.extension}</Text>
          </Badge>
        </View>

        {object.status !== 'active' && (
          <View className="mt-2 flex-row">
            <ObjectStatusBadge status={object.status} />
          </View>
        )}

        <View className="mt-3">
          <ObjectTags tags={object.tags} maxVisible={3} />
        </View>
      </Card>
    </Pressable>
  );
}
