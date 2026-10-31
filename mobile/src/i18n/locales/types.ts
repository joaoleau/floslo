export type Translation<T> = {
  [K in keyof T]: T[K] extends string ? string : Translation<T[K]>;
};
