const EXTENSIONS = [
  'png',
  'jpg',
  'jpeg',
  'webp',
  'gif',
  'avif'
];

const banner =
  document.querySelector(
    '[data-notice-banner]'
  );

const modal =
  document.querySelector(
    '[data-poster-modal]'
  );

const image =
  document.querySelector(
    '[data-poster-image]'
  );

const openButton =
  document.querySelector(
    '[data-poster-open]'
  );

const closeButtons =
  document.querySelectorAll(
    '[data-poster-close]'
  );

let lastFocused = null;

function openPoster() {
  if (
    !modal ||
    !image?.getAttribute(
      'src'
    )
  ) {
    return;
  }

  lastFocused =
    document.activeElement;

  modal.hidden = false;

  document.body
    .classList
    .add(
      'poster-open'
    );

  modal
    .querySelector(
      '.poster-modal-close'
    )
    ?.focus();
}

function closePoster() {
  if (!modal) {
    return;
  }

  modal.hidden = true;

  document.body
    .classList
    .remove(
      'poster-open'
    );

  lastFocused?.focus();
}

function resetPoster() {
  image?.removeAttribute(
    'src'
  );

  if (banner) {
    banner.hidden = true;
  }

  if (modal) {
    modal.hidden = true;
  }

  document.body
    .classList
    .remove(
      'has-notice',
      'poster-open'
    );
}

async function findPoster(
  folder,
  timestamp
) {
  for (
    const extension
    of EXTENSIONS
  ) {
    const url =
      `${folder}/poster.${extension}?v=${timestamp}`;

    try {
      const response =
        await fetch(
          url,
          {
            cache:
              'no-store'
          }
        );

      if (!response.ok) {
        continue;
      }

      const type =
        (
          response.headers
            .get(
              'content-type'
            ) || ''
        ).toLowerCase();

      if (
        !type.startsWith(
          'image/'
        )
      ) {
        continue;
      }

      return url;
    } catch {
    }
  }

  return null;
}

export async function initPoster(
  config
) {
  resetPoster();

  const controlUrl =
    config?.controlUrl;

  const folder =
    config?.folder;

  if (
    !controlUrl ||
    !folder
  ) {
    return;
  }

  try {
    const timestamp =
      Date.now();

    const response =
      await fetch(
        `${controlUrl}?v=${timestamp}`,
        {
          cache:
            'no-store'
        }
      );

    if (!response.ok) {
      return;
    }

    const control =
      JSON.parse(
        await response.text()
      );

    if (
      control.active !== true
    ) {
      return;
    }

    const posterUrl =
      await findPoster(
        folder,
        timestamp
      );

    if (!posterUrl) {
      return;
    }

    image.src =
      posterUrl;

    banner.hidden =
      false;

    document.body
      .classList
      .add(
        'has-notice'
      );

    openPoster();
  } catch (error) {
    console.error(
      'Unable to load poster:',
      error
    );

    resetPoster();
  }
}

openButton?.addEventListener(
  'click',
  openPoster
);

closeButtons.forEach(
  button => {
    button.addEventListener(
      'click',
      closePoster
    );
  }
);

document.addEventListener(
  'keydown',
  event => {
    if (
      event.key ===
        'Escape' &&
      modal &&
      !modal.hidden
    ) {
      closePoster();
    }
  }
);
