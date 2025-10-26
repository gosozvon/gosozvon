'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { formatChatMessageLinks, RoomContext, VideoConference } from '@livekit/components-react';
import {
  ConnectionState,
  LogLevel,
  Room,
  RoomConnectOptions,
  RoomOptions,
  RoomEvent,
  VideoPresets,
  type VideoCodec,
} from 'livekit-client';
import { DebugMode } from '@/lib/Debug';
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
  const NO_CAMERA_MESSAGE = 'Камеру не нашли — включение видео отключено.';
  const [hasCamera, setHasCamera] = useState(true);
  const [deviceMessage, setDeviceMessage] = useState<string | null>(null);

  const refreshCameraAvailability = useCallback(async () => {
    try {
      const devices = await Room.getLocalDevices('videoinput');
      const available = devices.length > 0;
      setHasCamera(available);
      setDeviceMessage((prev) => {
        if (available) {
          return prev === NO_CAMERA_MESSAGE ? null : prev;
        }
        return NO_CAMERA_MESSAGE;
      });
    } catch (error) {
      console.error('Failed to enumerate video devices', error);
      setHasCamera(false);
      setDeviceMessage(NO_CAMERA_MESSAGE);
    }
  }, [NO_CAMERA_MESSAGE]);

  useEffect(() => {
    let mounted = true;
    refreshCameraAvailability();

    const mediaDevices = typeof navigator !== 'undefined' ? navigator.mediaDevices : undefined;
    if (!mediaDevices) {
      return () => {
        mounted = false;
      };
    }

    const handler = () => {
      if (mounted) {
        refreshCameraAvailability();
      }
    };

    if (mediaDevices.addEventListener) {
      mediaDevices.addEventListener('devicechange', handler);
      return () => {
        mounted = false;
        mediaDevices.removeEventListener('devicechange', handler);
      };
    }

    const previousHandler = mediaDevices.ondevicechange;
    mediaDevices.ondevicechange = handler;
    return () => {
      mounted = false;
      mediaDevices.ondevicechange = previousHandler ?? null;
    };
  }, [refreshCameraAvailability]);

  const roomOptions = useMemo((): RoomOptions => {
    let videoCodec = props.codec ?? 'vp9';
    return {
      publishDefaults: {
        videoSimulcastLayers: [VideoPresets.h540, VideoPresets.h216],
        red: true,
        videoCodec,
      },
      adaptiveStream: { pixelDensity: 'screen' },
      dynacast: true,
      singlePeerConnection: isMeetStaging(),
    };
  }, [props.codec]);

  const room = useMemo(() => new Room(roomOptions), []);

  const connectOptions = useMemo(
    (): RoomConnectOptions => ({
      autoSubscribe: true,
    }),
    [],
  );

  const handleError = useCallback((error: Error) => {
    console.error(error);
    alert(`Произошла ошибка. Подробности смотрите в консоли: ${error.message}`);
  }, []);

  const handleMediaDevicesError = useCallback(
    (error: Error, kind?: MediaDeviceKind) => {
      console.error(error);
      if (kind === 'videoinput' || error.name === 'NotFoundError') {
        setDeviceMessage(NO_CAMERA_MESSAGE);
        setHasCamera(false);
      } else {
        setDeviceMessage(`Проблема с устройством: ${error.message}`);
      }
      refreshCameraAvailability();
    },
    [NO_CAMERA_MESSAGE, refreshCameraAvailability],
  );

  useEffect(() => {
    room.on(RoomEvent.MediaDevicesError, handleMediaDevicesError);

    if (room.state === ConnectionState.Disconnected) {
      room.connect(props.serverUrl, props.token, connectOptions).catch(handleError);
    }

    if (hasCamera) {
      room.localParticipant.setCameraEnabled(true).catch((error) => {
        handleMediaDevicesError(error, 'videoinput');
      });
    } else {
      room.localParticipant.setCameraEnabled(false).catch(() => undefined);
    }
    room.localParticipant.setMicrophoneEnabled(true).catch(handleError);

    return () => {
      room.off(RoomEvent.MediaDevicesError, handleMediaDevicesError);
    };
  }, [
    room,
    props.serverUrl,
    props.token,
    connectOptions,
    handleMediaDevicesError,
    handleError,
    hasCamera,
  ]);

  useLowCPUOptimizer(room);

  const roomShellClassName = `${roomStyles.roomShell} lk-room-container ${
    hasCamera ? '' : roomStyles.cameraDisabled
  }`;

  return (
    <div className={roomShellClassName}>
      {deviceMessage && (
        <div className={roomStyles.deviceBanner} role="status" aria-live="polite">
          {deviceMessage}
        </div>
      )}
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
