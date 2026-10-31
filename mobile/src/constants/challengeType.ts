import { Ionicons } from '@expo/vector-icons';
import { ChallengeType } from '@/types/domain/History';
import { i18n } from '@/i18n';

export const CHALLENGE_TYPE_META: Record<
  ChallengeType,
  { icon: React.ComponentProps<typeof Ionicons>['name']; color: string; label: string }
> = {
  MULTIPLE_CHOICE: {
    icon: 'school-outline',
    color: '#208fe9',
    get label() {
      return i18n.t('challengeTypes.MULTIPLE_CHOICE');
    },
  },
  TRUE_FALSE: {
    icon: 'checkmark-done-outline',
    color: '#c23232',
    get label() {
      return i18n.t('challengeTypes.TRUE_FALSE');
    },
  },
  DISCOVERY: {
    icon: 'sparkles-outline',
    color: '#7c5cc4',
    get label() {
      return i18n.t('challengeTypes.DISCOVERY');
    },
  },
};
