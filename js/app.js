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

const MASJIDS_CONFIG_URL =
  'data/masjids.json';

const SITE_CONFIG_URL =
  'data/site.json';

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

function clearUrlFragment() {
  history.replaceState(
    history.state,
    '',
    getCleanUrl()
  );
}

function setSelectorHistoryState() {
  history.replaceState(
    {
      view: 'selector'
    },
    '',
    getCleanUrl()
  );
}

function pushSelectorHistoryState() {
  history.pushState(
    {
      view: 'selector'
    },
    '',
    getCleanUrl()
  );
}

function pushKhanqahHistoryState(id) {
  history.pushState(
    {
      view: 'khanqah',
      khanqahId: id
    },
    '',
    getCleanUrl()
  );
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
    pushKhanqahHistoryState(
      id
    );
  } else {
    clearUrlFragment();
  }

  stopPrayerTimes();
  stopDhikr();

  applyMasjidContent(
    masjid
  );

  hideMasjidSelector();

  clearUrlFragment();

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

function changeMasjid(
  {
    pushHistory = true
  } = {}
) {
  stopPrayerTimes();
  stopDhikr();

  if (pushHistory) {
    pushSelectorHistoryState();
  } else {
    clearUrlFragment();
  }

  createMasjidSelector(
    masjidsConfig,
    activateMasjid,
    currentMasjidId
  );

  showMasjidSelector();

  clearUrlFragment();

  window.scrollTo({
    top: 0,
    behavior: 'instant'
  });
}

function handlePopState(
  event
) {
  const state =
    event.state;

  clearUrlFragment();

  if (
    state?.view ===
      'khanqah' &&
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

  changeMasjid({
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
        SITE_CONFIG_URL
      )
    ]);

    clearUrlFragment();

    initNavigation(
      changeMasjid
    );

    initSharedBanner(
      siteConfig.sharedBanner
    );

    initPresence(
      siteConfig.livePresenceUrl
    );

    initPoster(
      siteConfig.poster
    );

    window.addEventListener(
      'popstate',
      handlePopState
    );

    const savedMasjid =
      getSavedMasjid();

    if (
      savedMasjid &&
      masjidsConfig
        .masjids
        ?.[savedMasjid]
    ) {
      setSelectorHistoryState();

      await activateMasjid(
        savedMasjid
      );

      return;
    }

    setSelectorHistoryState();

    createMasjidSelector(
      masjidsConfig,
      activateMasjid,
      null
    );

    showMasjidSelector();

    clearUrlFragment();
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