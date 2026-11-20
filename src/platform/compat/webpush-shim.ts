/**
 * Web Push inside the browser build.
 *
 * Browser push needs a trusted server to sign VAPID requests, which a static
 * drag-and-drop deployment does not have. Rather than pretend a delivery
 * succeeded, this returns the same failure shape the server produced when the
 * push service rejected a message: the record is still saved to the in-app
 * notification log, and the UI says so.
 */

function vapidKeys() {
  const bytes = new Uint8Array(65);
  bytes[0] = 0x04;
  const raw = globalThis.crypto.getRandomValues(new Uint8Array(64));
  bytes.set(raw, 1);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  const publicKey = btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const privateBytes = globalThis.crypto.getRandomValues(new Uint8Array(32));
  let privateBinary = '';
  for (const byte of privateBytes) privateBinary += String.fromCharCode(byte);
  const privateKey = btoa(privateBinary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return { publicKey, privateKey };
}

export function webpushShim() {
  return {
    generateVAPIDKeys: vapidKeys,
    setVapidDetails: () => undefined,
    async sendNotification(_subscription: unknown, _payload: unknown, _options?: unknown) {
      throw new Error('push_delivery_requires_server: this static deployment cannot sign VAPID requests');
    },
    async generateRequestDetails() {
      throw new Error('push_delivery_requires_server');
    },
  };
}
