const form = document.querySelector('[data-prayer-notification-form]');
const khanqahSelect = document.querySelector('[data-admin-khanqah]');
const submitButton = document.querySelector('[data-admin-submit]');
const status = document.querySelector('[data-admin-status]');

let masjids = {};

function setStatus(message, type = '') {
  if (!status) {
    return;
  }

  status.textContent = message;
  status.classList.remove('is-success', 'is-error');

  if (type) {
    status.classList.add(`is-${type}`);
  }
}

function formatTime(value) {
  if (!value) {
    return '';
  }

  const [hourString, minute] = value.split(':');
  const hour = Number(hourString);

  const period =
    hour >= 12
      ? 'PM'
      : 'AM';

  const twelveHour =
    hour % 12 || 12;

  return `${twelveHour}:${minute} ${period}`;
}

async function loadMasjids() {
  const response = await fetch(
    `data/masjids.json?v=${Date.now()}`,
    {
      cache: 'no-store'
    }
  );

  if (!response.ok) {
    throw new Error(
      'Unable to load Khanqahs.'
    );
  }

  const config = await response.json();

  masjids = config.masjids || {};

  Object.entries(masjids).forEach(([id, masjid]) => {
    if (masjid.comingSoon === true) {
      return;
    }

    const option = document.createElement('option');

    option.value = id;
    option.textContent = masjid.location || id;

    khanqahSelect.appendChild(option);
  });
}

form?.addEventListener('submit', async event => {
  event.preventDefault();

  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }

  const formData = new FormData(form);

  const adminKey = String(
    formData.get('adminKey') || ''
  ).trim();

  const khanqahId = String(
    formData.get('khanqahId') || ''
  ).trim();

  const prayer = String(
    formData.get('prayer') || ''
  ).trim();

  const dateText = String(
    formData.get('dateText') || ''
  ).trim();

  const rawTime = String(
    formData.get('time') || ''
  ).trim();

  const masjid = masjids[khanqahId];

  if (!masjid) {
    setStatus(
      'Please select a valid Khanqah.',
      'error'
    );

    return;
  }

  const time = formatTime(rawTime);

  const confirmed = window.confirm(
    `Send this notification?\n\n` +
    `${masjid.location} Khanqah — ${prayer} Time Change\n\n` +
    `${dateText}'s ${prayer} Jamat will be at ${time}.`
  );

  if (!confirmed) {
    return;
  }

  submitButton.disabled = true;
  submitButton.textContent = 'Sending…';

  setStatus(
    'Sending notification…'
  );

  try {
    const response = await fetch(
      '/api/push/prayer-change',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Key': adminKey
        },
        body: JSON.stringify({
          khanqahId,
          location: masjid.location,
          prayer,
          dateText,
          time
        })
      }
    );

    const result = await response
      .json()
      .catch(() => ({}));

    if (!response.ok) {
      throw new Error(
        result.error ||
        'Unable to send notification.'
      );
    }

    if (result.sent === 0) {
      setStatus(
        result.message ||
        'No subscribers were found.',
        'success'
      );

      return;
    }

    setStatus(
      `Notification sent to ${result.sent} subscriber${result.sent === 1 ? '' : 's'}.`,
      'success'
    );
  } catch (error) {
    console.error(
      'Notification error:',
      error
    );

    setStatus(
      error.message ||
      'Unable to send notification.',
      'error'
    );
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = 'Send Notification';
  }
});

loadMasjids().catch(error => {
  console.error(error);

  setStatus(
    'Unable to load the Khanqah list.',
    'error'
  );
});