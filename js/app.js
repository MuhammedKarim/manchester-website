import { initNavigation } from './navigation.js';
import {
  createMasjidSelector,
  showMasjidSelector,
  hideMasjidSelector
} from './selector.js';
import { applyMasjidContent } from './masjid.js';
import {
  initPrayerTimes,
  stopPrayerTimes
} from './prayer-times.js';
import {
  initDhikr,
  stopDhikr
} from './dhikr.js';
import { initPoster } from './poster.js';
import { initTimetable } from './timetable.js';
import { initPresence } from './presence.js';
import { initSharedBanner } from './shared.js';
import {
  initContactForm,
  setContactFormKhanqah
} from './contact-form.js';

const MASJIDS_CONFIG_URL =
  'data/masjids.json';

const CONFIG_URL =
  'data/config.json';

let masjidsConfig = null;
let siteConfig = null;
let currentMasjidId = null;

async function loadJson(url) {
  const response =
    await fetch(
      `${url}?v=${Date.now()}`,
      {
        cache: 'no-store'
      }
    );

  if (!response.ok) {
    throw new Error(
      `${url} failed with HTTP ${response.status}`
    );
  }

  return response.json();
}

function getSavedMasjid() {
  try {
    return localStorage.getItem(
      'selectedMasjid'
    );
  } catch {
    return null;
  }
}

function saveMasjid(id) {
  try {
    localStorage.setItem(
      'selectedMasjid',
      id
    );
  } catch {
  }
}

function getCleanUrl() {
  return (
    window.location.pathname +
    window.location.search
  );
}

function replaceHistoryState(state) {
  history.replaceState(
    state,
    '',
    getCleanUrl()
  );
}

function pushHistoryState(state) {
  history.pushState(
    state,
    '',
    getCleanUrl()
  );
}

function showSelector({
  pushHistory = false
} = {}) {
  stopPrayerTimes();
  stopDhikr();

  if (pushHistory) {
    pushHistoryState({
      view: 'selector'
    });
  } else {
    replaceHistoryState({
      view: 'selector'
    });
  }

  createMasjidSelector(
    masjidsConfig,
    activateMasjid,
    getSavedMasjid(),
    siteConfig
  );

  showMasjidSelector();

  window.scrollTo({
    top: 0,
    behavior: 'instant'
  });
}

async function activateMasjid(
  id,
  {
    pushHistory = true
  } = {}
) {
  const masjid =
    masjidsConfig
      ?.masjids
      ?.[id];

  if (!masjid) {
    return;
  }

  currentMasjidId = id;
  saveMasjid(id);

  if (pushHistory) {
    pushHistoryState({
      view: 'khanqah',
      khanqahId: id
    });
  } else {
    replaceHistoryState({
      view: 'khanqah',
      khanqahId: id
    });
  }

  stopPrayerTimes();
  stopDhikr();

  applyMasjidContent(
    masjid,
    siteConfig
  );

  setContactFormKhanqah(
    id
  );

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

  window.scrollTo({
    top: 0,
    behavior: 'instant'
  });
}

function changeMasjid() {
  showSelector({
    pushHistory: true
  });
}

function handlePopState(event) {
  const state =
    event.state;

  if (
    state?.view === 'khanqah' &&
    state.khanqahId &&
    masjidsConfig
      ?.masjids
      ?.[state.khanqahId]
  ) {
    activateMasjid(
      state.khanqahId,
      {
        pushHistory: false
      }
    );

    return;
  }

  showSelector({
    pushHistory: false
  });
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
        CONFIG_URL
      )
    ]);

    initNavigation(
      changeMasjid
    );

    initSharedBanner(
      siteConfig.sharedBanner
    );

    const logo =
      document.querySelector(
        '[data-masjid-logo]'
      );

    if (logo) {
      logo.src =
        siteConfig.logo ||
        '';

      logo.alt = '';
    }

    initPresence(
      siteConfig.livePresenceUrl
    );

    initPoster(
      siteConfig.poster
    );

    initContactForm(
      siteConfig.contactForm
    );

    window.addEventListener(
      'popstate',
      handlePopState
    );

    showSelector({
      pushHistory: false
    });
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
