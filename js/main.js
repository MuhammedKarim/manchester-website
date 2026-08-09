const header = document.querySelector('[data-header]');
const navToggle = document.querySelector('[data-nav-toggle]');
const navMenu = document.querySelector('[data-nav-menu]');

function setHeaderState() {
  header?.classList.toggle('is-scrolled', window.scrollY > 12);
}

navToggle?.addEventListener('click', () => {
  const isOpen = navMenu?.classList.toggle('is-open') ?? false;
  navToggle.setAttribute('aria-expanded', String(isOpen));
});

navMenu?.addEventListener('click', event => {
  if (event.target.matches('a')) {
    navMenu.classList.remove('is-open');
    navToggle?.setAttribute('aria-expanded', 'false');
  }
});

document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && navMenu?.classList.contains('is-open')) {
    navMenu.classList.remove('is-open');
    navToggle?.setAttribute('aria-expanded', 'false');
    navToggle?.focus();
  }
});

window.addEventListener('scroll', setHeaderState, { passive: true });
setHeaderState();

const revealItems = document.querySelectorAll('.reveal');

if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.14 });

  revealItems.forEach(item => observer.observe(item));
} else {
  revealItems.forEach(item => item.classList.add('is-visible'));
}

const copyAddressButton = document.querySelector('.copy-address-button');

copyAddressButton?.addEventListener('click', async () => {
  const address = copyAddressButton.dataset.copyAddress;
  const originalText = copyAddressButton.textContent;

  try {
    await navigator.clipboard.writeText(address);
    copyAddressButton.textContent = 'Copied';
  } catch {
    copyAddressButton.textContent = 'Copy failed';
  }

  setTimeout(() => {
    copyAddressButton.textContent = originalText;
  }, 1600);
});

const PRAYER_TIMES_URL = 'https://muhammedkarim.github.io/manchester-khanqah/prayer-times.json';
const PRAYER_TIME_ZONE = 'Europe/London';

const PRAYER_ORDER = [
  { key: 'fajr', label: 'Fajr', countdown: true },
  { key: 'sunrise', label: 'Sunrise', countdown: true },
  { key: 'dhuhr', label: 'Dhuhr', countdown: true },
  { key: 'asr', label: 'Asr', countdown: true },
  { key: 'maghrib', label: 'Maghrib', countdown: true },
  { key: 'isha', label: 'Isha', countdown: true }
];

const prayerWidget = document.querySelector('[data-prayer-widget]');
const prayerClock = document.querySelector('[data-prayer-clock]');
const prayerGregorian = document.querySelector('[data-prayer-gregorian]');
const prayerHijri = document.querySelector('[data-prayer-hijri]');
const countdownLabel = document.querySelector('[data-countdown-label]');
const countdownTime = document.querySelector('[data-countdown-time]');
const countdownTarget = document.querySelector('[data-countdown-target]');
const prayerTableBody = document.querySelector('[data-prayer-table]');
const jumuahTimeElement = document.querySelector('[data-jumuah-time]');
const prayerStatus = document.querySelector('[data-prayer-status]');

let prayerTimes = null;

const manchesterClockFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: PRAYER_TIME_ZONE,
  hour: 'numeric',
  minute: '2-digit',
  second: '2-digit',
  hour12: true
});

const gregorianFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: PRAYER_TIME_ZONE,
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric'
});

const hijriFormatter = new Intl.DateTimeFormat('en-GB-u-ca-islamic-umalqura', {
  timeZone: PRAYER_TIME_ZONE,
  day: 'numeric',
  month: 'long',
  year: 'numeric'
});

function getManchesterDateParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: PRAYER_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(date);

  const values = Object.fromEntries(
    parts
      .filter(part => part.type !== 'literal')
      .map(part => [part.type, part.value])
  );

  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day)
  };
}

function getDateKey(date = new Date()) {
  const { year, month, day } = getManchesterDateParts(date);

  return [
    year,
    String(month).padStart(2, '0'),
    String(day).padStart(2, '0')
  ].join('-');
}

function addDaysToDateKey(dateKey, days) {
  const [year, month, day] = dateKey.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days, 12));

  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, '0'),
    String(date.getUTCDate()).padStart(2, '0')
  ].join('-');
}

function getTimeZoneOffsetMs(date, timeZone) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23'
  }).formatToParts(date);

  const values = Object.fromEntries(
    parts
      .filter(part => part.type !== 'literal')
      .map(part => [part.type, Number(part.value)])
  );

  const asUtc = Date.UTC(
    values.year,
    values.month - 1,
    values.day,
    values.hour,
    values.minute,
    values.second
  );

  return asUtc - date.getTime();
}

function makeManchesterDate(dateKey, time) {
  if (!dateKey || !time) return null;

  const [year, month, day] = dateKey.split('-').map(Number);
  const [hour, minute] = time.split(':').map(Number);
  const wallClockUtc = Date.UTC(year, month - 1, day, hour, minute, 0);

  let candidate = new Date(wallClockUtc);
  let offset = getTimeZoneOffsetMs(candidate, PRAYER_TIME_ZONE);
  candidate = new Date(wallClockUtc - offset);

  const correctedOffset = getTimeZoneOffsetMs(candidate, PRAYER_TIME_ZONE);
  if (correctedOffset !== offset) {
    candidate = new Date(wallClockUtc - correctedOffset);
  }

  return candidate;
}

function formatPrayerTime(time) {
  if (!time) return '—';

  const [hour, minute] = time.split(':').map(Number);
  const period = hour >= 12 ? 'PM' : 'AM';
  const twelveHour = hour % 12 || 12;

  return `${twelveHour}:${String(minute).padStart(2, '0')} ${period}`;
}

function formatHijriDate(date) {
  const parts = hijriFormatter.formatToParts(date);
  const values = Object.fromEntries(
    parts
      .filter(part => part.type !== 'literal' && part.type !== 'era')
      .map(part => [part.type, part.value])
  );

  if (!values.day || !values.month || !values.year) {
    return `${hijriFormatter.format(date).toUpperCase()} AH`;
  }

  return `${values.day} ${values.month} ${values.year}`.toUpperCase() + ' AH';
}

function getHijriDisplayDate(now, todayKey, tomorrowKey, todayTimes) {
  const maghribStart = todayTimes?.maghrib?.start;

  if (!maghribStart) {
    return now;
  }

  const maghribDate = makeManchesterDate(todayKey, maghribStart);

  if (maghribDate && now >= maghribDate) {
    return makeManchesterDate(tomorrowKey, '12:00') || now;
  }

  return now;
}

function formatCountdown(milliseconds) {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return [hours, minutes, seconds]
    .map(value => String(value).padStart(2, '0'))
    .join(':');
}

function getJamatTime(prayerKey, prayer) {
  if (!prayer) return null;

  if (prayerKey === 'maghrib') {
    return prayer.start || null;
  }

  return prayer.jamat || null;
}

function getFinalPrayerEvent(prayerKey, prayer, dateKey) {
  if (!prayer) return null;

  const jamatTime = getJamatTime(prayerKey, prayer);
  return makeManchesterDate(dateKey, jamatTime || prayer.start);
}

function getNextPrayerEvent(now, todayKey, tomorrowKey, todayTimes, tomorrowTimes) {
  for (const prayer of PRAYER_ORDER) {
    if (!prayer.countdown) continue;

    const timing = todayTimes?.[prayer.key];
    if (!timing?.start) continue;

    const startDate = makeManchesterDate(todayKey, timing.start);

    if (now < startDate) {
      return {
        date: startDate,
        label: `${prayer.label} starts in`,
        target: `${prayer.label} start · ${formatPrayerTime(timing.start)}`
      };
    }

    const jamatTime = getJamatTime(prayer.key, timing);

    if (jamatTime && jamatTime !== timing.start) {
      const jamatDate = makeManchesterDate(todayKey, jamatTime);

      if (now < jamatDate) {
        return {
          date: jamatDate,
          label: `${prayer.label} Jamat in`,
          target: `${prayer.label} Jamat · ${formatPrayerTime(jamatTime)}`
        };
      }
    }
  }

  const tomorrowFajr = tomorrowTimes?.fajr;

  if (tomorrowFajr?.start) {
    const fajrDate = makeManchesterDate(tomorrowKey, tomorrowFajr.start);

    return {
      date: fajrDate,
      label: 'Fajr starts in',
      target: `Tomorrow · ${formatPrayerTime(tomorrowFajr.start)}`
    };
  }

  return null;
}

function getDisplayTiming(prayerKey, now, todayKey, tomorrowKey, todayTimes, tomorrowTimes) {
  const todayPrayer = todayTimes?.[prayerKey];
  if (!todayPrayer) return null;

  const finalTodayEvent = getFinalPrayerEvent(prayerKey, todayPrayer, todayKey);

  if (finalTodayEvent && now >= finalTodayEvent && tomorrowTimes?.[prayerKey]) {
    return {
      timing: tomorrowTimes[prayerKey],
      dateKey: tomorrowKey,
      isTomorrow: true
    };
  }

  return {
    timing: todayPrayer,
    dateKey: todayKey,
    isTomorrow: false
  };
}

function renderPrayerTable(now, todayKey, tomorrowKey, todayTimes, tomorrowTimes) {
  if (!prayerTableBody) return;

  prayerTableBody.innerHTML = PRAYER_ORDER.map(prayer => {
    const display = getDisplayTiming(
      prayer.key,
      now,
      todayKey,
      tomorrowKey,
      todayTimes,
      tomorrowTimes
    );

    if (!display) {
      return `
        <tr>
          <td><span class="prayer-name">${prayer.label}</span></td>
          <td class="prayer-time-muted">—</td>
          <td class="prayer-time-muted">—</td>
        </tr>
      `;
    }

    const badge = display.isTomorrow
      ? '<span class="prayer-day-badge">Tomorrow</span>'
      : '';

    const jamatTime = getJamatTime(prayer.key, display.timing);

    return `
      <tr>
        <td>
          <span class="prayer-name">${prayer.label}${badge}</span>
        </td>
        <td>
          <span class="prayer-time-main">${formatPrayerTime(display.timing.start)}</span>
        </td>
        <td class="${jamatTime ? '' : 'prayer-time-muted'}">
          ${jamatTime
            ? `<span class="prayer-time-main">${formatPrayerTime(jamatTime)}</span>`
            : '—'}
        </td>
      </tr>
    `;
  }).join('');
}

function renderJumuahTime(now, todayKey, tomorrowKey, todayTimes, tomorrowTimes) {
  if (!jumuahTimeElement) return;

  const display = getDisplayTiming(
    'dhuhr',
    now,
    todayKey,
    tomorrowKey,
    todayTimes,
    tomorrowTimes
  );

  const dhuhrJamat = getJamatTime('dhuhr', display?.timing);
  jumuahTimeElement.textContent = dhuhrJamat ? formatPrayerTime(dhuhrJamat) : '—';
}

function renderPrayerWidget() {
  if (!prayerWidget) return;

  const now = new Date();
  const todayKey = getDateKey(now);
  const tomorrowKey = addDaysToDateKey(todayKey, 1);

  if (prayerClock) {
    prayerClock.textContent = manchesterClockFormatter.format(now).toUpperCase();
    prayerClock.setAttribute('datetime', now.toISOString());
  }

  if (prayerGregorian) {
    prayerGregorian.textContent = gregorianFormatter.format(now).toUpperCase();
  }

  const todayTimes = prayerTimes?.[todayKey];
  const tomorrowTimes = prayerTimes?.[tomorrowKey];

  if (prayerHijri) {
    const hijriDate = getHijriDisplayDate(now, todayKey, tomorrowKey, todayTimes);
    prayerHijri.textContent = formatHijriDate(hijriDate);
  }

  if (!prayerTimes) return;

  if (!todayTimes) {
    if (countdownLabel) countdownLabel.textContent = 'Prayer times unavailable';
    if (countdownTime) countdownTime.textContent = '--:--:--';
    if (countdownTarget) countdownTarget.textContent = todayKey;
    if (prayerTableBody) {
      prayerTableBody.innerHTML = `
        <tr>
          <td colspan="3" class="prayer-loading">No prayer times found for today.</td>
        </tr>
      `;
    }
    if (jumuahTimeElement) jumuahTimeElement.textContent = '—';
    return;
  }

  const nextEvent = getNextPrayerEvent(
    now,
    todayKey,
    tomorrowKey,
    todayTimes,
    tomorrowTimes
  );

  if (nextEvent) {
    if (countdownLabel) countdownLabel.textContent = nextEvent.label;
    if (countdownTime) countdownTime.textContent = formatCountdown(nextEvent.date - now);
    if (countdownTarget) countdownTarget.textContent = nextEvent.target;
  } else {
    if (countdownLabel) countdownLabel.textContent = 'Next prayer';
    if (countdownTime) countdownTime.textContent = '--:--:--';
    if (countdownTarget) {
      countdownTarget.textContent = 'Next day prayer times are not available yet.';
    }
  }

  renderPrayerTable(
    now,
    todayKey,
    tomorrowKey,
    todayTimes,
    tomorrowTimes
  );

  renderJumuahTime(
    now,
    todayKey,
    tomorrowKey,
    todayTimes,
    tomorrowTimes
  );
}

async function loadPrayerTimes() {
  if (!prayerWidget) return;

  try {
    if (prayerStatus) prayerStatus.hidden = true;

    const response = await fetch(PRAYER_TIMES_URL, {
      cache: 'no-store',
      headers: { Accept: 'application/json' }
    });

    if (!response.ok) {
      throw new Error(`Prayer times request failed with HTTP ${response.status}`);
    }

    prayerTimes = await response.json();
    renderPrayerWidget();
  } catch (error) {
    console.error('Unable to load prayer times:', error);

    if (countdownLabel) countdownLabel.textContent = 'Prayer times unavailable';
    if (countdownTime) countdownTime.textContent = '--:--:--';
    if (countdownTarget) countdownTarget.textContent = '';
    if (prayerTableBody) {
      prayerTableBody.innerHTML = `
        <tr>
          <td colspan="3" class="prayer-loading">Unable to load prayer times.</td>
        </tr>
      `;
    }
    if (jumuahTimeElement) jumuahTimeElement.textContent = '—';

    if (prayerStatus) {
      prayerStatus.hidden = false;
      prayerStatus.textContent = 'Please refresh the page or use the downloadable timetable.';
    }
  }
}

if (prayerWidget) {
  renderPrayerWidget();
  loadPrayerTimes();

  setInterval(renderPrayerWidget, 1000);

  setInterval(loadPrayerTimes, 30 * 60 * 1000);
}

const DHIKR_TIMES_URL = 'https://sufi.org.uk/live-dzp';
const DHIKR_ROLLOVER_MINUTES = 30;

const dhikrSection = document.querySelector('.dhikr-section');
const dhikrMorning = document.getElementById('dhikr-morning');
const dhikrEvening = document.getElementById('dhikr-evening');
const dhikrNight = document.getElementById('dhikr-night');
const dhikrNightCol = document.getElementById('dhikr-night-col');
const dhikrStatus = document.querySelector('[data-dhikr-status]');

let dhikrData = null;

function formatDhikrTime(time) {
  if (!time) return '—';

  const [hourString, minute] = time.split(':');
  const hour = Number(hourString);
  const period = hour >= 12 ? 'PM' : 'AM';
  const twelveHour = hour % 12 || 12;

  return `${twelveHour}:${minute} ${period}`;
}

function getDhikrDisplayTime(period) {
  if (!dhikrData) return null;

  const todayTime = dhikrData.today?.[period] || null;
  const tomorrowTime = dhikrData.tomorrow?.[period] || null;

  if (!todayTime) {
    return tomorrowTime;
  }

  const todayKey = getDateKey(new Date());
  const gatheringTime = makeManchesterDate(todayKey, todayTime);

  if (!gatheringTime) {
    return todayTime;
  }

  const rolloverTime = new Date(
    gatheringTime.getTime() +
    DHIKR_ROLLOVER_MINUTES * 60 * 1000
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
  if (!dhikrData) return false;

  return Boolean(
    dhikrData.today?.night ||
    dhikrData.tomorrow?.night
  );
}

function renderDhikrTimes() {
  if (!dhikrSection || !dhikrData) return;

  if (dhikrMorning) {
    dhikrMorning.textContent =
      formatDhikrTime(
        getDhikrDisplayTime('morning')
      );
  }

  if (dhikrEvening) {
    dhikrEvening.textContent =
      formatDhikrTime(
        getDhikrDisplayTime('evening')
      );
  }

  const showNight = hasDhikrNight();

  dhikrSection.classList.toggle(
    'has-night',
    showNight
  );

  if (dhikrNightCol) {
    dhikrNightCol.hidden = !showNight;
  }

  if (dhikrNight) {
    dhikrNight.textContent = showNight
      ? formatDhikrTime(
          getDhikrDisplayTime('night')
        )
      : '—';
  }
}

async function loadDhikrTimes() {
  if (!dhikrSection) return;

  try {
    if (dhikrStatus) {
      dhikrStatus.hidden = true;
    }

    const response = await fetch(
      DHIKR_TIMES_URL,
      {
        cache: 'no-store'
      }
    );

    if (!response.ok) {
      throw new Error(
        `Dhikr request failed with HTTP ${response.status}`
      );
    }

    dhikrData = await response.json();

    renderDhikrTimes();
  } catch (error) {
    console.error(
      'Unable to load Dhikr times:',
      error
    );

    if (dhikrMorning) {
      dhikrMorning.textContent = '—';
    }

    if (dhikrEvening) {
      dhikrEvening.textContent = '—';
    }

    if (dhikrNight) {
      dhikrNight.textContent = '—';
    }

    if (dhikrNightCol) {
      dhikrNightCol.hidden = true;
    }

    dhikrSection?.classList.remove(
      'has-night'
    );

    if (dhikrStatus) {
      dhikrStatus.hidden = false;
      dhikrStatus.textContent =
        'Gathering times are temporarily unavailable.';
    }
  }
}

if (dhikrSection) {
  loadDhikrTimes();

  setInterval(
    renderDhikrTimes,
    60 * 1000
  );

  setInterval(
    loadDhikrTimes,
    10 * 60 * 1000
  );
}