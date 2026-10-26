import { screen, fireEvent } from '@testing-library/react-native';
import { renderWithProviders } from '@/test-utils/renderWithProviders';
import { SourceChunksSheet } from './SourceChunksSheet';
import { SourceChunk } from '@/types/domain/RAG';

const longText = 'A respiração celular acontece nas mitocôndrias e produz a energia da célula. '.repeat(10);

const chunks: SourceChunk[] = [
  { content: longText, score: 0.9, objectKey: 'biologia.pdf', page: 4, chunkIndex: 2, language: 'pt' },
  { content: 'Trecho curto de apoio.', score: 0.5, objectKey: 'biologia.pdf', page: 4, chunkIndex: 3, language: 'pt' },
];

describe('SourceChunksSheet', () => {
  it('names the main chunk and the support chunk with their page', async () => {
    await renderWithProviders(<SourceChunksSheet visible chunks={chunks} onClose={jest.fn()} />);

    expect(screen.getByText(/Trecho principal • Página 4 • Trecho #/)).toBeTruthy();
    expect(screen.getByText(/Trecho de apoio • Página 4 • Trecho #/)).toBeTruthy();
  });

  it('shows a long chunk collapsed and opens it in full when tapped', async () => {
    await renderWithProviders(<SourceChunksSheet visible chunks={chunks} onClose={jest.fn()} />);

    expect(screen.getByText(longText).props.numberOfLines).toBe(5);
    expect(screen.getByText('Toque para ver o trecho completo')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('source-chunk-0'));
    expect(screen.getByText(longText).props.numberOfLines).toBeUndefined();
    expect(screen.getByText('Toque para recolher')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('source-chunk-0'));
    expect(screen.getByText(longText).props.numberOfLines).toBe(5);
  });

  it('does not offer to open a short chunk', async () => {
    await renderWithProviders(<SourceChunksSheet visible chunks={[chunks[1]]} onClose={jest.fn()} />);

    expect(screen.queryByText('Toque para ver o trecho completo')).toBeNull();
  });
});
