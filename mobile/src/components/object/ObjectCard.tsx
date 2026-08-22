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
      <Card className="w-full rounded-[32px] bg-card px-5 py-4">
        <View className="flex-row items-start justify-between">
          <Text
            className="text-lg font-medium text-foreground"
            style={{ flexGrow: 1, flexShrink: 1, flexBasis: 0, marginRight: 12, overflow: 'hidden' }}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {object.name}
          </Text>

          <Badge className="rounded-full bg-muted px-3" style={{ flexShrink: 0 }}>
            <Text className="text-xs font-medium uppercase text-foreground">{object.extension}</Text>
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
