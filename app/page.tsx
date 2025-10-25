'use client';

import React, { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { generateRoomId } from '@/lib/client-utils';
import styles from '../styles/Home.module.css';

export default function Page() {
  const router = useRouter();
  const [roomCode, setRoomCode] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateCall = useCallback(async () => {
    if (isCreating) {
      return;
    }
    const roomId = generateRoomId();
    const trimmedCode = roomCode.trim();
    try {
      setIsCreating(true);
      const response = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomName: roomId,
          code: trimmedCode.length > 0 ? trimmedCode : undefined,
        }),
      });
      if (!response.ok) {
        console.error('Failed to register room', response.statusText);
        alert('Не удалось создать комнату. Попробуйте ещё раз.');
        return;
      }
      const search = trimmedCode.length > 0 ? `?code=${encodeURIComponent(trimmedCode)}` : '';
      router.push(`/rooms/${roomId}${search}`);
    } catch (error) {
      console.error('Failed to create room', error);
      alert('Не удалось создать комнату. Попробуйте ещё раз.');
    } finally {
      setIsCreating(false);
    }
  }, [router, roomCode, isCreating]);

  return (
    <>
      <main className={styles.main} data-lk-theme="default">
        <section className={styles.tabContainer}>
          <div className={styles.tabContent}>
            <h1 className={styles.title}>Просто, го созвон</h1>
            <p className={styles.subtitle}>
              Запускайте встречу в одно касание и делитесь кодом только с теми, кто должен быть в
              разговоре.
            </p>
            <div className={styles.fieldStack}>
              <label className={styles.fieldGroup}>
                <span className={styles.fieldLabel}>Код для входа (если нужен)</span>
                <input
                  id="room-code"
                  value={roomCode}
                  onChange={(event) => setRoomCode(event.target.value)}
                  placeholder="Например, ABC333"
                  autoComplete="off"
                />
              </label>
              <span className={styles.helperText}>
                Уберите код, если встреча открытая — ссылка всё равно будет уникальной.
              </span>
            </div>
            <button
              className="lk-button"
              style={{ width: '100%' }}
              onClick={handleCreateCall}
              disabled={isCreating}
            >
              Гоу
            </button>
          </div>
        </section>
      </main>
    </>
  );
}
