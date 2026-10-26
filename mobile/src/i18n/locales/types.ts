// Mesma forma do dicionário em português, com qualquer texto no lugar de cada valor: garante
// que o dicionário em inglês tenha todas as chaves do português, e nenhuma a mais.
export type Translation<T> = {
  [K in keyof T]: T[K] extends string ? string : Translation<T[K]>;
};
