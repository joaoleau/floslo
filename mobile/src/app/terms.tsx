import { ScrollView, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Screen } from '@/components/common/Screen';
import { Header } from '@/components/common/Header';
import { Card } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { TERMS_VERSION } from '@/constants/terms';
import { dateLocale } from '@/i18n';

const SECTIONS = ['about', 'data', 'purpose', 'storage', 'ai', 'copyright', 'rights', 'security', 'changes'] as const;

export default function TermsScreen() {
  const { t } = useTranslation();
  const versionDate = new Date(`${TERMS_VERSION}T12:00:00`).toLocaleDateString(dateLocale());

  return (
    <Screen edges={['top', 'left', 'right', 'bottom']}>
      <Header title={t('terms.title')} />
      <ScrollView className="flex-1" contentContainerClassName="gap-4 p-4 pb-12" showsVerticalScrollIndicator={false}>
        <View className="gap-1 px-1">
          <Text className="text-xl font-bold text-foreground">{t('terms.heading')}</Text>
          <Text className="text-xs text-muted-foreground">{t('terms.updatedAt', { version: versionDate })}</Text>
        </View>

        {SECTIONS.map((key) => (
          <Card key={key} testID={`terms-section-${key}`} className="gap-2 rounded-3xl p-5">
            <Text className="font-semibold text-foreground">{t(`terms.sections.${key}.title`)}</Text>
            <Text className="text-sm leading-5 text-muted-foreground">{t(`terms.sections.${key}.body`)}</Text>
          </Card>
        ))}
      </ScrollView>
    </Screen>
  );
}
