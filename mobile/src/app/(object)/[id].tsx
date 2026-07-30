import { useState } from 'react';
import { View, ActivityIndicator, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Screen } from '@/components/common/Screen';
import { Header } from '@/components/common/Header';
import { HeaderAction } from '@/components/common/HeaderAction';

import { Text } from '@/components/ui/text';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

import { ObjectTagsList } from '@/components/object/ObjectTagsList';
import { useObjectQuery, useUpdateObjectTagsMutation, useDeleteObjectMutation } from '@/hooks/useObjects';

export default function ObjectDetails() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data: object, isPending, isError } = useObjectQuery(id);
  const updateTagsMutation = useUpdateObjectTagsMutation();
  const deleteMutation = useDeleteObjectMutation();

  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [loadedObjectId, setLoadedObjectId] = useState<string | null>(null);

  // Reset local tag state when a (new) object finishes loading, without a
  // setState-in-effect cascade — see https://react.dev/learn/you-might-not-need-an-effect
  if (object && object.id !== loadedObjectId) {
    setLoadedObjectId(object.id);
    setTags(object.tags);
  }

  function addTag() {
    const tag = newTag.trim();
    if (!tag || tags.includes(tag)) return;

    setTags([...tags, tag]);
    setNewTag('');
  }

  function removeTag(tag: string) {
    setTags(tags.filter((item) => item !== tag));
  }

  async function handleSave() {
    if (!object) return;
    try {
      await updateTagsMutation.mutateAsync({ id: object.id, tags });
      router.back();
    } catch {
      Alert.alert('Erro', 'Falha ao salvar as alterações.');
    }
  }

  function handleDelete() {
    if (!object) return;

    Alert.alert('Excluir Objeto', 'Tem certeza que deseja excluir? Esta ação não pode ser desfeita.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteMutation.mutateAsync(object.id);
            router.back();
          } catch {
            Alert.alert('Erro', 'Falha ao excluir o objeto.');
          }
        },
      },
    ]);
  }

  if (isPending) {
    return (
      <Screen>
        <Header title="Editar Objeto" />
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#FFFFFF" />
        </View>
      </Screen>
    );
  }

  if (isError || !object) {
    return (
      <Screen>
        <Header title="Erro" />
        <View className="flex-1 justify-center items-center">
          <Text>Objeto não encontrado.</Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen edges={['top', 'left', 'right', 'bottom']}>
      <Header
        title="Editar Objeto"
        rightAction={
          updateTagsMutation.isPending ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <HeaderAction icon="checkmark" onPress={handleSave} />
          )
        }
      />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
        <View className="flex-1 gap-4 p-4">
          <Card className="flex-1 rounded-3xl bg-white p-5 gap-4">
            <View className="flex-row items-center justify-between">
              <Text className="text-2xl font-medium text-brand-100">{object.name}</Text>
              <Badge className="rounded-full bg-muted px-3">
                <Text className="uppercase text-brand-100">{object.extension}</Text>
              </Badge>
            </View>

            <Separator />

            <View className="flex-row gap-2">
              <Input
                className="flex-1"
                value={newTag}
                onChangeText={setNewTag}
                placeholder="Digite uma nova tag"
                onSubmitEditing={addTag}
              />
              <Button onPress={addTag} className="bg-brand-100">
                <Ionicons name="add" size={18} color="white" />
              </Button>
            </View>

            <View className="flex-1">
              <ObjectTagsList tags={tags} onRemoveTag={removeTag} />
            </View>
          </Card>

          <Button
            onPress={handleDelete}
            disabled={deleteMutation.isPending}
            className="flex-row items-center justify-center rounded-3xl bg-red-600 py-2"
          >
            <Ionicons name="trash-outline" size={20} color="white" />
            <Text className="ml-2 font-semibold text-white">Excluir objeto</Text>
          </Button>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}
