import { initNavigation } from './navigation.js';
import { createMasjidSelector, showMasjidSelector, hideMasjidSelector } from './selector.js';
import { applyMasjidContent } from './masjid.js';
import { initPrayerTimes, stopPrayerTimes } from './prayer-times.js';
import { initDhikr, stopDhikr } from './dhikr.js';
import { initPoster, setPosterKhanqah, showGlobalPosterOnly, refreshNoticeTicker } from './poster.js';
import { initTimetable } from './timetable.js';
import { initPresence } from './presence.js';
import { initSharedBanner } from './shared.js';
import { initNotifications } from './notifications.js';

const MASJIDS_CONFIG_URL = 'data/masjids.json';
const SITE_CONFIG_URL = 'data/config.json';

const brandLogo = document.querySelector('[data-masjid-logo]');

let masjidsConfig = null;
let siteConfig = null;
let currentMasjidId = null;

async function loadJson(url) {
  const response = await fetch(`${url}?v=${Date.now()}`, {
    cache: 'no-store'
  });

  if (!response.ok) {
    throw new Error(`${url} failed with HTTP ${response.status}`);
  }

  const contentType = response.headers.get('content-type') || '';

  if (!contentType.toLowerCase().includes('application/json')) {
    throw new Error(`${url} returned ${contentType || 'an unknown content type'} instead of JSON`);
  }

  return response.json();
}

function getNotificationDestination() {
  const params = new URLSearchParams(window.location.search);
  const khanqahId = params.get('khanqah');
  const section = params.get('section');

  if (!khanqahId) {
    return null;
  }

  return {
    khanqahId,
    section
  };
}

function scrollToSection(section) {
  if (!section) {
    return;
  }

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      document
        .getElementById(section)
        ?.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
    });
  });
}

function applySharedLogo() {
  if (
    brandLogo &&
    siteConfig?.logo
  ) {
    brandLogo.src =
      siteConfig.logo;
  }
}

async function activateMasjid(id, options = {}) {
  const masjid =
    masjidsConfig?.masjids?.[id];

  if (!masjid) {
    return;
  }

  currentMasjidId = id;

  stopPrayerTimes();
  stopDhikr();

  applyMasjidContent(masjid, siteConfig);

  /*
   * The logo is shared across all Khanqahs,
   * so re-apply it after the Khanqah content
   * in case masjid.js changes the image src.
   */
  applySharedLogo();

  hideMasjidSelector();

  await initTimetable(
    masjid
  );

  initPrayerTimes(
    masjid
  );

  initDhikr(
    siteConfig.dhikr
  );

  await setPosterKhanqah(
    masjid
  );

  if (
    options.scrollToTop !==
    false
  ) {
    window.scrollTo({
      top: 0,
      behavior: 'instant'
    });
  }
}

function showSelector() {
  stopPrayerTimes();
  stopDhikr();

  showGlobalPosterOnly();

  createMasjidSelector(
    masjidsConfig,
    async id => {
      history.pushState(
        {
          view: 'khanqah',
          khanqahId: id
        },
        '',
        window.location.pathname
      );

      await activateMasjid(
        id
      );
    },
    currentMasjidId,
    siteConfig
  );

  showMasjidSelector();
  refreshNoticeTicker();
}

function changeMasjid() {
  history.pushState(
    {
      view: 'selector'
    },
    '',
    window.location.pathname
  );

  showSelector();
}

function setupHistory() {
  history.replaceState(
    {
      view: 'selector'
    },
    '',
    window.location.pathname
  );

  window.addEventListener(
    'popstate',
    event => {
      const state =
        event.state;

      if (
        state?.view ===
          'khanqah' &&
        state?.khanqahId &&
        masjidsConfig
          ?.masjids?.[
            state.khanqahId
          ]
      ) {
        activateMasjid(
          state.khanqahId
        );

        return;
      }

      showSelector();
    }
  );
}

async function boot() {
  try {
    [
      masjidsConfig,
      siteConfig
    ] = await Promise.all([
      loadJson(
        MASJIDS_CONFIG_URL
      ),
      loadJson(
        SITE_CONFIG_URL
      )
    ]);

    applySharedLogo();

    initNavigation(
      changeMasjid
    );

    initSharedBanner(
      siteConfig.sharedBanner
    );

    initPresence(
      siteConfig.livePresenceUrl
    );

    await initNotifications();

    await initPoster(
      siteConfig.poster
    );

    /*
     * Read the notification destination
     * before setupHistory() removes the
     * query string from the URL.
     */
    const notificationDestination =
      getNotificationDestination();

    setupHistory();

    if (
      notificationDestination &&
      masjidsConfig
        .masjids?.[
          notificationDestination
            .khanqahId
        ]
    ) {
      history.pushState(
        {
          view: 'khanqah',
          khanqahId:
            notificationDestination
              .khanqahId
        },
        '',
        window.location.pathname
      );

      await activateMasjid(
        notificationDestination
          .khanqahId,
        {
          scrollToTop: false
        }
      );

      scrollToSection(
        notificationDestination
          .section
      );

      return;
    }

    createMasjidSelector(
      masjidsConfig,
      async id => {
        history.pushState(
          {
            view: 'khanqah',
            khanqahId: id
          },
          '',
          window.location.pathname
        );

        await activateMasjid(
          id
        );
      },
      null,
      siteConfig
    );

    showMasjidSelector();
  } catch (error) {
    console.error(
      'Unable to initialise website:',
      error
    );

    document.body.innerHTML = `
      <main class="fatal-error">
        <div>
          <h1>Unable to load the website</h1>
          <p>Please refresh the page.</p>
        </div>
      </main>
    `;
  }
}

boot();