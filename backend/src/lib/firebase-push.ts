import { GoogleAuth } from 'google-auth-library';
import { listPushDevices, unregisterPushDevice } from '../model/customer-push-device.model.js';

const FCM_SCOPE = 'https://www.googleapis.com/auth/firebase.messaging';
const REQUEST_TIMEOUT_MS = 10000;
const GCP_PROJECT_ID_REGEX = /^[a-z][a-z0-9-]{4,28}[a-z0-9]$/;
const FCM_ERROR_TYPE = 'type.googleapis.com/google.firebase.fcm.v1.FcmError';

let authClient: GoogleAuth | null = null;

function fcmSendUrl(projectId: string): string {
  return `https://fcm.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/messages:send`;
}

function isValidProjectId(projectId: string): boolean {
  return GCP_PROJECT_ID_REGEX.test(projectId);
}

function getAuthClient(): GoogleAuth | null {
  if (!process.env.CLEANGO_FCM_PROJECT_ID || !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    return null;
  }
  if (!authClient) {
    authClient = new GoogleAuth({
      scopes: [FCM_SCOPE],
    });
  }
  return authClient;
}

function isUnregisteredError(body: unknown): boolean {
  const error = (body as { error?: { details?: Array<{ '@type'?: string; errorCode?: string }> } } | null)?.error;
  if (!error?.details) return false;
  return error.details.some(
    (detail) => detail['@type'] === FCM_ERROR_TYPE && detail.errorCode === 'UNREGISTERED'
  );
}

async function sendPush(
  token: string,
  projectId: string,
  accessToken: string,
): Promise<'sent' | 'unregistered' | 'failed'> {
  const body = JSON.stringify({
    message: {
      token,
      notification: {
        title: 'CleanGo',
        body: 'Pesanan berhasil dibuat.',
      },
      data: {
        type: 'order',
      },
    },
  });
  try {
    const response = await fetch(fcmSendUrl(projectId), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json; charset=utf-8',
      },
      body,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (response.ok) return 'sent';
    let parsed: unknown = null;
    try {
      parsed = await response.json();
    } catch {
      parsed = null;
    }
    if (isUnregisteredError(parsed)) return 'unregistered';
    return 'failed';
  } catch {
    return 'failed';
  }
}

export async function notifyBookingCreated(userId: number): Promise<void> {
  try {
    const projectId = process.env.CLEANGO_FCM_PROJECT_ID;
    if (!projectId || !process.env.GOOGLE_APPLICATION_CREDENTIALS) return;
    if (!isValidProjectId(projectId)) return;
    const tokens = await listPushDevices(userId);
    if (!tokens.length) return;
    const auth = getAuthClient();
    if (!auth) return;
    const accessToken = await auth.getAccessToken();
    if (!accessToken) return;
    for (const token of tokens) {
      const result = await sendPush(token, projectId, accessToken);
      if (result === 'unregistered') {
        await unregisterPushDevice(userId, token).catch(() => {});
      }
    }
  } catch {
    // FCM gagal tidak boleh mengganggu alur aplikasi utama.
  }
}
