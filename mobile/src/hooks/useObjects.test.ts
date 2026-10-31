jest.mock('@/services/objectService', () => ({ objectService: {} }));

import { isWaitingForUpload, resetPendingUploads, trackUpload } from './useObjects';
import { ObjectType } from '@/types/domain/Object';

function object(id: string, status: ObjectType['status'] = 'active'): ObjectType {
  return { id, name: id, extension: 'pdf', tags: ['t'], status };
}

describe('waiting for an upload to show up in the list', () => {
  afterEach(() => resetPendingUploads());

  it('keeps waiting while the list has only the documents it had at upload time', () => {
    trackUpload([object('a')], 0);
    expect(isWaitingForUpload([object('a')], 5_000)).toBe(true);
  });

  it('stops waiting once a new document appears, even before it finishes processing', () => {
    trackUpload([object('a')], 0);
    expect(isWaitingForUpload([object('a'), object('b', 'processing')], 15_000)).toBe(false);
  });

  it('gives up after two minutes', () => {
    trackUpload([object('a')], 0);
    expect(isWaitingForUpload([object('a')], 2 * 60 * 1000)).toBe(false);
  });

  it('waits for each upload separately', () => {
    trackUpload([object('a')], 0);
    trackUpload([object('a'), object('b')], 1_000);
    expect(isWaitingForUpload([object('a'), object('b')], 2_000)).toBe(true);
    expect(isWaitingForUpload([object('a'), object('b'), object('c')], 3_000)).toBe(false);
  });

  it('is not waiting when nothing was uploaded', () => {
    expect(isWaitingForUpload([object('a')], 0)).toBe(false);
  });
});
