export interface BrowserPushSubscription {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

export interface PushConfig {
  vapidPublicKey: string | null;
  pushReady: boolean;
  topics: string[];
  sampleMode: boolean;
}

export type PushSupportState =
  | 'supported'
  | 'needs_secure_context'
  | 'no_service_worker'
  | 'no_push_manager'
  | 'no_notification_api';

export function getPushSupport(): { state: PushSupportState; canSubscribe: boolean; reason: string } {
  if (typeof window === 'undefined') {
    return { state: 'no_service_worker', canSubscribe: false, reason: 'Browser APIs are unavailable.' };
  }

  const secureContext = window.isSecureContext || window.location.hostname === 'localhost';
  if (!secureContext) {
    return {
      state: 'needs_secure_context',
      canSubscribe: false,
      reason: 'Push delivery needs a secure (https) connection. The in-app alert inbox still works here.',
    };
  }
  if (!('serviceWorker' in navigator)) {
    return {
      state: 'no_service_worker',
      canSubscribe: false,
      reason: 'This browser has no service worker support. Alerts will appear in your in-app inbox.',
    };
  }
  if (!('PushManager' in window)) {
    return {
      state: 'no_push_manager',
      canSubscribe: false,
      reason: 'This browser cannot receive background push. Alerts will appear in your in-app inbox.',
    };
  }
  if (!('Notification' in window)) {
    return {
      state: 'no_notification_api',
      canSubscribe: false,
      reason: 'This browser has no notification API. Alerts will appear in your in-app inbox.',
    };
  }
  return { state: 'supported', canSubscribe: true, reason: 'This device can receive background civic alerts.' };
}

export function notificationPermission(): NotificationPermission | 'unsupported' {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
  return Notification.permission;
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) {
    output[i] = raw.charCodeAt(i);
  }
  return output;
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return null;
  try {
    // Relative to the deployment root: works at a custom domain, a subpath, or a
    // Netlify preview URL without extra configuration.
    const workerUrl = new URL('sw.js', document.baseURI).pathname;
    const response = await fetch(workerUrl, { method: 'HEAD' });
    if (!response.ok) return null;
    return await navigator.serviceWorker.register(workerUrl, { scope: '/' });
  } catch {
    return null;
  }
}

export async function getBrowserSubscription(): Promise<PushSubscription | null> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return null;
  try {
    const registration = await navigator.serviceWorker.getRegistration('/');
    if (!registration) return null;
    return await registration.pushManager.getSubscription();
  } catch {
    return null;
  }
}

export function serialiseSubscription(subscription: PushSubscription): BrowserPushSubscription | null {
  const json = subscription.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return null;
  return {
    endpoint: json.endpoint,
    keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
  };
}

export async function subscribeToPush(
  vapidPublicKey: string
): Promise<{ subscription: PushSubscription | null; error: string | null }> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
    return { subscription: null, error: 'This browser has no service worker support.' };
  }

  const registration = (await navigator.serviceWorker.getRegistration('/')) || (await registerServiceWorker());
  if (!registration) {
    return { subscription: null, error: 'The alert service worker could not start on this page.' };
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    return {
      subscription: null,
      error:
        permission === 'denied'
          ? 'Notifications are blocked for this site. Alerts will still appear in your in-app inbox.'
          : 'Notification permission was not granted. Alerts will still appear in your in-app inbox.',
    };
  }

  try {
    const existing = await registration.pushManager.getSubscription();
    const subscription =
      existing ||
      (await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as unknown as BufferSource,
      }));
    return { subscription, error: null };
  } catch (error) {
    return {
      subscription: null,
      error:
        error instanceof Error
          ? `Could not create the push subscription: ${error.message}`
          : 'Could not create the push subscription on this device.',
    };
  }
}

export async function unsubscribeFromPush(): Promise<string | null> {
  const subscription = await getBrowserSubscription();
  if (!subscription) return null;
  const endpoint = subscription.endpoint;
  try {
    await subscription.unsubscribe();
  } catch {
    // ignore browser errors; the server record is still removed
  }
  return endpoint;
}

export const PUSH_TOPIC_LABELS: Record<string, { label: string; detail: string }> = {
  safety_alerts: { label: 'Safety alerts', detail: 'Urgent and warning notices for your state and LGA.' },
  case_updates: { label: 'Case updates', detail: 'Stage changes on the cases you follow.' },
  petitions: { label: 'Petitions', detail: 'Deadline reminders and delivery confirmations.' },
  community: { label: 'Community replies', detail: 'Replies and moderation outcomes on your posts.' },
  weekly_digest: { label: 'Weekly digest', detail: 'One calm summary each week, no reminders in between.' },
};
