import {
  getDateKey,
  makeManchesterDate
} from './prayer-times.js';

const ROLLOVER_MINUTES = 30;

let currentDhikrConfig = null;
let dhikrData = null;
let renderTimer = null;
let reloadTimer = null;

const section =
  document.querySelector(
    '.dhikr-section'
  );

const navItem =
  document.querySelector(
    '[data-dhikr-nav-item]'
  );

const title =
  document.querySelector(
    '[data-dhikr-title]'
  );

const description =
  document.querySelector(
    '[data-dhikr-description]'
  );

const secondary =
  document.querySelector(
    '[data-dhikr-secondary]'
  );

const liveLink =
  document.querySelector(
    '[data-dhikr-live-link]'
  );

const morning =
  document.getElementById(
    'dhikr-morning'
  );

const evening =
  document.getElementById(
    'dhikr-evening'
  );

const night =
  document.getElementById(
    'dhikr-night'
  );

const nightCol =
  document.getElementById(
    'dhikr-night-col'
  );

const status =
  document.querySelector(
    '[data-dhikr-status]'
  );

function formatDhikrTime(time) {
  if (!time) {
    return '—';
  }

  const [
    hourString,
    minute
  ] = time.split(':');

  const hour =
    Number(hourString);

  return `${hour % 12 || 12}:${minute} ${hour >= 12 ? 'PM' : 'AM'}`;
}

function getDhikrDisplayTime(period) {
  if (!dhikrData) {
    return null;
  }

  const todayTime =
    dhikrData.today?.[period] ||
    null;

  const tomorrowTime =
    dhikrData.tomorrow?.[period] ||
    null;

  if (!todayTime) {
    return tomorrowTime;
  }

  const gatheringTime =
    makeManchesterDate(
      getDateKey(new Date()),
      todayTime
    );

  if (!gatheringTime) {
    return todayTime;
  }

  const rolloverTime =
    new Date(
      gatheringTime.getTime() +
      ROLLOVER_MINUTES *
        60 *
        1000
    );

  if (
    new Date() >= rolloverTime &&
    tomorrowTime
  ) {
    return tomorrowTime;
  }

  return todayTime;
}

function hasDhikrNight() {
  if (!dhikrData) {
    return false;
  }

  return Boolean(
    dhikrData.today?.night ||
    dhikrData.tomorrow?.night
  );
}

function renderDhikrTimes() {
  if (
    !section ||
    !dhikrData
  ) {
    return;
  }

  if (morning) {
    morning.textContent =
      formatDhikrTime(
        getDhikrDisplayTime(
          'morning'
        )
      );
  }

  if (evening) {
    evening.textContent =
      formatDhikrTime(
        getDhikrDisplayTime(
          'evening'
        )
      );
  }

  const showNight =
    hasDhikrNight();

  section.classList.toggle(
    'has-night',
    showNight
  );

  if (nightCol) {
    nightCol.hidden =
      !showNight;
  }

  if (night) {
    night.textContent =
      showNight
        ? formatDhikrTime(
            getDhikrDisplayTime(
              'night'
            )
          )
        : '—';
  }
}

async function loadDhikrTimes() {
  if (
    !currentDhikrConfig?.timesUrl
  ) {
    return;
  }

  try {
    if (status) {
      status.hidden = true;
    }

    const response =
      await fetch(
        currentDhikrConfig.timesUrl,
        {
          cache: 'no-store'
        }
      );

    if (!response.ok) {
      throw new Error(
        `Dhikr request failed with HTTP ${response.status}`
      );
    }

    dhikrData =
      await response.json();

    renderDhikrTimes();
  } catch (error) {
    console.error(
      'Unable to load Dhikr times:',
      error
    );

    if (morning) {
      morning.textContent = '—';
    }

    if (evening) {
      evening.textContent = '—';
    }

    if (night) {
      night.textContent = '—';
    }

    if (nightCol) {
      nightCol.hidden = true;
    }

    section?.classList.remove(
      'has-night'
    );

    if (status) {
      status.hidden = false;
      status.textContent =
        'Gathering times are temporarily unavailable.';
    }
  }
}

export function stopDhikr() {
  clearInterval(renderTimer);
  clearInterval(reloadTimer);

  renderTimer = null;
  reloadTimer = null;
  dhikrData = null;
}

export function initDhikr(
  dhikrConfig
) {
  stopDhikr();

  currentDhikrConfig =
    dhikrConfig;

  const enabled =
    currentDhikrConfig?.enabled === true &&
    Boolean(
      currentDhikrConfig?.timesUrl
    );

  if (section) {
    section.hidden = !enabled;
  }

  if (navItem) {
    navItem.hidden = !enabled;
  }

  if (title) {
    title.textContent =
      currentDhikrConfig?.title ||
      'Remembrance of Allah';
  }

  if (description) {
    description.textContent =
      currentDhikrConfig?.description ||
      '';
  }

  if (secondary) {
    secondary.textContent =
      currentDhikrConfig?.secondaryText ||
      '';
  }

  if (liveLink) {
    const liveUrl =
      currentDhikrConfig?.liveUrl ||
      '';

    liveLink.href =
      liveUrl || '#';

    liveLink.textContent =
      currentDhikrConfig?.liveText ||
      'Listen live at sufi.org.uk/live';

    liveLink.hidden = !liveUrl;
  }

  if (!enabled) {
    return;
  }

  loadDhikrTimes();

  renderTimer =
    setInterval(
      renderDhikrTimes,
      60 * 1000
    );

  reloadTimer =
    setInterval(
      loadDhikrTimes,
      10 * 60 * 1000
    );
}
