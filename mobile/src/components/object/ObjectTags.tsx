import { View } from 'react-native';

import { ObjectTagItem } from './ObjectTagItem';

interface ObjectTagsProps {
  tags: string[];

  maxVisible?: number;

  onPressTag?: (tag: string) => void;
  onRemoveTag?: (tag: string) => void;

  variant?: 'default' | 'onColor';
}

export function ObjectTags({ tags, maxVisible = 3, onPressTag, onRemoveTag, variant = 'default' }: ObjectTagsProps) {
  const visibleTags = tags.slice(0, maxVisible);

  const hiddenCount = tags.length - visibleTags.length;

  return (
    <View className="flex-row flex-wrap gap-2">
      {visibleTags.map((tag) => (
        <ObjectTagItem key={tag} tag={tag} onPressTag={onPressTag} onRemoveTag={onRemoveTag} variant={variant} />
      ))}

      {hiddenCount > 0 && <ObjectTagItem tag={`+${hiddenCount}`} variant={variant} />}
    </View>
  );
}
