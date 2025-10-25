import { NextRequest, NextResponse } from 'next/server';
import { setRoomSettings } from '@/lib/roomStore';

type RegisterRoomPayload = {
  roomName?: unknown;
  code?: unknown;
};

export async function POST(request: NextRequest) {
  try {
    const payload = (await request.json()) as RegisterRoomPayload;
    if (typeof payload.roomName !== 'string' || payload.roomName.trim().length === 0) {
      return NextResponse.json({ ok: false, error: 'Invalid roomName' }, { status: 400 });
    }

    let normalizedCode: string | undefined;
    if (typeof payload.code === 'string' && payload.code.trim().length > 0) {
      normalizedCode = payload.code.trim();
    }

    setRoomSettings(payload.roomName, { code: normalizedCode });
    return NextResponse.json({ ok: true, codeRequired: Boolean(normalizedCode) }, { status: 201 });
  } catch (error) {
    console.error('Failed to register room', error);
    return NextResponse.json({ ok: false, error: 'Failed to register room' }, { status: 500 });
  }
}
