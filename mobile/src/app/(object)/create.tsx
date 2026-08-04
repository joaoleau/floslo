import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';

import { Screen } from '@/components/common/Screen';
import { Header } from '@/components/common/Header';
import { Card } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';

import { useUploadObjectMutation } from '@/hooks/useObjects';

const ALLOWED_EXTENSIONS = ['pdf', 'txt', 'md', 'pptx'];
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'text/plain',
  'text/markdown',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
];

interface PickedFile {
  uri: string;
  name: string;
  mimeType?: string;
}

function getExtension(filename: string): string {
  const lastDot = filename.lastIndexOf('.');
  return lastDot > 0 ? filename.slice(lastDot + 1).toLowerCase() : '';
}

export default function CreateObject() {
  const router = useRouter();
  const [pickedFile, setPickedFile] = useState<PickedFile | null>(null);
  const uploadMutation = useUploadObjectMutation();

  async function handlePickFile() {
    const result = await DocumentPicker.getDocumentAsync({
      type: ALLOWED_MIME_TYPES,
      copyToCacheDirectory: true,
      multiple: false,
    });

    if (result.canceled || result.assets.length === 0) return;

    const asset = result.assets[0];
    if (!ALLOWED_EXTENSIONS.includes(getExtension(asset.name))) {
      Alert.alert('Arquivo inválido', 'Selecione um arquivo PDF, TXT, MD ou PPTX.');
      return;
    }

    setPickedFile({ uri: asset.uri, name: asset.name, mimeType: asset.mimeType });
  }

  async function handleUpload() {
    if (!pickedFile) return;

    try {
      await uploadMutation.mutateAsync(pickedFile);
      Alert.alert(
        'Documento enviado',
        'Pode levar alguns minutos até ele ficar disponível para gerar quizzes.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch {
      Alert.alert('Erro', 'Falha ao enviar o documento.');
    }
  }

  return (
    <Screen edges={['top', 'left', 'right', 'bottom']}>
      <Header title="Novo Objeto" />

      <View className="flex-1 gap-4 p-4">
        <Pressable onPress={handlePickFile} disabled={uploadMutation.isPending}>
          <Card className="rounded-3xl bg-white p-8 items-center justify-center gap-3 border-2 border-dashed border-zinc-300">
            <Ionicons name="cloud-upload-outline" size={40} color="#33405C" />
            {pickedFile ? (
              <View className="items-center gap-1">
                <Text className="font-semibold text-brand-100 text-center">{pickedFile.name}</Text>
                <Text className="text-sm text-zinc-500">Toque para escolher outro arquivo</Text>
              </View>
            ) : (
              <View className="items-center gap-1">
                <Text className="font-semibold text-brand-100">Selecionar arquivo</Text>
                <Text className="text-sm text-zinc-500">PDF, TXT, MD ou PPTX</Text>
              </View>
            )}
          </Card>
        </Pressable>

        <Button
          onPress={handleUpload}
          disabled={!pickedFile || uploadMutation.isPending}
          className="flex-row items-center justify-center rounded-3xl bg-brand-100 py-2"
        >
          {uploadMutation.isPending ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="cloud-upload" size={20} color="white" />
              <Text className="ml-2 font-semibold text-white">Enviar</Text>
            </>
          )}
        </Button>
      </View>
    </Screen>
  );
}
