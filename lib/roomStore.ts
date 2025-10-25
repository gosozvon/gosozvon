type RoomSettings = {
  code?: string;
  createdAt: number;
};

const ROOM_LIFETIME_MS = 1000 * 60 * 120; // 2 hours

const roomSettingsStore = new Map<string, RoomSettings>();

function cleanupExpiredRooms(now: number) {
  for (const [roomName, settings] of roomSettingsStore.entries()) {
    if (now - settings.createdAt > ROOM_LIFETIME_MS) {
      roomSettingsStore.delete(roomName);
    }
  }
}

export function setRoomSettings(roomName: string, settings: { code?: string }) {
  const normalizedRoomName = roomName.trim();
  if (!normalizedRoomName) {
    throw new Error('roomName must be a non-empty string');
  }
  const now = Date.now();
  cleanupExpiredRooms(now);
  const normalizedCode =
    typeof settings.code === 'string' && settings.code.trim().length > 0
      ? settings.code.trim()
      : undefined;

  roomSettingsStore.set(normalizedRoomName, {
    code: normalizedCode,
    createdAt: now,
  });
}

export function getRoomSettings(roomName: string) {
  const normalizedRoomName = roomName.trim();
  if (!normalizedRoomName) {
    return undefined;
  }
  const now = Date.now();
  cleanupExpiredRooms(now);
  return roomSettingsStore.get(normalizedRoomName);
}

export function __testing__resetRoomStore() {
  roomSettingsStore.clear();
}
