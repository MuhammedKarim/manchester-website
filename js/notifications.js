const STORAGE_KEY =
  'khanqahNotificationPreferences';

let registration = null;
let publicKey = null;

function urlBase64ToUint8Array(base64String) {
  const padding =
    '='.repeat(
      (4 - base64String.length % 4) % 4
    );

  const base64 =
    (
      base64String +
      padding
    )
      .replace(/-/g, '+')
      .replace(/_/g, '/');

  const rawData =
    atob(base64);

  return Uint8Array.from(
    [...rawData].map(
      character =>
        character.charCodeAt(0)
    )
  );
}

function getPreferences() {
  try {
    return JSON.parse(
      localStorage.getItem(
        STORAGE_KEY
      ) || '{}'
    );
  } catch {
    return {};
  }
}

function hasAnyPreference() {
  const preferences =
    getPreferences();

  return Object.values(
    preferences
  ).some(
    preference =>
      preference?.announcements === true ||
      preference?.prayerChanges === true
  );
}

async function getPublicKey() {
  if (publicKey) {
    return publicKey;
  }

  const response =
    await fetch(
      '/api/push/config',
      {
        cache: 'no-store'
      }
    );

  if (!response.ok) {
    throw new Error(
      'Push configuration is unavailable.'
    );
  }

  const data =
    await response.json();

  publicKey =
    data.publicKey;

  return publicKey;
}

async function getSubscription() {
  if (!registration) {
    return null;
  }

  return registration
    .pushManager
    .getSubscription();
}

async function createSubscription() {
  const key =
    await getPublicKey();

  return registration
    .pushManager
    .subscribe({
      userVisibleOnly: true,
      applicationServerKey:
        urlBase64ToUint8Array(
          key
        )
    });
}

async function syncSubscription() {
  if (
    Notification.permission !==
    'granted'
  ) {
    return;
  }

  let subscription =
    await getSubscription();

  if (
    !subscription &&
    hasAnyPreference()
  ) {
    subscription =
      await createSubscription();
  }

  if (!subscription) {
    return;
  }

  const response =
    await fetch(
      '/api/push/subscribe',
      {
        method: 'POST',
        headers: {
          'Content-Type':
            'application/json'
        },
        body:
          JSON.stringify({
            subscription:
              subscription.toJSON(),

            preferences:
              getPreferences()
          })
      }
    );

  if (!response.ok) {
    throw new Error(
      'Unable to save notification settings.'
    );
  }
}

export async function initNotifications() {
  if (
    !('serviceWorker' in navigator) ||
    !('PushManager' in window) ||
    !('Notification' in window)
  ) {
    return false;
  }

  registration =
    await navigator
      .serviceWorker
      .register('/sw.js');

  await navigator
    .serviceWorker
    .ready;

  if (
    Notification.permission ===
      'granted'
  ) {
    await syncSubscription()
      .catch(error => {
        console.error(
          'Unable to sync notifications:',
          error
        );
      });
  }

  return true;
}

export async function enableNotifications() {
  if (!registration) {
    return false;
  }

  let permission =
    Notification.permission;

  if (permission === 'default') {
    permission =
      await Notification
        .requestPermission();
  }

  if (permission !== 'granted') {
    return false;
  }

  await syncSubscription();

  return true;
}

export async function syncNotificationPreferences() {
  if (
    Notification.permission !==
      'granted'
  ) {
    return;
  }

  await syncSubscription();
}