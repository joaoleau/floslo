import { TextClassContext } from '@/components/ui/text';
import { cn } from '@/lib/utils';
import { View } from 'react-native';
import { useTheme } from '@/lib/ThemeProvider';

function Card({
  className,
  style,
  ...props
}: React.ComponentProps<typeof View> & React.RefAttributes<View>) {
  const { mode } = useTheme();
  // Mesmo efeito "luz vindo de cima" dos cards coloridos de Agendadores/Objetos (ver
  // SchedulerCard/ObjectCard) -- borda inferior destacada, dando uma sensação de espessura/
  // profundidade mais forte que só a sombra nativa (shadow-sm, que em vários Android nem
  // chega a renderizar). No modo dark o "chão" já é escuro, então uma borda mais escura
  // some -- ali o efeito inverte pra uma borda mais clara (um filete de luz), que é como
  // apps escuros costumam sugerir elevação.
  const edgeColor = mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.15)';

  return (
    <TextClassContext.Provider value="text-card-foreground">
      <View
        className={cn(
          'bg-card border-border flex flex-col rounded-xl border shadow-sm shadow-black/5',
          className,
        )}
        style={[{ borderBottomWidth: 2, borderBottomColor: edgeColor }, style]}
        {...props}
      />
    </TextClassContext.Provider>
  );
}

export { Card };
