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
