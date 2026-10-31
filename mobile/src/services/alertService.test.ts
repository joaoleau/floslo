import { alertService, showAlert } from './alertService';

describe('alertService', () => {
  afterEach(() => {
    // Leaving a stale subscriber registered would leak into the next test file's module
    // instance is not a concern (Jest isolates modules per file), but within this file it
    // would leak between tests -- so always start each test with a clean slate.
    alertService.subscribe(() => {});
  });

  it('notifies the subscribed listener with the exact options passed to show', () => {
    const listener = jest.fn();
    alertService.subscribe(listener);

    alertService.show({ title: 'Título', message: 'Mensagem' });

    expect(listener).toHaveBeenCalledWith({ title: 'Título', message: 'Mensagem' });
  });

  it('stops notifying a listener after it unsubscribes', () => {
    const listener = jest.fn();
    const unsubscribe = alertService.subscribe(listener);
    unsubscribe();

    alertService.show({ title: 'Título' });

    expect(listener).not.toHaveBeenCalled();
  });

  it('only the most recently subscribed listener is notified (single-slot, matches AppAlert being mounted once)', () => {
    const first = jest.fn();
    const second = jest.fn();
    alertService.subscribe(first);
    alertService.subscribe(second);

    alertService.show({ title: 'Título' });

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });
});

describe('showAlert', () => {
  it('defaults to a single OK button when none are given', () => {
    const listener = jest.fn();
    alertService.subscribe(listener);

    showAlert('Título', 'Mensagem');

    expect(listener).toHaveBeenCalledWith({ title: 'Título', message: 'Mensagem', buttons: [{ text: 'OK' }] });
  });

  it('passes custom buttons through untouched', () => {
    const listener = jest.fn();
    alertService.subscribe(listener);
    const buttons = [{ text: 'Cancelar', style: 'cancel' as const }, { text: 'Excluir', style: 'destructive' as const }];

    showAlert('Excluir?', 'Tem certeza?', buttons);

    expect(listener).toHaveBeenCalledWith({ title: 'Excluir?', message: 'Tem certeza?', buttons });
  });
});
