'use client';

import React, { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { encodePassphrase, generateRoomId, randomString } from '@/lib/client-utils';
import styles from '../styles/Home.module.css';

export default function Page() {
  const router = useRouter();
  const [enableEncryption, setEnableEncryption] = useState(false);
  const [sharedPassphrase, setSharedPassphrase] = useState("");

  const handleCreateCall = useCallback(() => {
    const roomId = generateRoomId();
    if (enableEncryption) {
      router.push(`/rooms/${roomId}#${encodePassphrase(sharedPassphrase)}`);
    } else {
      router.push(`/rooms/${roomId}`);
    }
  }, [enableEncryption, router, sharedPassphrase]);

  return (
    <>
      <main className={styles.main} data-lk-theme="default">
        <section className={styles.tabContainer}>
          <div className={styles.tabContent}>
            <button className="lk-button" style={{ width: '100%' }} onClick={handleCreateCall}>
              Создать Созвон
            </button>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <label style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                <input
                  id="use-e2ee"
                  type="checkbox"
                  checked={enableEncryption}
                  onChange={(event) => setEnableEncryption(event.target.checked)}
                />
                Включить сквозное шифрование
              </label>
              {enableEncryption && (
                <label style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <span>Пароль для встречи</span>
                  <input
                    id="passphrase"
                    value={sharedPassphrase}
                    onChange={(event) => setSharedPassphrase(event.target.value)}
                  />
                </label>
              )}
            </div>
          </div>
        </section>
      </main>
      <footer data-lk-theme="default" style={{ textAlign: 'center' }}>
        Сделано чтобы работало. Код проекта доступен на{' '}
        <a href="https://github.com/gosozvon/gosozvon" rel="noopener">
          GitHub
        </a>
        .
      </footer>
    </>
  );
}
