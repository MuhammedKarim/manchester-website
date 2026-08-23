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

function getEnabledCount(id) {
  const preferences =
    getKhanqahPreferences(id);

  return [
    preferences.announcements,
    preferences.prayerChanges
  ].filter(Boolean).length;
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

function updateNotificationSummary(
  wrapper,
  id
) {
  const count =
    getEnabledCount(id);

  const trigger =
    wrapper.querySelector(
      '[data-notification-toggle]'
    );

  const countElement =
    wrapper.querySelector(
      '[data-notification-count]'
    );

  if (!trigger) {
    return;
  }

  trigger.classList.toggle(
    'has-notifications',
    count > 0
  );

  if (countElement) {
    countElement.textContent =
      count > 0
        ? `${count} enabled`
        : '';

    countElement.hidden =
      count === 0;
  }
}

function closeOtherPanels(
  currentWrapper
) {
  grid
    .querySelectorAll(
      '.masjid-choice-wrapper'
    )
    .forEach(wrapper => {
      if (
        wrapper ===
        currentWrapper
      ) {
        return;
      }

      const panel =
        wrapper.querySelector(
          '[data-notification-panel]'
        );

      const trigger =
        wrapper.querySelector(
          '[data-notification-toggle]'
        );

      if (panel) {
        panel.hidden = true;
      }

      trigger?.setAttribute(
        'aria-expanded',
        'false'
      );
    });
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

        const enabledCount =
          getEnabledCount(id);

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
              </span>
            </button>

            <div class="khanqah-notifications">
              <button
                class="khanqah-notifications-toggle ${
                  enabledCount > 0
                    ? 'has-notifications'
                    : ''
                }"
                type="button"
                data-notification-toggle
                aria-expanded="false"
                aria-controls="notifications-${id}"
              >
                <span class="khanqah-notifications-toggle-main">
                  ${bellIcon()}
                  <span>Notifications</span>
                </span>

                <span class="khanqah-notifications-toggle-right">
                  <span
                    class="khanqah-notifications-count"
                    data-notification-count
                    ${enabledCount === 0 ? 'hidden' : ''}
                  >
                    ${
                      enabledCount > 0
                        ? `${enabledCount} enabled`
                        : ''
                    }
                  </span>

                  <span
                    class="khanqah-notifications-chevron"
                    aria-hidden="true"
                  >
                    ▾
                  </span>
                </span>
              </button>

              <div
                class="khanqah-notifications-panel"
                id="notifications-${id}"
                data-notification-panel
                hidden
              >
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
      '[data-notification-toggle]'
    )
    .forEach(trigger => {
      trigger.addEventListener(
        'click',
        event => {
          event.stopPropagation();

          const wrapper =
            trigger.closest(
              '.masjid-choice-wrapper'
            );

          const panel =
            wrapper?.querySelector(
              '[data-notification-panel]'
            );

          if (
            !wrapper ||
            !panel
          ) {
            return;
          }

          const opening =
            panel.hidden;

          closeOtherPanels(
            wrapper
          );

          panel.hidden =
            !opening;

          trigger.setAttribute(
            'aria-expanded',
            String(opening)
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

          updateNotificationSummary(
            wrapper,
            id
          );
        }
      );
    });

  document.addEventListener(
    'keydown',
    event => {
      if (
        event.key !==
        'Escape'
      ) {
        return;
      }

      grid
        .querySelectorAll(
          '[data-notification-panel]'
        )
        .forEach(panel => {
          panel.hidden = true;
        });

      grid
        .querySelectorAll(
          '[data-notification-toggle]'
        )
        .forEach(trigger => {
          trigger.setAttribute(
            'aria-expanded',
            'false'
          );
        });
    }
  );
}

export function showMasjidSelector() {
  if (!selector) {
    return;
  }

  selector.hidden = false;
  siteShell.hidden = true;

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

  document.body
    .classList
    .remove(
      'selector-open'
    );
}