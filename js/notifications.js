const STORAGE_KEY = 'khanqahNotificationPreferences';

let registration = null;
let publicKey = null;

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat(
    (4 - base64String.length % 4) % 4
  );

  const base64 = (
    base64String +
    padding
  )
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = atob(base64);

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
  const preferences = getPreferences();

  return Object.values(
    preferences
  ).some(
    preference =>
      preference?.announcements === true ||
      preference?.prayerChanges === true
  );
}

function isIOS() {
  return (
    /iPad|iPhone|iPod/.test(
      navigator.userAgent
    ) ||
    (
      navigator.platform === 'MacIntel' &&
      navigator.maxTouchPoints > 1
    )
  );
}

function isStandalone() {
  return (
    window.matchMedia(
      '(display-mode: standalone)'
    ).matches ||
    window.navigator.standalone === true
  );
}

function showNotificationMessage(message) {
  window.alert(message);
}

export function canEnableNotifications() {
  if (
    isIOS() &&
    !isStandalone()
  ) {
    return {
      allowed: false,
      reason: 'ios-install-required'
    };
  }

  if (
    !('serviceWorker' in navigator) ||
    !('PushManager' in window) ||
    !('Notification' in window)
  ) {
    return {
      allowed: false,
      reason: 'unsupported'
    };
  }

  if (
    Notification.permission ===
    'denied'
  ) {
    return {
      allowed: false,
      reason: 'denied'
    };
  }

  return {
    allowed: true,
    reason: null
  };
}

async function getPublicKey() {
  if (publicKey) {
    return publicKey;
  }

  const response = await fetch(
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

  const data = await response.json();

  if (!data.publicKey) {
    throw new Error(
      'Push configuration is unavailable.'
    );
  }

  publicKey = data.publicKey;

  return publicKey;
}

async function getSubscription() {
  if (!registration) {
    return null;
  }

  return registration.pushManager
    .getSubscription();
}

async function createSubscription() {
  const key = await getPublicKey();

  return registration.pushManager
    .subscribe({
      userVisibleOnly: true,
      applicationServerKey:
        urlBase64ToUint8Array(key)
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

  const response = await fetch(
    '/api/push/subscribe',
    {
      method: 'POST',
      headers: {
        'Content-Type':
          'application/json'
      },
      body: JSON.stringify({
        subscription:
          subscription.toJSON(),

        preferences:
          getPreferences()
      })
    }
  );

  const result = await response
    .json()
    .catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      result.error ||
      'Unable to save notification settings.'
    );
  }
}

export async function initNotifications() {
  const capability =
    canEnableNotifications();

  if (
    !capability.allowed &&
    capability.reason ===
      'unsupported'
  ) {
    return false;
  }

  if (
    !('serviceWorker' in navigator)
  ) {
    return false;
  }

  try {
    registration =
      await navigator
        .serviceWorker
        .register('/sw.js');

    await navigator
      .serviceWorker
      .ready;

    if (
      'Notification' in window &&
      Notification.permission ===
        'granted'
    ) {
      await syncSubscription();
    }

    return true;
  } catch (error) {
    console.error(
      'Unable to initialise notifications:',
      error
    );

    return false;
  }
}

export async function enableNotifications() {
  const capability =
    canEnableNotifications();

  if (!capability.allowed) {
    if (
      capability.reason ===
      'ios-install-required'
    ) {
      showNotificationMessage(
        'To enable notifications on iPhone or iPad, add this website to your Home Screen first. Then open it from the Home Screen and enable notifications again.'
      );

      return false;
    }

    if (
      capability.reason ===
      'denied'
    ) {
      showNotificationMessage(
        'Notifications are currently blocked for this website. Please enable them in your browser or device settings and try again.'
      );

      return false;
    }

    showNotificationMessage(
      'Notifications are not supported by this browser.'
    );

    return false;
  }

  if (!registration) {
    try {
      registration =
        await navigator
          .serviceWorker
          .register('/sw.js');

      await navigator
        .serviceWorker
        .ready;
    } catch (error) {
      console.error(
        'Unable to register service worker:',
        error
      );

      showNotificationMessage(
        'Notifications could not be enabled. Please try again.'
      );

      return false;
    }
  }

  let permission =
    Notification.permission;

  if (permission === 'default') {
    try {
      permission =
        await Notification
          .requestPermission();
    } catch (error) {
      console.error(
        'Unable to request notification permission:',
        error
      );

      return false;
    }
  }

  if (
    permission !==
    'granted'
  ) {
    return false;
  }

  try {
    await syncSubscription();

    return true;
  } catch (error) {
    console.error(
      'Unable to enable notifications:',
      error
    );

    showNotificationMessage(
      'Notifications could not be enabled. Please try again.'
    );

    return false;
  }
}

export async function syncNotificationPreferences() {
  if (
    !('Notification' in window) ||
    Notification.permission !==
      'granted'
  ) {
    return;
  }

  try {
    await syncSubscription();
  } catch (error) {
    console.error(
      'Unable to sync notification preferences:',
      error
    );

    throw error;
  }
}