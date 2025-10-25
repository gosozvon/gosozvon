'use client';

import { formatChatMessageLinks, RoomContext, VideoConference } from '@livekit/components-react';
import {
  LogLevel,
  Room,
  RoomConnectOptions,
  RoomOptions,
  VideoPresets,
  type VideoCodec,
} from 'livekit-client';
import { DebugMode } from '@/lib/Debug';
import { useEffect, useMemo } from 'react';
import { KeyboardShortcuts } from '@/lib/KeyboardShortcuts';
import { SettingsMenu } from '@/lib/SettingsMenu';
import { useLowCPUOptimizer } from '@/lib/usePerfomanceOptimiser';
import { isMeetStaging } from '@/lib/client-utils';
import roomStyles from '@/styles/Rooms.module.css';

export function VideoConferenceClientImpl(props: {
  serverUrl: string;
  token: string;
  codec: VideoCodec | undefined;
}) {
  const roomOptions = useMemo((): RoomOptions => {
    return {
      publishDefaults: {
        videoSimulcastLayers: [VideoPresets.h540, VideoPresets.h216],
        red: true,
        videoCodec: props.codec,
      },
      adaptiveStream: { pixelDensity: 'screen' },
      dynacast: true,
      singlePeerConnection: isMeetStaging(),
    };
  }, [props.codec]);

  const room = useMemo(() => new Room(roomOptions), [roomOptions]);

  const connectOptions = useMemo((): RoomConnectOptions => {
    return {
      autoSubscribe: true,
    };
  }, []);

  useEffect(() => {
    room.connect(props.serverUrl, props.token, connectOptions).catch((error) => {
      console.error(error);
    });
    room.localParticipant.enableCameraAndMicrophone().catch((error) => {
      console.error(error);
    });
  }, [room, props.serverUrl, props.token, connectOptions]);

  useLowCPUOptimizer(room);

  return (
    <div className={`${roomStyles.roomShell} lk-room-container`}>
      <RoomContext.Provider value={room}>
        <KeyboardShortcuts />
        <VideoConference
          chatMessageFormatter={formatChatMessageLinks}
          SettingsComponent={
            process.env.NEXT_PUBLIC_SHOW_SETTINGS_MENU === 'true' ? SettingsMenu : undefined
          }
        />
        <DebugMode logLevel={LogLevel.debug} />
      </RoomContext.Provider>
    </div>
  );
}
