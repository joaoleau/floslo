// O expo-router transforma em rota (e coloca no bundle do app) todo arquivo dentro de src/app.
// Um teste ali dentro leva a biblioteca de testes para o APK e quebra o build de release, por isso
// os testes das telas ficam aqui, em src/__tests__/app.
declare const __dirname: string;
interface DirEntry {
  name: string;
  isDirectory(): boolean;
}
const fs: { readdirSync(dir: string, options: { withFileTypes: true }): DirEntry[] } = jest.requireActual('fs');
const path: { join(...parts: string[]): string } = jest.requireActual('path');

function testFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return testFiles(full);
    return /\.test\.tsx?$/.test(entry.name) ? [full] : [];
  });
}

describe('src/app', () => {
  it('has no test files, which the router would bundle into the app', () => {
    expect(testFiles(path.join(__dirname, '..', '..', 'app'))).toEqual([]);
  });
});
