import { createApp } from './app.js';
import { getEnv } from './config/env.js';

const env = getEnv();
createApp().listen(env.PORT, () => {
  console.log(`CleanGo API listening on http://127.0.0.1:${env.PORT}`);
});
