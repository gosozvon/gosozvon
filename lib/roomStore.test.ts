import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getRoomSettings, setRoomSettings, __testing__resetRoomStore } from './roomStore';

describe('roomStore', () => {
  beforeEach(() => {
    __testing__resetRoomStore();
    vi.useRealTimers();
  });

  it('stores trimmed codes and room names', () => {
    setRoomSettings('  test-room  ', { code: '  ABC123  ' });
    expect(getRoomSettings('test-room')).toEqual({ code: 'ABC123', createdAt: expect.any(Number) });
  });

  it('stores room without code when blank', () => {
    setRoomSettings('room-two', { code: '   ' });
    expect(getRoomSettings('room-two')).toEqual({
      code: undefined,
      createdAt: expect.any(Number),
    });
  });

  it('expires room settings after the lifetime', () => {
    const lifetimeMs = 2 * 60 * 60 * 1000;
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-01T00:00:00Z'));
    setRoomSettings('session-x', { code: 'KEEP' });

    vi.setSystemTime(new Date(Date.now() + lifetimeMs + 1));
    // Trigger cleanup by setting another room at the later time.
    setRoomSettings('session-y', { code: 'NEW' });

    expect(getRoomSettings('session-x')).toBeUndefined();
    expect(getRoomSettings('session-y')?.code).toBe('NEW');
  });
});
