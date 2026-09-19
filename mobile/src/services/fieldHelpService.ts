// src/services/fieldHelpService.ts
//
// Pop-up leve pro "?" ao lado de um rótulo de campo/seção (ex.: "Objetos", "Tags") --
// separado do alertService/AppAlert de propósito: aquele é pensado pra confirmação
// curta ("Tem certeza?"), ícone e título grandes, centralizados. Aqui o conteúdo é um
// parágrafo explicando o campo, que pede um layout diferente (ver FieldHelpModal).

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
