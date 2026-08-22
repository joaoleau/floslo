import { Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface FloatingActionProps {
  icon: keyof typeof Ionicons.glyphMap;

  onPress: () => void;

  visible?: boolean;

  disabled?: boolean;

  top?: number;

  bottom?: number;

  right?: number;

  size?: number;

  color?: string;

  backgroundColor?: string;
}

export function FloatingAction({
  icon,
  onPress,
  visible = true,
  disabled = false,
  top = 0,
  bottom = 0,
  right = 0,
  size = 30,
  color = '#FFFFFF',
  backgroundColor = '#303031',
}: FloatingActionProps) {
  if (!visible) {
    return null;
  }

  return (
    <Pressable
      hitSlop={10}
      disabled={disabled}
      onPress={onPress}
      style={{
        position: 'absolute',
        top,
        right,

        zIndex: 100,

        // Sem elevation/shadow* de propósito: nesse componente, a sombra nativa do Android
        // (elevation) renderizava como um halo poligonal ("hexágono") em vez de um círculo
        // suave nesse aparelho — um bug do renderer de sombra do GPU/driver, não do RN nem
        // do NativeWind. Confirmado isolando a causa: o hexágono sumiu assim que elevation e
        // shadow* foram removidos, com tudo mais idêntico. Não reintroduzir sombra aqui sem
        // testar de novo num Samsung/One UI.
        backgroundColor,
      }}
      className="h-14 w-14 items-center justify-center rounded-full active:opacity-80"
    >
      <Ionicons name={icon} size={size} color={disabled ? '#A1A1AA' : color} />
    </Pressable>
  );
}
