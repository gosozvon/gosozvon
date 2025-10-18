import { videoCodecs } from 'livekit-client';
import { VideoConferenceClientImpl } from './VideoConferenceClientImpl';
import { isVideoCodec } from '@/lib/types';

export default async function CustomRoomConnection(props: {
  searchParams: Promise<{
    serverUrl?: string;
    token?: string;
    codec?: string;
  }>;
}) {
  const { serverUrl, token, codec } = await props.searchParams;
  if (typeof serverUrl !== 'string') {
    return <h2>Не указан адрес сервера</h2>;
  }
  if (typeof token !== 'string') {
    return <h2>Не указан токен доступа</h2>;
  }
  if (codec !== undefined && !isVideoCodec(codec)) {
    return <h2>Неверный кодек. Допустимые варианты: [{videoCodecs.join(', ')}].</h2>;
  }

  return (
    <main data-lk-theme="default" style={{ height: '100%' }}>
      <VideoConferenceClientImpl serverUrl={serverUrl} token={token} codec={codec} />
    </main>
  );
}
