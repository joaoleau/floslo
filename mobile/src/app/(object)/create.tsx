import { useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';

import { Screen } from '@/components/common/Screen';
import { Header } from '@/components/common/Header';
import { Card } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';

import { useUploadObjectMutation } from '@/hooks/useObjects';
import { useThemeColors } from '@/hooks/useThemeColors';
import { showAlert } from '@/services/alertService';

// Só PDF: o processamento lê o documento página por página.
const ALLOWED_EXTENSIONS = ['pdf'];
const ALLOWED_MIME_TYPES = ['application/pdf'];

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
  const { t } = useTranslation();
  const colors = useThemeColors();
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
      showAlert(t('objects.create.invalidFileTitle'), t('objects.create.invalidFile'));
      return;
    }

    setPickedFile({ uri: asset.uri, name: asset.name, mimeType: asset.mimeType });
  }

  async function handleUpload() {
    if (!pickedFile) return;

    try {
      await uploadMutation.mutateAsync(pickedFile);
      showAlert(
        t('objects.create.sentTitle'),
        t('objects.create.sent'),
        [{ text: t('common.ok'), onPress: () => router.back() }]
      );
    } catch (err) {
      console.error('[CreateObject] Falha ao enviar documento', pickedFile, err);
      showAlert(t('common.error'), t('objects.create.failed'));
    }
  }

  return (
    <Screen edges={['top', 'left', 'right', 'bottom']}>
      <Header title={t('objects.create.title')} />

      <View className="flex-1 gap-4 p-4">
        <Pressable onPress={handlePickFile} disabled={uploadMutation.isPending}>
          <Card className="rounded-3xl p-8 items-center justify-center gap-3 border-2 border-dashed border-border">
            <Ionicons name="cloud-upload-outline" size={40} color={colors.brand} />
            {pickedFile ? (
              <View className="items-center gap-1">
                <Text className="font-semibold text-foreground text-center">{pickedFile.name}</Text>
                <Text className="text-sm text-muted-foreground">{t('objects.create.pickAnother')}</Text>
              </View>
            ) : (
              <View className="items-center gap-1">
                <Text className="font-semibold text-foreground">{t('objects.create.pick')}</Text>
                <Text className="text-sm text-muted-foreground">PDF</Text>
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
              <Text className="ml-2 font-semibold text-white">{t('objects.create.submit')}</Text>
            </>
          )}
        </Button>
      </View>
    </Screen>
  );
}
