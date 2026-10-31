export interface FieldHelpOptions {
  title: string;
  description: string;
}

let listener: ((options: FieldHelpOptions | null) => void) | null = null;

export const fieldHelpService = {
  subscribe(fn: (options: FieldHelpOptions | null) => void) {
    listener = fn;
    return () => {
      if (listener === fn) listener = null;
    };
  },
  show(options: FieldHelpOptions) {
    listener?.(options);
  },
};

export function showFieldHelp(title: string, description: string) {
  fieldHelpService.show({ title, description });
}
