const TIME_ZONE = 'Europe/London';

const PRAYERS = [
  ['fajr', 'Fajr'],
  ['sunrise', 'Sunrise'],
  ['dhuhr', 'Dhuhr'],
  ['asr', 'Asr'],
  ['maghrib', 'Maghrib'],
  ['isha', 'Isha']
];

const widget =
  document.querySelector(
    '[data-prayer-widget]'
  );

const clock =
  document.querySelector(
    '[data-prayer-clock]'
  );

const gregorian =
  document.querySelector(
    '[data-prayer-gregorian]'
  );

const hijri =
  document.querySelector(
    '[data-prayer-hijri]'
  );

const countdownLabel =
  document.querySelector(
    '[data-countdown-label]'
  );

const countdownTime =
  document.querySelector(
    '[data-countdown-time]'
  );

const countdownTarget =
  document.querySelector(
    '[data-countdown-target]'
  );

const tableBody =
  document.querySelector(
    '[data-prayer-table]'
  );

const jumuahTime =
  document.querySelector(
    '[data-jumuah-time]'
  );

const status =
  document.querySelector(
    '[data-prayer-status]'
  );

let currentMasjid = null;
let prayerTimes = null;
let renderTimer = null;
let reloadTimer = null;

const clockFormatter =
  new Intl.DateTimeFormat(
    'en-GB',
    {
      timeZone: TIME_ZONE,
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    }
  );

const gregorianFormatter =
  new Intl.DateTimeFormat(
    'en-GB',
    {
      timeZone: TIME_ZONE,
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }
  );

const hijriFormatter =
  new Intl.DateTimeFormat(
    'en-GB-u-ca-islamic-umalqura',
    {
      timeZone: TIME_ZONE,
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }
  );

function dateParts(
  date = new Date()
) {
  const parts =
    new Intl.DateTimeFormat(
      'en-GB',
      {
        timeZone: TIME_ZONE,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }
    ).formatToParts(date);

  return Object.fromEntries(
    parts
      .filter(
        part =>
          part.type !==
          'literal'
      )
      .map(
        part => [
          part.type,
          part.value
        ]
      )
  );
}

export function getDateKey(
  date = new Date()
) {
  const parts =
    dateParts(date);

  return [
    parts.year,
    parts.month,
    parts.day
  ].join('-');
}

function addDays(
  dateKey,
  days
) {
  const [
    year,
    month,
    day
  ] = dateKey
    .split('-')
    .map(Number);

  const date =
    new Date(
      Date.UTC(
        year,
        month - 1,
        day + days,
        12
      )
    );

  return [
    date.getUTCFullYear(),
    String(
      date.getUTCMonth() + 1
    ).padStart(2, '0'),
    String(
      date.getUTCDate()
    ).padStart(2, '0')
  ].join('-');
}

function timezoneOffset(
  date
) {
  const parts =
    new Intl.DateTimeFormat(
      'en-GB',
      {
        timeZone: TIME_ZONE,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hourCycle: 'h23'
      }
    ).formatToParts(date);

  const values =
    Object.fromEntries(
      parts
        .filter(
          part =>
            part.type !==
            'literal'
        )
        .map(
          part => [
            part.type,
            Number(
              part.value
            )
          ]
        )
    );

  return (
    Date.UTC(
      values.year,
      values.month - 1,
      values.day,
      values.hour,
      values.minute,
      values.second
    ) -
    date.getTime()
  );
}

export function makeManchesterDate(
  dateKey,
  time
) {
  if (
    !dateKey ||
    !time
  ) {
    return null;
  }

  const [
    year,
    month,
    day
  ] = dateKey
    .split('-')
    .map(Number);

  const [
    hour,
    minute
  ] = time
    .split(':')
    .map(Number);

  const wallClockUtc =
    Date.UTC(
      year,
      month - 1,
      day,
      hour,
      minute,
      0
    );

  let candidate =
    new Date(
      wallClockUtc
    );

  let offset =
    timezoneOffset(
      candidate
    );

  candidate =
    new Date(
      wallClockUtc -
      offset
    );

  const corrected =
    timezoneOffset(
      candidate
    );

  if (
    corrected !== offset
  ) {
    candidate =
      new Date(
        wallClockUtc -
        corrected
      );
  }

  return candidate;
}

function formatTime(time) {
  if (!time) {
    return '—';
  }

  const [
    hour,
    minute
  ] = time
    .split(':')
    .map(Number);

  return `${
    hour % 12 || 12
  }:${String(
    minute
  ).padStart(
    2,
    '0'
  )} ${
    hour >= 12
      ? 'PM'
      : 'AM'
  }`;
}

function getJamat(
  key,
  prayer
) {
  if (!prayer) {
    return null;
  }

  if (
    key === 'maghrib'
  ) {
    return (
      prayer.start ||
      null
    );
  }

  return (
    prayer.jamat ||
    null
  );
}

function finalEvent(
  key,
  prayer,
  dateKey
) {
  return makeManchesterDate(
    dateKey,
    getJamat(
      key,
      prayer
    ) ||
    prayer?.start
  );
}

function displayTiming(
  key,
  now,
  todayKey,
  tomorrowKey,
  today,
  tomorrow
) {
  const prayer =
    today?.[key];

  if (!prayer) {
    return null;
  }

  const end =
    finalEvent(
      key,
      prayer,
      todayKey
    );

  if (
    end &&
    now >= end &&
    tomorrow?.[key]
  ) {
    return {
      timing:
        tomorrow[key],
      isTomorrow: true
    };
  }

  return {
    timing: prayer,
    isTomorrow: false
  };
}

function nextEvent(
  now,
  todayKey,
  tomorrowKey,
  today,
  tomorrow
) {
  for (
    const [
      key,
      label
    ]
    of PRAYERS
  ) {
    const timing =
      today?.[key];

    if (
      !timing?.start
    ) {
      continue;
    }

    const start =
      makeManchesterDate(
        todayKey,
        timing.start
      );

    if (
      now < start
    ) {
      return {
        date: start,
        label:
          `${label} starts in`,
        target:
          `${label} start · ${formatTime(
            timing.start
          )}`
      };
    }

    const jamat =
      getJamat(
        key,
        timing
      );

    if (
      jamat &&
      jamat !==
        timing.start
    ) {
      const date =
        makeManchesterDate(
          todayKey,
          jamat
        );

      if (
        now < date
      ) {
        return {
          date,
          label:
            `${label} Jamat in`,
          target:
            `${label} Jamat · ${formatTime(
              jamat
            )}`
        };
      }
    }
  }

  const fajr =
    tomorrow?.fajr;

  if (
    fajr?.start
  ) {
    return {
      date:
        makeManchesterDate(
          tomorrowKey,
          fajr.start
        ),
      label:
        'Fajr starts in',
      target:
        `Tomorrow · ${formatTime(
          fajr.start
        )}`
    };
  }

  return null;
}

function formatCountdown(ms) {
  const total =
    Math.max(
      0,
      Math.floor(
        ms / 1000
      )
    );

  return [
    Math.floor(
      total / 3600
    ),
    Math.floor(
      (
        total %
        3600
      ) / 60
    ),
    total % 60
  ]
    .map(
      value =>
        String(value)
          .padStart(
            2,
            '0'
          )
    )
    .join(':');
}

function formatHijri(
  date
) {
  const parts =
    hijriFormatter
      .formatToParts(
        date
      );

  const values =
    Object.fromEntries(
      parts
        .filter(
          part =>
            part.type !==
              'literal' &&
            part.type !==
              'era'
        )
        .map(
          part => [
            part.type,
            part.value
          ]
        )
    );

  return `${
    values.day
  } ${
    values.month
  } ${
    values.year
  }`.toUpperCase() +
    ' AH';
}

function renderTable(
  now,
  todayKey,
  tomorrowKey,
  today,
  tomorrow
) {
  tableBody.innerHTML =
    PRAYERS
      .map(
        ([
          key,
          label
        ]) => {
          const display =
            displayTiming(
              key,
              now,
              todayKey,
              tomorrowKey,
              today,
              tomorrow
            );

          if (!display) {
            return `
              <tr>
                <td>
                  <span class="prayer-name">${label}</span>
                </td>
                <td class="prayer-time-muted">—</td>
                <td class="prayer-time-muted">—</td>
              </tr>
            `;
          }

          const badge =
            display
              .isTomorrow
              ? '<span class="prayer-day-badge">Tomorrow</span>'
              : '';

          const jamat =
            getJamat(
              key,
              display.timing
            );

          return `
            <tr>
              <td>
                <span class="prayer-name">${label}${badge}</span>
              </td>
              <td>
                <span class="prayer-time-main">${formatTime(
                  display
                    .timing
                    .start
                )}</span>
              </td>
              <td class="${jamat ? '' : 'prayer-time-muted'}">
                ${
                  jamat
                    ? `<span class="prayer-time-main">${formatTime(
                        jamat
                      )}</span>`
                    : '—'
                }
              </td>
            </tr>
          `;
        }
      )
      .join('');
}

function render() {
  if (!widget) {
    return;
  }

  const now =
    new Date();

  const todayKey =
    getDateKey(now);

  const tomorrowKey =
    addDays(
      todayKey,
      1
    );

  const today =
    prayerTimes?.[
      todayKey
    ];

  const tomorrow =
    prayerTimes?.[
      tomorrowKey
    ];

  clock.textContent =
    clockFormatter
      .format(now)
      .toUpperCase();

  clock.setAttribute(
    'datetime',
    now.toISOString()
  );

  gregorian.textContent =
    gregorianFormatter
      .format(now)
      .toUpperCase();

  let hijriDate =
    now;

  const maghribStart =
    today?.maghrib
      ?.start;

  if (maghribStart) {
    const maghrib =
      makeManchesterDate(
        todayKey,
        maghribStart
      );

    if (
      maghrib &&
      now >= maghrib
    ) {
      hijriDate =
        makeManchesterDate(
          tomorrowKey,
          '12:00'
        ) ||
        now;
    }
  }

  hijri.textContent =
    formatHijri(
      hijriDate
    );

  if (!prayerTimes) {
    return;
  }

  if (!today) {
    countdownLabel.textContent =
      'Prayer times unavailable';

    countdownTime.textContent =
      '--:--:--';

    countdownTarget.textContent =
      todayKey;

    tableBody.innerHTML =
      '<tr><td colspan="3" class="prayer-loading">No prayer times found for today.</td></tr>';

    jumuahTime.textContent =
      '—';

    return;
  }

  const next =
    nextEvent(
      now,
      todayKey,
      tomorrowKey,
      today,
      tomorrow
    );

  if (next) {
    countdownLabel.textContent =
      next.label;

    countdownTime.textContent =
      formatCountdown(
        next.date -
        now
      );

    countdownTarget.textContent =
      next.target;
  } else {
    countdownLabel.textContent =
      'Next prayer';

    countdownTime.textContent =
      '--:--:--';

    countdownTarget.textContent =
      'Next day prayer times are not available yet.';
  }

  renderTable(
    now,
    todayKey,
    tomorrowKey,
    today,
    tomorrow
  );

  const dhuhr =
    displayTiming(
      'dhuhr',
      now,
      todayKey,
      tomorrowKey,
      today,
      tomorrow
    );

  const dhuhrJamat =
    getJamat(
      'dhuhr',
      dhuhr?.timing
    );

  jumuahTime.textContent =
    dhuhrJamat
      ? formatTime(
          dhuhrJamat
        )
      : '—';
}

async function load() {
  if (
    !currentMasjid
      ?.prayerTimesUrl
  ) {
    prayerTimes =
      null;

    status.hidden =
      false;

    status.textContent =
      'Prayer times have not been configured for this Masjid.';

    render();
    return;
  }

  try {
    status.hidden =
      true;

    const response =
      await fetch(
        currentMasjid
          .prayerTimesUrl,
        {
          cache:
            'no-store'
        }
      );

    if (
      !response.ok
    ) {
      throw new Error(
        `HTTP ${response.status}`
      );
    }

    prayerTimes =
      await response
        .json();

    render();
  } catch (error) {
    console.error(
      'Unable to load prayer times:',
      error
    );

    status.hidden =
      false;

    status.textContent =
      'Prayer times are temporarily unavailable.';
  }
}

export function stopPrayerTimes() {
  clearInterval(
    renderTimer
  );

  clearInterval(
    reloadTimer
  );

  renderTimer = null;
  reloadTimer = null;
  prayerTimes = null;
}

export function initPrayerTimes(
  masjid
) {
  stopPrayerTimes();

  currentMasjid =
    masjid;

  render();
  load();

  renderTimer =
    setInterval(
      render,
      1000
    );

  reloadTimer =
    setInterval(
      load,
      30 * 60 * 1000
    );
}
