import { createApp } from './src/app.js';
import { getEnv } from './src/config/env.js';

const env = getEnv();

createApp().listen(env.PORT, () => {
  console.log(`CleanGo API berjalan di http://127.0.0.1:${env.PORT}`);
});
