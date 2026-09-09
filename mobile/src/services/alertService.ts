// src/services/alertService.ts
//
// Substituto do Alert.alert nativo do RN (que renderiza um diálogo do sistema, sem
// nenhuma cara do app) -- mesmo padrão de singleton com subscribe usado em
// soundSelectionService.ts. O componente <AppAlert/> (montado uma vez em app/_layout.tsx)
// é o único inscrito e é quem de fato desenha o popup, usando os componentes do app
// (Card, cores da marca).

export interface AppAlertButton {
  text: string;
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: () => void;
}

export interface AppAlertOptions {
  title: string;
  message?: string;
  buttons?: AppAlertButton[];
}

let listener: ((options: AppAlertOptions | null) => void) | null = null;

export const alertService = {
  subscribe(fn: (options: AppAlertOptions | null) => void) {
    listener = fn;
    return () => {
      if (listener === fn) listener = null;
    };
  },
  show(options: AppAlertOptions) {
    listener?.(options);
  },
};

/** Equivalente a Alert.alert(title, message, buttons) -- troca direta nas chamadas existentes. */
export function showAlert(title: string, message?: string, buttons?: AppAlertButton[]) {
  alertService.show({ title, message, buttons: buttons?.length ? buttons : [{ text: 'OK' }] });
}
