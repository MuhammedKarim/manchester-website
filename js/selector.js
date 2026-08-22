const selector =
  document.querySelector(
    '[data-masjid-selector]'
  );

const grid =
  document.querySelector(
    '[data-masjid-selector-grid]'
  );

const title =
  document.querySelector(
    '[data-selector-title]'
  );

const country =
  document.querySelector(
    '[data-selector-country]'
  );

const intro =
  document.querySelector(
    '[data-selector-intro]'
  );

const siteShell =
  document.querySelector(
    '[data-site-shell]'
  );

export function createMasjidSelector(
  config,
  onSelect,
  currentId,
  siteConfig
) {
  if (
    !selector ||
    !grid
  ) {
    return;
  }

  title.textContent =
    (
      siteConfig?.siteName ||
      'Khanqah Naqshbandia Mujaddidia'
    ).toUpperCase();

  if (country) {
    country.textContent =
      siteConfig?.selectorCountry ||
      'UNITED KINGDOM';
  }

  intro.textContent =
    'Select a Khanqah below';

  grid.innerHTML =
    Object.entries(
      config.masjids || {}
    )
      .map(
        ([id, masjid]) => `
          <button
            class="masjid-choice"
            type="button"
            data-select-masjid="${id}"
          >
            <span class="masjid-choice-media">
              <img
                src="${masjid.selectorImage || ''}"
                alt=""
                data-selector-image
              >

              ${
                masjid.comingSoon === true
                  ? '<span class="masjid-choice-coming-soon">Coming Soon</span>'
                  : ''
              }

              ${
                currentId === id
                  ? '<span class="masjid-choice-current">Selected</span>'
                  : ''
              }
            </span>

            <span class="masjid-choice-copy">
              <span class="masjid-choice-location">
                ${masjid.location || ''}
              </span>
            </span>
          </button>
        `
      )
      .join('');

  grid
    .querySelectorAll(
      '[data-selector-image]'
    )
    .forEach(image => {
      image.addEventListener(
        'error',
        () => {
          image.hidden = true;
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
            button.dataset
              .selectMasjid
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
