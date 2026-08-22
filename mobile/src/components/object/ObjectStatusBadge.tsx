import { ActivityIndicator } from 'react-native';

import { Badge } from '@/components/ui/badge';
import { Text } from '@/components/ui/text';
import { ObjectStatus } from '@/types/domain/Object';
import { useThemeColors } from '@/hooks/useThemeColors';

interface ObjectStatusBadgeProps {
  status: ObjectStatus;
}

const STATUS_LABEL: Record<Exclude<ObjectStatus, 'active'>, string> = {
  processing: 'Processando',
  failed: 'Falhou',
};

// "active" is the steady state every object ends up in, so it renders nothing here —
// only "processing"/"failed" are worth calling out to the user. Match each status
// explicitly instead of falling through to "processing": an unrecognized/missing value
// (e.g. an older API response without this field yet) must not read as a permanent
// stuck-processing spinner.
export function ObjectStatusBadge({ status }: ObjectStatusBadgeProps) {
  const colors = useThemeColors();

  if (status === 'failed') {
    return (
      <Badge variant="destructive" className="flex-row items-center gap-1 rounded-full px-3">
        <Text className="text-xs font-medium uppercase text-white">{STATUS_LABEL.failed}</Text>
      </Badge>
    );
  }

  if (status === 'processing') {
    return (
      <Badge className="flex-row items-center gap-1.5 rounded-full bg-muted px-3">
        <ActivityIndicator size="small" color={colors.brand} />
        <Text className="text-xs font-medium uppercase text-brand-100">{STATUS_LABEL.processing}</Text>
      </Badge>
    );
  }

  return null;
}
