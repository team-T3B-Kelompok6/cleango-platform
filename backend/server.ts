import { createApp } from './src/app.js';
import { getEnv } from './src/config/env.js';
import { purgeOldNotifications } from './src/model/notification.model.js';

const env = getEnv();

async function runNotificationRetention(): Promise<void> {
  try {
    const deleted = await purgeOldNotifications();
    if (deleted > 0) {
      console.log(`Retensi notifikasi: ${deleted} notifikasi lama dihapus.`);
    }
  } catch (error) {
    console.error('Retensi notifikasi gagal:', error);
  }
}

createApp().listen(env.PORT, () => {
  console.log(`CleanGo API berjalan di http://127.0.0.1:${env.PORT}`);
  void runNotificationRetention();
  setInterval(() => {
    void runNotificationRetention();
  }, 24 * 60 * 60 * 1000).unref();
});
