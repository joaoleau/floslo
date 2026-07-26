import { useEffect, useState } from 'react';
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
import { objectService } from '@/services/objectService';
import { ObjectType } from '@/types/domain/Object';

export default function ObjectDetails() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [object, setObject] = useState<ObjectType | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    async function loadObject() {
      try {
        const data = await objectService.getById(id);
        if (data) {
          setObject(data);
          setTags(data.tags);
        }
      } catch (error) {
        Alert.alert('Erro', 'Falha ao buscar o objeto.');
      } finally {
        setIsLoading(false);
      }
    }
    loadObject();
  }, [id]);

  function addTag() {
    const tag = newTag.trim();
    if (!tag || tags.includes(tag)) return;

    setTags([...tags, tag]);
    setNewTag('');
  }

  function removeTag(tag: string) {
    setTags(tags.filter((item) => item !== tag));
  }

  // 4. Salvar as alterações e voltar
  async function handleSave() {
    if (!object) return;
    setIsSaving(true);
    try {
      await objectService.update(object.id, tags);
      router.back(); // Volta para a tela anterior
    } catch (error) {
      Alert.alert('Erro', 'Falha ao salvar as alterações.');
      setIsSaving(false); // Só desativa o loading se der erro
    }
  }

  // 5. Deletar e voltar
  async function handleDelete() {
    if (!object) return;

    Alert.alert(
      'Excluir Objeto',
      'Tem certeza que deseja excluir? Esta ação não pode ser desfeita.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              await objectService.deleteObject(object.id);
              router.back();
            } catch (error) {
              Alert.alert('Erro', 'Falha ao excluir o objeto.');
            }
          },
        },
      ],
    );
  }

  if (isLoading) {
    return (
      <Screen>
        <Header title="Editar Objeto" />
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#FFFFFF" />
        </View>
      </Screen>
    );
  }

  if (!object) {
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
          // Substitui o ícone por um loading se estiver salvando
          isSaving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <HeaderAction icon="checkmark" onPress={handleSave} />
          )
        }
      />

      {/* KeyboardAvoidingView impede que o teclado cubra o Input */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
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
                onSubmitEditing={addTag} // Permite adicionar apertando "Enter" no teclado
              />
              <Button onPress={addTag} className="bg-brand-100">
                <Ionicons name="add" size={18} color="white" />
              </Button>
            </View>

            {/* Troquei o h-80 por flex-1 para ocupar o espaço disponível dinamicamente */}
            <View className="flex-1">
              <ObjectTagsList tags={tags} onRemoveTag={removeTag} />
            </View>
          </Card>

          <Button
            onPress={handleDelete}
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
