import { cn } from './utils';

describe('cn', () => {
  it('joins plain class strings', () => {
    expect(cn('flex-1', 'items-center')).toBe('flex-1 items-center');
  });

  it('resolves conflicting Tailwind utilities by keeping the last one (tailwind-merge)', () => {
    expect(cn('bg-red-500', 'bg-blue-500')).toBe('bg-blue-500');
  });

  it('drops falsy values, so conditional classNames can be composed safely', () => {
    const isHidden = false;
    expect(cn('flex-1', isHidden && 'hidden', undefined, null, 'gap-2')).toBe('flex-1 gap-2');
  });

  it('lets an explicit override className win, matching how components merge props.className', () => {
    expect(cn('rounded-xl border-border', 'border-red-500')).toBe('rounded-xl border-red-500');
  });
});
