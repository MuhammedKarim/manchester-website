self.addEventListener('push', event => {
  let data = {};

  try {
    data = event.data?.json() || {};
  } catch {
    data = {
      title: 'Khanqah Naqshbandia Mujaddidia',
      body: event.data?.text() || 'New notification'
    };
  }

  const title = data.title || 'Khanqah Naqshbandia Mujaddidia';

  const options = {
    body: data.body || '',
    icon: '/assets/shared/logo.png',
    badge: '/assets/shared/logo.png',
    data: {
      url: data.url || '/'
    },
    tag: data.tag || undefined
  };

  event.waitUntil(
    self.registration.showNotification(
      title,
      options
    )
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();

  const targetUrl =
    new URL(
      event.notification.data?.url || '/',
      self.location.origin
    ).href;

  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then(async windowClients => {
      for (const client of windowClients) {
        if ('navigate' in client) {
          await client.navigate(targetUrl);
        }

        if ('focus' in client) {
          return client.focus();
        }
      }

      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
