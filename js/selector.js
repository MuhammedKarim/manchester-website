import {
  enableNotifications,
  syncNotificationPreferences
} from './notifications.js';

const selector = document.querySelector('[data-masjid-selector]');
const grid = document.querySelector('[data-masjid-selector-grid]');
const title = document.querySelector('[data-selector-title]');
const intro = document.querySelector('[data-selector-intro]');
const country = document.querySelector('[data-selector-country]');
const siteShell = document.querySelector('[data-site-shell]');
const changeButton = document.querySelector('.floating-change-khanqah');

const STORAGE_KEY = 'khanqahNotificationPreferences';

function getNotificationPreferences() {
  try {
    return JSON.parse(
      localStorage.getItem(STORAGE_KEY) || '{}'
    );
  } catch {
    return {};
  }
}

function saveNotificationPreferences(preferences) {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(preferences)
    );
  } catch {
  }
}

function getKhanqahPreferences(id) {
  const preferences = getNotificationPreferences();

  return {
    announcements:
      preferences[id]?.announcements === true,

    prayerChanges:
      preferences[id]?.prayerChanges === true
  };
}

function setKhanqahPreference(
  id,
  type,
  enabled
) {
  const preferences = getNotificationPreferences();

  if (!preferences[id]) {
    preferences[id] = {
      announcements: false,
      prayerChanges: false
    };
  }

  preferences[id][type] =
    enabled;

  if (
    !preferences[id].announcements &&
    !preferences[id].prayerChanges
  ) {
    delete preferences[id];
  }

  saveNotificationPreferences(
    preferences
  );
}

function bellIcon() {
  return `
    <svg
      class="notification-bell-icon"
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"
        fill="none"
        stroke="currentColor"
        stroke-width="1.8"
        stroke-linecap="round"
        stroke-linejoin="round"
      ></path>
      <path
        d="M10 21h4"
        fill="none"
        stroke="currentColor"
        stroke-width="1.8"
        stroke-linecap="round"
      ></path>
    </svg>
  `;
}

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

  if (title) {
    title.textContent =
      siteConfig?.siteName ||
      'KHANQAH NAQSHBANDIA MUJADDIDIA';
  }

  if (country) {
    country.textContent =
      siteConfig?.selectorCountry ||
      'UNITED KINGDOM';
  }

  if (intro) {
    intro.textContent =
      'Select a Khanqah below';
  }

  grid.innerHTML =
    Object.entries(
      config.masjids || {}
    )
      .map(([id, masjid]) => {
        const preferences =
          getKhanqahPreferences(id);

        return `
          <article
            class="masjid-choice-wrapper"
            data-khanqah-card="${id}"
          >
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

              ${
                masjid.comingSoon === true
                  ? '<span class="masjid-choice-coming-soon">Coming Soon</span>'
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
                <span class="masjid-choice-location">
                  ${masjid.location || ''}
                </span>
                ${
                  masjid.name
                    ? `<span class="masjid-choice-name">${masjid.name}</span>`
                    : ''
                }
              </span>
            </button>

            <div class="khanqah-notifications">
              <div class="khanqah-notifications-heading">
                ${bellIcon()}
                <span>Notifications</span>
              </div>

              <div class="khanqah-notifications-panel">
                <label class="notification-option">
                  <span class="notification-option-copy">
                    <strong>Announcements</strong>
                  </span>

                  <span class="notification-switch">
                    <input
                      type="checkbox"
                      data-notification-setting="announcements"
                      ${preferences.announcements ? 'checked' : ''}
                    >
                    <span class="notification-switch-track" aria-hidden="true">
                      <span class="notification-switch-thumb"></span>
                    </span>
                  </span>
                </label>

                <label class="notification-option">
                  <span class="notification-option-copy">
                    <strong>Prayer Time Changes</strong>
                  </span>

                  <span class="notification-switch">
                    <input
                      type="checkbox"
                      data-notification-setting="prayerChanges"
                      ${preferences.prayerChanges ? 'checked' : ''}
                    >
                    <span class="notification-switch-track" aria-hidden="true">
                      <span class="notification-switch-thumb"></span>
                    </span>
                  </span>
                </label>
              </div>
            </div>
          </article>
        `;
      })
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

  grid
    .querySelectorAll(
      '[data-notification-setting]'
    )
    .forEach(input => {
      input.addEventListener(
        'change',
        async event => {
          event.stopPropagation();

          const wrapper =
            input.closest(
              '.masjid-choice-wrapper'
            );

          const id =
            wrapper?.dataset
              .khanqahCard;

          const type =
            input.dataset
              .notificationSetting;

          if (
            !wrapper ||
            !id ||
            !type
          ) {
            return;
          }

          setKhanqahPreference(
            id,
            type,
            input.checked
          );

          if (input.checked) {
            const enabled =
              await enableNotifications();

            if (!enabled) {
              input.checked = false;

              setKhanqahPreference(
                id,
                type,
                false
              );
            }
          }

          await syncNotificationPreferences()
            .catch(error => {
              console.error(
                'Unable to sync notification preferences:',
                error
              );
            });
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
  if (changeButton) changeButton.hidden = true;

  document.body
    .classList
    .add(
      'selector-open'
    );
}

export function hideMasjidSelector() {
  if (!selector) {
    return;
  }

  selector.hidden = true;
  siteShell.hidden = false;
  if (changeButton) changeButton.hidden = false;

  document.body
    .classList
    .remove(
      'selector-open'
    );
}
