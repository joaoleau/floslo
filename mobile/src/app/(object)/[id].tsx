import { useState } from 'react';
import {
  View,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

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
import { ObjectStatusBadge } from '@/components/object/ObjectStatusBadge';
import {
  useObjectQuery,
  useUpdateObjectTagsMutation,
  useDeleteObjectMutation,
} from '@/hooks/useObjects';
import { useThemeColors } from '@/hooks/useThemeColors';
import { getColorForId } from '@/lib/hashColor';
import { getExtensionColor } from '@/lib/fileExtensionColors';
import { showAlert } from '@/services/alertService';

export default function ObjectDetails() {
  const router = useRouter();
  const colors = useThemeColors();
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
    } catch (err) {
      console.error(`[ObjectDetails] Falha ao salvar tags do objeto "${object.id}"`, err);
      showAlert('Erro', 'Falha ao salvar as alterações.');
    }
  }

  function handleDelete() {
    if (!object) return;

    showAlert(
      'Excluir Objeto',
      'Tem certeza que deseja excluir? Esta ação não pode ser desfeita.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteMutation.mutateAsync(object.id);
              router.back();
            } catch (err) {
              console.error(`[ObjectDetails] Falha ao excluir objeto "${object.id}"`, err);
              showAlert('Erro', 'Falha ao excluir o objeto.');
            }
          },
        },
      ],
    );
  }

  if (isPending) {
    return (
      <Screen>
        <Header title="Editar Objeto" />
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color={colors.brand} />
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

  const isEditable = object.status === 'active';
  // Mesma cor por hash do id usada no card da listagem, esmaecendo pro fundo padrão do
  // app -- só um toque de cor no topo da tela. A badge de extensão usa a mesma cor
  // semântica por tipo de arquivo do ObjectCard.
  const accentColor = getColorForId(object.id);
  const extensionColor = getExtensionColor(object.extension);

  return (
    <Screen edges={['top', 'left', 'right', 'bottom']}>
      <Header
        title="Editar Objeto"
        rightAction={
          updateTagsMutation.isPending ? (
            <ActivityIndicator color={colors.brand} />
          ) : (
            <HeaderAction icon="checkmark" onPress={handleSave} disabled={!isEditable} />
          )
        }
      />

      <LinearGradient colors={[accentColor, colors.background]} style={{ flex: 1 }}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          className="flex-1"
        >
          <View className="flex-1 gap-4 p-4">
            <Card className="flex-1 rounded-3xl p-5 gap-4">
              <View className="flex-row items-center justify-between">
                <Text
                  className="text-2xl font-medium text-foreground"
                  style={{
                    flexGrow: 1,
                    flexShrink: 1,
                    flexBasis: 0,
                    marginRight: 12,
                    overflow: 'hidden',
                  }}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {object.name}
                </Text>
                <Badge
                  className="rounded-full px-3 border-transparent"
                  style={{ flexShrink: 0, backgroundColor: extensionColor }}
                >
                  <Text className="uppercase text-white">{object.extension}</Text>
                </Badge>
              </View>

              {!isEditable && (
                <View className="flex-row items-center justify-between">
                  <ObjectStatusBadge status={object.status} />
                  {object.status === 'failed' && (
                    <Text className="flex-1 text-right text-sm text-muted-foreground">
                      {object.errorMessage || 'Falha ao processar o documento.'}
                    </Text>
                  )}
                </View>
              )}

              <Separator />

              <View className="flex-row gap-2">
                <Input
                  className="flex-1"
                  value={newTag}
                  onChangeText={setNewTag}
                  placeholder={
                    isEditable ? 'Digite uma nova tag' : 'Disponível após o processamento'
                  }
                  onSubmitEditing={addTag}
                  editable={isEditable}
                />
                <Button onPress={addTag} className="bg-brand-100" disabled={!isEditable}>
                  <Ionicons name="add" size={18} color="white" />
                </Button>
              </View>

              <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
                <ObjectTagsList tags={tags} onRemoveTag={isEditable ? removeTag : undefined} />
              </ScrollView>
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
      </LinearGradient>
    </Screen>
  );
}
