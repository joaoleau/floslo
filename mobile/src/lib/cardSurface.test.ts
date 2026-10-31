import { cardSurface } from './cardSurface';

const base = { color: '#3B82F6', ink: '#FFFFFF', selected: false, dimmed: false };

describe('cardSurface', () => {
  it('fills an active card with the item color and a bottom shadow', () => {
    expect(cardSurface({ ...base, outlined: false })).toEqual({
      opacity: 1,
      backgroundColor: '#3B82F6',
      borderBottomWidth: 3,
      borderBottomColor: 'rgba(0,0,0,0.18)',
      borderWidth: 0,
    });
  });

  it('leaves the fill and the border of a disabled card to the outline classes', () => {
    expect(cardSurface({ ...base, outlined: true, ink: '#181C25' })).toEqual({ opacity: 1 });
  });

  it('marks a selected card with a thick border in its text color', () => {
    expect(cardSurface({ ...base, outlined: true, selected: true, ink: '#181C25' })).toEqual({
      opacity: 1,
      borderWidth: 3,
      borderColor: '#181C25',
    });
  });

  it('dims the cards that are not selected while selecting', () => {
    expect(cardSurface({ ...base, outlined: false, dimmed: true }).opacity).toBe(0.5);
  });
});
