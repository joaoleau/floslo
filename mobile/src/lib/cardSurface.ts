import { ViewStyle } from 'react-native';

interface CardSurfaceOptions {
  color: string;
  outlined: boolean;
  selected: boolean;
  dimmed: boolean;
  ink: string;
}

export function cardSurface({ color, outlined, selected, dimmed, ink }: CardSurfaceOptions): ViewStyle {
  const style: ViewStyle = { opacity: dimmed ? 0.5 : 1 };

  if (!outlined) {
    style.backgroundColor = color;
    style.borderBottomWidth = 3;
    style.borderBottomColor = selected ? ink : 'rgba(0,0,0,0.18)';
  }

  if (selected) {
    style.borderWidth = 3;
    style.borderColor = ink;
  } else if (!outlined) {
    style.borderWidth = 0;
  }

  return style;
}
