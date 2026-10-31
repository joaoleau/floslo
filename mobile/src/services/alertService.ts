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

export function showAlert(title: string, message?: string, buttons?: AppAlertButton[]) {
  alertService.show({ title, message, buttons: buttons?.length ? buttons : [{ text: 'OK' }] });
}
