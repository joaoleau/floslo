import { View } from 'react-native';

import { ObjectTagItem } from './ObjectTagItem';

interface ObjectTagsListProps {
  tags: string[];

  onPressTag?: (tag: string) => void;

  onRemoveTag?: (tag: string) => void;
}

export function ObjectTagsList({ tags, onPressTag, onRemoveTag }: ObjectTagsListProps) {
  return (
    <View className="flex-row flex-wrap gap-2">
      {tags.map((tag) => (
        <ObjectTagItem key={tag} tag={tag} onPressTag={onPressTag} onRemoveTag={onRemoveTag} />
      ))}
    </View>
  );
}
