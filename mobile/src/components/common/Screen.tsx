import { SafeAreaView, Edge } from 'react-native-safe-area-context';

type ScreenProps = {
  children: React.ReactNode;
  edges?: Edge[];
  className?: string;
};

export function Screen({
  children,
  edges = ['left', 'right', 'bottom'],
  className = '',
}: ScreenProps) {
  return (
    <SafeAreaView edges={edges} className={`flex-1 bg-background ${className}`}>
      {children}
    </SafeAreaView>
  );
}
