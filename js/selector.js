const selector = document.querySelector('[data-masjid-selector]');
const grid = document.querySelector('[data-masjid-selector-grid]');
const title = document.querySelector('[data-selector-title]');
const intro = document.querySelector('[data-selector-intro]');
const siteShell = document.querySelector('[data-site-shell]');

export function createMasjidSelector(
  config,
  onSelect,
  currentId
) {
  if (!selector || !grid) {
    return;
  }

  title.textContent =
    config.selectionTitle ||
    'Choose your Khanqah';

  intro.textContent =
    config.selectionIntro ||
    '';

  grid.innerHTML =
    Object.entries(
      config.masjids || {}
    )
      .map(([id, masjid]) => `
        <button
          class="masjid-choice"
          type="button"
          data-select-masjid="${id}"
        >
          ${
            currentId === id
              ? '<span class="masjid-choice-current">Selected</span>'
              : ''
          }

          <span class="masjid-choice-media">
            <img
              src="${masjid.selectorImage || ''}"
              alt=""
              data-selector-image
            >
          </span>

          <span class="masjid-choice-copy">
            <span class="masjid-choice-name">
              ${masjid.name || ''}
            </span>

            <span class="masjid-choice-location">
              ${masjid.location || ''}
            </span>
          </span>
        </button>
      `)
      .join('');

  grid
    .querySelectorAll(
      '[data-selector-image]'
    )
    .forEach(image => {
      image.addEventListener(
        'error',
        () => {
          const media =
            image.parentElement;

          image.remove();

          media.innerHTML =
            '<span class="masjid-choice-fallback">Khanqah</span>';
        },
        {
          once: true
        }
      );
    });

  grid
    .querySelectorAll(
      '[data-select-masjid]'
    )
    .forEach(button => {
      button.addEventListener(
        'click',
        () => {
          onSelect(
            button.dataset.selectMasjid
          );
        }
      );
    });
}

export function showMasjidSelector() {
  if (!selector) {
    return;
  }

  selector.hidden = false;
  siteShell.hidden = true;

  document.body.classList.add(
    'selector-open'
  );
}

export function hideMasjidSelector() {
  if (!selector) {
    return;
  }

  selector.hidden = true;
  siteShell.hidden = false;

  document.body.classList.remove(
    'selector-open'
  );
}
