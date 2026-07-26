import { FlatList } from 'react-native';

import { ObjectTagItem } from './ObjectTagItem';

interface ObjectTagsListProps {
  tags: string[];

  onPressTag?: (tag: string) => void;

  onRemoveTag?: (tag: string) => void;
}

export function ObjectTagsList({ tags, onPressTag, onRemoveTag }: ObjectTagsListProps) {
  return (
    <FlatList
      data={tags}
      nestedScrollEnabled
      keyExtractor={(item) => item}

      numColumns={3}

      columnWrapperClassName="gap-2"

      contentContainerClassName="gap-2"

      showsVerticalScrollIndicator={false}

      renderItem={({ item }) => (
        <ObjectTagItem tag={item} onPressTag={onPressTag} onRemoveTag={onRemoveTag} />
      )}
    />
  );
}
