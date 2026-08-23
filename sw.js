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

  const title =
    data.title ||
    'Khanqah Naqshbandia Mujaddidia';

  const options = {
    body: data.body || '',
    icon: '/assets/shared/logo.png',
    badge: '/assets/shared/logo.png',
    data: {
      url: data.url || '/'
    },
    tag:
      data.tag ||
      undefined
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

  const url =
    event.notification.data?.url ||
    '/';

  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then(windowClients => {
      for (const client of windowClients) {
        if ('focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }

      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});