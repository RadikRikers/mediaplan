/* Service Worker for reminder notifications.
 *
 * Limitation: this improves reliability of in-app reminders while the browser is active,
 * but it is not a full "real" Web Push implementation without a backend (VAPID) that
 * can deliver push messages while the user is away.
 */

self.addEventListener('message', (event) => {
  const data = event.data;
  if (!data || data.type !== 'SHOW_NOTIFICATION') return;

  const { title, body, tag } = data.payload || {};
  const safeTitle = title || 'Напоминание';
  const safeBody = body || '';

  const options = {
    body: safeBody,
    tag: tag || undefined,
    // Helps re-notify same tag if we want to update the content.
    renotify: true,
  };

  event.waitUntil(self.registration.showNotification(safeTitle, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  event.waitUntil(
    (async () => {
      const scope = self.registration.scope || '/';
      const allClients = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      });

      if (allClients && allClients.length > 0) {
        // Focus an existing tab
        allClients[0].focus();
        return;
      }

      // Open the app root
      await self.clients.openWindow(scope);
    })(),
  );
});

// Placeholder for real Web Push (requires a backend to actually send push messages).
self.addEventListener('push', (event) => {
  // If someone sends a push event without a payload, show a generic notification.
  const text = (() => {
    try {
      if (!event.data) return '';
      return event.data.text();
    } catch {
      return '';
    }
  })();

  const title = 'Напоминание';
  const body = text || 'Есть обновления.';

  event.waitUntil(self.registration.showNotification(title, { body }));
});

