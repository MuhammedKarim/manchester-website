const EXTENSIONS = [
  'png',
  'jpg',
  'jpeg',
  'webp',
  'gif',
  'avif'
];

const banner = document.querySelector('[data-notice-banner]');
const noticeTrack = document.querySelector('[data-notice-track]');
const modal = document.querySelector('[data-poster-modal]');
const image = document.querySelector('[data-poster-image]');
const label = document.querySelector('[data-poster-label]');
const carousel = document.querySelector('[data-poster-carousel]');
const previousButton = document.querySelector('[data-poster-prev]');
const nextButton = document.querySelector('[data-poster-next]');
const footer = document.querySelector('[data-poster-footer]');
const dots = document.querySelector('[data-poster-dots]');
const count = document.querySelector('[data-poster-count]');
const openButton = document.querySelector('[data-poster-open]');
const closeButtons = document.querySelectorAll('[data-poster-close]');

let globalPoster = null;
let localPoster = null;
let activePosters = [];
let currentIndex = 0;
let lastFocused = null;
let touchStartX = null;

function createNoticeTrack(text) {
  if (!noticeTrack) {
    return;
  }

  noticeTrack.innerHTML = '';

  for (let i = 0; i < 8; i += 1) {
    const span = document.createElement('span');

    span.textContent = text;

    if (i >= 4) {
      span.setAttribute('aria-hidden', 'true');
    }

    noticeTrack.appendChild(span);
  }
}

function updateBanner() {
  if (!banner) {
    return;
  }

  const numberOfNotices = activePosters.length;

  if (numberOfNotices === 0) {
    banner.hidden = true;
    document.body.classList.remove('has-notice');
    return;
  }

  banner.hidden = false;
  document.body.classList.add('has-notice');

  const text =
    numberOfNotices === 1
      ? 'IMPORTANT NOTICE - CLICK TO OPEN'
      : `${numberOfNotices} IMPORTANT NOTICES - CLICK TO OPEN`;

  createNoticeTrack(text);
}

async function findPoster(folder, timestamp) {
  if (!folder) {
    return null;
  }

  for (const extension of EXTENSIONS) {
    const url = `${folder}/poster.${extension}?v=${timestamp}`;

    try {
      const response = await fetch(url, {
        cache: 'no-store'
      });

      if (!response.ok) {
        continue;
      }

      const type = (
        response.headers.get('content-type') || ''
      ).toLowerCase();

      if (!type.startsWith('image/')) {
        continue;
      }

      return url;
    } catch {
    }
  }

  return null;
}

async function loadPoster({
  controlUrl,
  folder,
  type,
  labelText
}) {
  if (!controlUrl || !folder) {
    return null;
  }

  try {
    const timestamp = Date.now();

    const response = await fetch(
      `${controlUrl}?v=${timestamp}`,
      {
        cache: 'no-store'
      }
    );

    if (!response.ok) {
      return null;
    }

    const contentType = (
      response.headers.get('content-type') || ''
    ).toLowerCase();

    if (!contentType.includes('application/json')) {
      return null;
    }

    const control = await response.json();

    if (control.active !== true) {
      return null;
    }

    const posterUrl = await findPoster(
      folder,
      timestamp
    );

    if (!posterUrl) {
      return null;
    }

    return {
      type,
      label: labelText,
      url: posterUrl
    };
  } catch (error) {
    console.error(
      `Unable to load ${type} poster:`,
      error
    );

    return null;
  }
}

function rebuildActivePosters() {
  activePosters = [];

  if (localPoster) {
    activePosters.push(localPoster);
  }

  if (globalPoster) {
    activePosters.push(globalPoster);
  }

  if (currentIndex >= activePosters.length) {
    currentIndex = 0;
  }

  updateBanner();
}

function renderDots() {
  if (!dots) {
    return;
  }

  dots.innerHTML = '';

  activePosters.forEach((poster, index) => {
    const dot = document.createElement('button');

    dot.type = 'button';
    dot.className = 'poster-carousel-dot';

    dot.classList.toggle(
      'is-active',
      index === currentIndex
    );

    dot.setAttribute(
      'aria-label',
      `Open notice ${index + 1}`
    );

    dot.addEventListener('click', () => {
      currentIndex = index;
      renderPoster();
    });

    dots.appendChild(dot);
  });
}

function renderPoster() {
  if (activePosters.length === 0) {
    return;
  }

  const poster = activePosters[currentIndex];

  if (!poster) {
    return;
  }

  if (image) {
    image.src = poster.url;
    image.alt = poster.label || 'Important notice';
  }

  if (label) {
    label.textContent = poster.label || '';
    label.hidden = !poster.label;
  }

  const multiple = activePosters.length > 1;

  if (previousButton) {
    previousButton.hidden = !multiple;
  }

  if (nextButton) {
    nextButton.hidden = !multiple;
  }

  if (footer) {
    footer.hidden = !multiple;
  }

  if (count) {
    count.textContent = `Notice ${currentIndex + 1} of ${activePosters.length}`;
  }

  renderDots();
}

function nextPoster() {
  if (activePosters.length <= 1) {
    return;
  }

  currentIndex =
    (currentIndex + 1) %
    activePosters.length;

  renderPoster();
}

function previousPoster() {
  if (activePosters.length <= 1) {
    return;
  }

  currentIndex =
    (
      currentIndex -
      1 +
      activePosters.length
    ) %
    activePosters.length;

  renderPoster();
}

function openPoster() {
  if (
    !modal ||
    activePosters.length === 0
  ) {
    return;
  }

  lastFocused = document.activeElement;

  renderPoster();

  modal.hidden = false;
  document.body.classList.add('poster-open');

  modal
    .querySelector('.poster-modal-close')
    ?.focus();
}

function closePoster() {
  if (!modal) {
    return;
  }

  modal.hidden = true;
  document.body.classList.remove('poster-open');

  lastFocused?.focus();
}

export async function initPoster(config) {
  globalPoster = null;
  localPoster = null;
  activePosters = [];
  currentIndex = 0;

  if (!config) {
    rebuildActivePosters();
    return;
  }

  globalPoster = await loadPoster({
    controlUrl: config.controlUrl,
    folder: config.folder,
    type: 'global',
    labelText: 'General Notice'
  });

  rebuildActivePosters();

  if (globalPoster) {
    openPoster();
  }
}

export async function setPosterKhanqah(masjid) {
  localPoster = null;

  const folder = masjid?.assets?.folder;

  if (!folder) {
    currentIndex = 0;
    rebuildActivePosters();
    return;
  }

  const location =
    masjid.location ||
    'Khanqah';

  localPoster = await loadPoster({
    controlUrl: `${folder}/poster.json`,
    folder,
    type: 'local',
    labelText: `${location} Khanqah Notice`
  });

  currentIndex = 0;

  rebuildActivePosters();

  if (localPoster) {
    openPoster();
  }
}

export function showGlobalPosterOnly() {
  localPoster = null;
  currentIndex = 0;

  rebuildActivePosters();

  if (
    modal &&
    !modal.hidden
  ) {
    renderPoster();
  }
}

openButton?.addEventListener(
  'click',
  openPoster
);

previousButton?.addEventListener(
  'click',
  previousPoster
);

nextButton?.addEventListener(
  'click',
  nextPoster
);

closeButtons.forEach(button => {
  button.addEventListener(
    'click',
    closePoster
  );
});

document.addEventListener(
  'keydown',
  event => {
    if (
      !modal ||
      modal.hidden
    ) {
      return;
    }

    if (event.key === 'Escape') {
      closePoster();
      return;
    }

    if (event.key === 'ArrowRight') {
      nextPoster();
      return;
    }

    if (event.key === 'ArrowLeft') {
      previousPoster();
    }
  }
);

carousel?.addEventListener(
  'touchstart',
  event => {
    touchStartX =
      event.touches[0]?.clientX ??
      null;
  },
  {
    passive: true
  }
);

carousel?.addEventListener(
  'touchend',
  event => {
    if (touchStartX === null) {
      return;
    }

    const touchEndX =
      event.changedTouches[0]?.clientX;

    if (typeof touchEndX !== 'number') {
      touchStartX = null;
      return;
    }

    const difference =
      touchEndX -
      touchStartX;

    const minimumSwipe = 45;

    if (difference <= -minimumSwipe) {
      nextPoster();
    } else if (difference >= minimumSwipe) {
      previousPoster();
    }

    touchStartX = null;
  },
  {
    passive: true
  }
);