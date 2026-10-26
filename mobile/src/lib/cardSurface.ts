import { ViewStyle } from 'react-native';

interface CardSurfaceOptions {
  /** Cor do item (getColorForId), usada quando o card está ativo. */
  color: string;
  /** Item desativado: só o contorno, sem fundo colorido (o fundo e a borda vêm do className). */
  outlined: boolean;
  /** Selecionado no modo de seleção: borda grossa na cor do texto do card. */
  selected: boolean;
  /** Não selecionado enquanto há seleção em andamento. */
  dimmed: boolean;
  /** Cor do texto e dos ícones do card (branco sobre a cor, ou a cor de texto do tema). */
  ink: string;
}

/**
 * Estilo da superfície dos cards da listagem (agendadores e objetos). O card ativo é preenchido
 * com a cor do item e tem uma sombra na borda de baixo; o desativado fica só com o contorno, como
 * os filtros não selecionados, e por isso não recebe fundo nem borda por estilo: o className
 * (`border border-border bg-card`) cuida dos dois. Selecionado, o card ganha uma borda grossa
 * na cor do seu texto.
 */
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
