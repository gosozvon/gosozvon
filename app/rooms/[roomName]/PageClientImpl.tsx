'use client';

import React from 'react';
import { isMeetStaging } from '@/lib/client-utils';
import { DebugMode } from '@/lib/Debug';
import { KeyboardShortcuts } from '@/lib/KeyboardShortcuts';
import { RecordingIndicator } from '@/lib/RecordingIndicator';
import { SettingsMenu } from '@/lib/SettingsMenu';
import { ConnectionDetails } from '@/lib/types';
import roomStyles from '@/styles/Rooms.module.css';
import {
  formatChatMessageLinks,
  LocalUserChoices,
  PreJoin,
  RoomContext,
  VideoConference,
} from '@livekit/components-react';
import {
  RoomOptions,
  VideoCodec,
  VideoPresets,
  Room,
  RoomConnectOptions,
  RoomEvent,
  TrackPublishDefaults,
  VideoCaptureOptions,
} from 'livekit-client';
import { useRouter, useSearchParams } from 'next/navigation';
import { useLowCPUOptimizer } from '@/lib/usePerfomanceOptimiser';

const CONN_DETAILS_ENDPOINT =
  process.env.NEXT_PUBLIC_CONN_DETAILS_ENDPOINT ?? '/api/connection-details';
const SHOW_SETTINGS_MENU = process.env.NEXT_PUBLIC_SHOW_SETTINGS_MENU == 'true';

export function PageClientImpl(props: {
  roomName: string;
  region?: string;
  hq: boolean;
  codec: VideoCodec;
}) {
  const searchParams = useSearchParams();
  const codeFromUrl = searchParams?.get('code') ?? '';
  const [preJoinChoices, setPreJoinChoices] = React.useState<LocalUserChoices | undefined>(
    undefined,
  );
  const [hasVideoInput, setHasVideoInput] = React.useState<boolean | null>(null);
  const preJoinDefaults = React.useMemo(() => {
    const initialVideoEnabled = hasVideoInput !== false;
    return {
      username: '',
      videoEnabled: initialVideoEnabled,
      audioEnabled: true,
    };
  }, [hasVideoInput]);
  React.useEffect(() => {
    let mounted = true;
    const refreshDevices = async () => {
      try {
        const devices = await Room.getLocalDevices('videoinput');
        if (!mounted) {
          return;
        }
        setHasVideoInput(devices.length > 0);
      } catch (error) {
        if (mounted) {
          setHasVideoInput(false);
        }
      }
    };

    refreshDevices();

    const mediaDevices = typeof navigator !== 'undefined' ? navigator.mediaDevices : undefined;
    if (mediaDevices?.addEventListener) {
      const handler = () => refreshDevices();
      mediaDevices.addEventListener('devicechange', handler);
      return () => {
        mounted = false;
        mediaDevices.removeEventListener('devicechange', handler);
      };
    }

    if (mediaDevices) {
      const previousHandler = mediaDevices.ondevicechange;
      const handler = () => refreshDevices();
      mediaDevices.ondevicechange = handler;
      return () => {
        mounted = false;
        if (mediaDevices.ondevicechange === handler) {
          mediaDevices.ondevicechange = previousHandler ?? null;
        } else {
          mediaDevices.ondevicechange = previousHandler ?? null;
        }
      };
    }

    return () => {
      mounted = false;
    };
  }, []);
  const [connectionDetails, setConnectionDetails] = React.useState<ConnectionDetails | undefined>(
    undefined,
  );
  const [roomCodeInput, setRoomCodeInput] = React.useState<string>(codeFromUrl);
  const [codeError, setCodeError] = React.useState<string | undefined>(undefined);
  const [nameError, setNameError] = React.useState<string | undefined>(undefined);
  const initialCodePresent = codeFromUrl.trim().length > 0;
  const [roomCodeRequired, setRoomCodeRequired] = React.useState<boolean>(initialCodePresent);
  const [isRequestingDetails, setIsRequestingDetails] = React.useState(false);
  const [displayedUsername, setDisplayedUsername] = React.useState<string>('');
  const [isCodeFieldVisible, setIsCodeFieldVisible] = React.useState<boolean>(initialCodePresent);

  const preJoinContainerRef = React.useRef<HTMLDivElement | null>(null);
  const [isDeviceNoticeDismissed, setIsDeviceNoticeDismissed] = React.useState(false);
  const preJoinFormClassName =
    hasVideoInput === false
      ? `${roomStyles.preJoinForm} ${roomStyles.cameraDisabled}`
      : roomStyles.preJoinForm;

  React.useEffect(() => {
    setRoomCodeInput(codeFromUrl);
    if (codeFromUrl.trim().length > 0) {
      setRoomCodeRequired(true);
      setIsCodeFieldVisible(true);
    }
  }, [codeFromUrl]);

  React.useEffect(() => {
    const input = preJoinContainerRef.current?.querySelector<HTMLInputElement>(
      'form.lk-username-container input#username',
    );
    if (input && input.value !== displayedUsername) {
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value',
      )?.set;
      nativeInputValueSetter?.call(input, displayedUsername);
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }, [displayedUsername]);

  React.useEffect(() => {
    if (hasVideoInput === false) {
      setIsDeviceNoticeDismissed(false);
    }
  }, [hasVideoInput]);

  React.useEffect(() => {
    const input = preJoinContainerRef.current?.querySelector<HTMLInputElement>(
      'form.lk-username-container input#username',
    );
    if (input && input.value !== displayedUsername) {
      input.value = displayedUsername;
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }, [displayedUsername]);

  const handlePreJoinSubmit = React.useCallback(async (values: LocalUserChoices) => {
    if (isRequestingDetails) {
      return;
    }
    const normalizedUsername = displayedUsername.trim();
    if (normalizedUsername.length === 0) {
      setNameError('Введите имя, чтобы продолжить');
      return;
    }
    const normalizedCode = roomCodeInput.trim();
    if (roomCodeRequired && normalizedCode.length === 0) {
      setCodeError('Введите код встречи');
      return;
    }
    const normalizedChoices: LocalUserChoices = {
      ...values,
      username: normalizedUsername,
      videoEnabled: hasVideoInput !== false && values.videoEnabled,
    };
    if (hasVideoInput === false) {
      normalizedChoices.videoDeviceId = '';
    }
    setNameError(undefined);
    setCodeError(undefined);
    const url = new URL(CONN_DETAILS_ENDPOINT, window.location.origin);
    url.searchParams.append('roomName', props.roomName);
    url.searchParams.append('participantName', normalizedChoices.username);
    if (props.region) {
      url.searchParams.append('region', props.region);
    }
    if (normalizedCode.length > 0) {
      url.searchParams.append('code', normalizedCode);
    }

    try {
      setIsRequestingDetails(true);
      const response = await fetch(url.toString());
      if (!response.ok) {
        if (response.status === 403) {
          const message = normalizedCode.length === 0 ? 'Для входа нужен код' : 'Неверный код';
          setCodeError(message);
          setRoomCodeRequired(true);
          setIsCodeFieldVisible(true);
          return;
        }
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to get connection details');
      }
      const connectionDetailsData = await response.json();
      setPreJoinChoices(normalizedChoices);
      setConnectionDetails(connectionDetailsData);
      setRoomCodeInput(normalizedCode);
      setRoomCodeRequired(normalizedCode.length > 0);
      if (normalizedCode.length > 0) {
        setIsCodeFieldVisible(true);
      }
      setNameError(undefined);
      setCodeError(undefined);
    } catch (error) {
      console.error('Failed to get connection details', error);
      alert('Не удалось подключиться к комнате. Попробуйте ещё раз.');
    } finally {
      setIsRequestingDetails(false);
    }
  }, [
    displayedUsername,
    isRequestingDetails,
    roomCodeInput,
    roomCodeRequired,
    props.roomName,
    props.region,
    hasVideoInput,
  ]);
  const handlePreJoinError = React.useCallback((e: any) => console.error(e), []);

  return (
    <main data-lk-theme="default" className={roomStyles.mainShell}>
      {connectionDetails === undefined || preJoinChoices === undefined ? (
        <div className={roomStyles.preJoinCard}>
          <div className={roomStyles.accessColumn}>
            <h2>Настройки</h2>
            <label>
              <span>Ваше имя</span>
              <input
                value={displayedUsername}
                onChange={(event) => {
                  if (nameError) {
                    setNameError(undefined);
                  }
                  setDisplayedUsername(event.target.value);
                }}
                placeholder="Например, Анна Сергеевна"
                autoComplete="off"
              />
            </label>
            {nameError && <span className={roomStyles.error}>{nameError}</span>}
            {isCodeFieldVisible ? (
              <>
                <label>
                  <span>Код для входа</span>
                  <input
                    value={roomCodeInput}
                    onChange={(event) => {
                      setRoomCodeInput(event.target.value);
                      if (codeError) {
                        setCodeError(undefined);
                      }
                    }}
                    placeholder="Введите код, если он установлен"
                    autoComplete="off"
                  />
                </label>
                {codeError && <span className={roomStyles.error}>{codeError}</span>}
                <span className={roomStyles.helper}>
                  Если код не нужен, оставьте поле пустым — доступ по ссылке останется уникальным.
                </span>
              </>
            ) : (
              <button
                type="button"
                className={roomStyles.codeToggle}
                onClick={() => setIsCodeFieldVisible(true)}
              >
                У меня есть код
              </button>
            )}
            {hasVideoInput === false && !isDeviceNoticeDismissed && (
              <div className={roomStyles.deviceNotice}>
                <span>Камеру не нашли — включение видео будет недоступно.</span>
                <button
                  type="button"
                  onClick={() => setIsDeviceNoticeDismissed(true)}
                  aria-label="Скрыть уведомление о камере"
                >
                  Скрыть
                </button>
              </div>
            )}
            <button
              type="button"
              className={roomStyles.joinButton}
              onClick={() => {
                const joinBtn = preJoinContainerRef.current?.querySelector<HTMLButtonElement>(
                  'form.lk-username-container button[type="submit"]',
                );
                if (joinBtn) {
                  joinBtn.click();
                }
              }}
              disabled={
                isRequestingDetails ||
                displayedUsername.trim().length === 0 ||
                (isCodeFieldVisible && roomCodeRequired && roomCodeInput.trim().length === 0)
              }
            >
              Подключиться
            </button>
          </div>
          <div className={preJoinFormClassName} ref={preJoinContainerRef}>
            <PreJoin
              defaults={preJoinDefaults}
              onSubmit={handlePreJoinSubmit}
              onError={handlePreJoinError}
              joinLabel="Го созвон"
              persistUserChoices={false}
              onValidate={() => true}
            />
          </div>
        </div>
      ) : (
        <VideoConferenceComponent
          connectionDetails={connectionDetails}
          userChoices={preJoinChoices}
          options={{ codec: props.codec, hq: props.hq }}
          cameraAvailable={hasVideoInput !== false}
        />
      )}
    </main>
  );
}

function VideoConferenceComponent(props: {
  userChoices: LocalUserChoices;
  connectionDetails: ConnectionDetails;
  options: {
    hq: boolean;
    codec: VideoCodec;
  };
  cameraAvailable: boolean;
}) {
  const NO_CAMERA_MESSAGE = 'Камеру не нашли — включение видео отключено.';
  const router = useRouter();
  const [hasCamera, setHasCamera] = React.useState<boolean>(props.cameraAvailable);
  const [deviceMessage, setDeviceMessage] = React.useState<string | null>(
    props.cameraAvailable ? null : NO_CAMERA_MESSAGE,
  );
  const [isDeviceBannerDismissed, setIsDeviceBannerDismissed] = React.useState(false);

  const refreshCameraAvailability = React.useCallback(async () => {
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

  React.useEffect(() => {
    if (props.cameraAvailable) {
      setHasCamera(true);
      setDeviceMessage(null);
    } else {
      setHasCamera(false);
      setDeviceMessage(NO_CAMERA_MESSAGE);
    }
  }, [props.cameraAvailable, NO_CAMERA_MESSAGE]);

  React.useEffect(() => {
    if (deviceMessage) {
      setIsDeviceBannerDismissed(false);
    }
  }, [deviceMessage]);

  React.useEffect(() => {
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

  const roomOptions = React.useMemo((): RoomOptions => {
    const videoCodec: VideoCodec | undefined = props.options.codec ? props.options.codec : 'vp9';
    const videoCaptureDefaults: VideoCaptureOptions = {
      deviceId: hasCamera ? props.userChoices.videoDeviceId ?? undefined : undefined,
      resolution: props.options.hq ? VideoPresets.h2160 : VideoPresets.h720,
    };
    const publishDefaults: TrackPublishDefaults = {
      dtx: false,
      videoSimulcastLayers: props.options.hq
        ? [VideoPresets.h1080, VideoPresets.h720]
        : [VideoPresets.h540, VideoPresets.h216],
      red: true,
      videoCodec,
    };
    return {
      videoCaptureDefaults,
      publishDefaults,
      audioCaptureDefaults: {
        deviceId: props.userChoices.audioDeviceId ?? undefined,
      },
      adaptiveStream: true,
      dynacast: true,
      singlePeerConnection: isMeetStaging(),
    };
  }, [
    props.userChoices,
    props.options.hq,
    props.options.codec,
    hasCamera,
  ]);

  const room = React.useMemo(() => new Room(roomOptions), []);

  const connectOptions = React.useMemo((): RoomConnectOptions => {
    return {
      autoSubscribe: true,
    };
  }, []);

  const handleOnLeave = React.useCallback(() => router.push('/'), [router]);
  const handleError = React.useCallback((error: Error) => {
    console.error(error);
    alert(`Произошла ошибка. Подробности смотрите в консоли: ${error.message}`);
  }, []);
  const handleMediaDevicesError = React.useCallback(
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

  React.useEffect(() => {
    room.on(RoomEvent.Disconnected, handleOnLeave);
    room.on(RoomEvent.MediaDevicesError, handleMediaDevicesError);

    room
      .connect(
        props.connectionDetails.serverUrl,
        props.connectionDetails.participantToken,
        connectOptions,
      )
      .catch((error) => {
        handleError(error);
      });

    if (props.userChoices.videoEnabled && hasCamera) {
      room.localParticipant.setCameraEnabled(true).catch((error) => {
        handleMediaDevicesError(error, 'videoinput');
      });
    } else {
      room.localParticipant.setCameraEnabled(false).catch(() => undefined);
    }
    if (props.userChoices.audioEnabled) {
      room.localParticipant.setMicrophoneEnabled(true).catch((error) => {
        handleError(error);
      });
    }

    return () => {
      room.off(RoomEvent.Disconnected, handleOnLeave);
      room.off(RoomEvent.MediaDevicesError, handleMediaDevicesError);
    };
  }, [
    room,
    props.connectionDetails,
    props.userChoices,
    connectOptions,
    handleOnLeave,
    handleMediaDevicesError,
    handleError,
    hasCamera,
  ]);

  const lowPowerMode = useLowCPUOptimizer(room);

  React.useEffect(() => {
    if (lowPowerMode) {
      console.warn('Low power mode enabled');
    }
  }, [lowPowerMode]);

  const roomShellClassName = `${roomStyles.roomShell} lk-room-container ${
    hasCamera ? '' : roomStyles.cameraDisabled
  }`;

  return (
    <div className={roomShellClassName}>
      {deviceMessage && !isDeviceBannerDismissed && (
        <div className={roomStyles.deviceBanner} role="status" aria-live="polite">
          <span>{deviceMessage}</span>
          <button
            type="button"
            onClick={() => setIsDeviceBannerDismissed(true)}
            aria-label="Скрыть уведомление о камере"
          >
            Скрыть
          </button>
        </div>
      )}
      <RoomContext.Provider value={room}>
        <KeyboardShortcuts />
        <VideoConference
          chatMessageFormatter={formatChatMessageLinks}
          SettingsComponent={SHOW_SETTINGS_MENU ? SettingsMenu : undefined}
        />
        <DebugMode />
        <RecordingIndicator />
      </RoomContext.Provider>
    </div>
  );
}
