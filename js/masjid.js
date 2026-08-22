function setText(
  selector,
  value = ''
) {
  document
    .querySelectorAll(
      selector
    )
    .forEach(element => {
      element.textContent =
        value;
    });
}

function setSectionVisibility(
  section,
  visible
) {
  if (section) {
    section.hidden =
      !visible;
  }
}

async function copyValue(
  button,
  value
) {
  if (!value) {
    return;
  }

  const originalLabel =
    button.getAttribute(
      'aria-label'
    );

  try {
    await navigator.clipboard
      .writeText(value);

    button.classList.add(
      'is-copied'
    );

    button.setAttribute(
      'aria-label',
      'Copied'
    );
  } catch {
    button.setAttribute(
      'aria-label',
      'Copy failed'
    );
  }

  setTimeout(
    () => {
      button.classList.remove(
        'is-copied'
      );

      button.setAttribute(
        'aria-label',
        originalLabel ||
        'Copy'
      );
    },
    1600
  );
}

export function applyMasjidContent(
  masjid,
  siteConfig
) {
  const siteName =
    siteConfig?.siteName ||
    'Khanqah Naqshbandia Mujaddidia';

  document.title =
    `${siteName} | ${masjid.location}`;

  setText(
    '[data-brand-name]',
    siteName
  );

  setText(
    '[data-brand-location]',
    masjid.location
  );

  setText(
    '[data-hero-name]',
    siteName
  );

  setText(
    '[data-hero-location]',
    masjid.location
  );

  setText(
    '[data-location-name]',
    siteName
  );

  const comingSoon =
    document.querySelector(
      '[data-hero-coming-soon]'
    );

  if (comingSoon) {
    comingSoon.hidden =
      masjid.comingSoon !== true;
  }

  setText(
    '[data-about-eyebrow]',
    masjid.about?.eyebrow ||
      'About us'
  );

  setText(
    '[data-about-title]',
    masjid.about?.title ||
      ''
  );

  setText(
    '[data-opening-hours]',
    masjid.openingHours ||
      ''
  );

  setText(
    '[data-bank-account-name]',
    masjid.donation?.accountName ||
      ''
  );

  setText(
    '[data-bank-name]',
    masjid.donation?.bank ||
      ''
  );

  setText(
    '[data-bank-sort-code]',
    masjid.donation?.sortCode ||
      ''
  );

  setText(
    '[data-bank-account-number]',
    masjid.donation
      ?.accountNumber ||
      ''
  );

  document
    .querySelectorAll(
      '[data-copy-bank]'
    )
    .forEach(button => {
      const field =
        button.dataset.copyBank;

      button.onclick =
        () => {
          const value =
            masjid.donation
              ?.[field] ||
            '';

          copyValue(
            button,
            value
          );
        };
    });

  const aboutCopy =
    document.querySelector(
      '[data-about-copy]'
    );

  if (aboutCopy) {
    aboutCopy.innerHTML =
      (
        masjid.about
          ?.paragraphs ||
        []
      )
        .map(
          text =>
            `<p>${text}</p>`
        )
        .join('');
  }

  const facilities =
    document.querySelector(
      '[data-facilities]'
    );

  if (facilities) {
    const items =
      masjid.facilities ||
      [];

    facilities.innerHTML =
      items.length
        ? items
            .map(
              item => `
                <article class="facility-card reveal is-visible">
                  <h3>${item.name}</h3>
                  <p>${item.description}</p>
                </article>
              `
            )
            .join('')
        : `
          <p class="muted centered">
            Facility information will be added soon.
          </p>
        `;
  }

  const donationEnabled =
    masjid.donation
      ?.enabled === true;

  setSectionVisibility(
    document.getElementById(
      'donate'
    ),
    donationEnabled
  );

  const donateNavItem =
    document.querySelector(
      '[data-donate-nav-item]'
    );

  if (donateNavItem) {
    donateNavItem.hidden =
      !donationEnabled;
  }

  const donateButton =
    document.querySelector(
      '[data-donate-button]'
    );

  if (donateButton) {
    donateButton.hidden =
      !donationEnabled;
  }

  const address =
    document.querySelector(
      '[data-location-address]'
    );

  if (address) {
    address.innerHTML =
      (
        masjid.address
          ?.display ||
        []
      ).join('<br>');
  }

  const copyAddressButton =
    document.querySelector(
      '.copy-address-button'
    );

  if (copyAddressButton) {
    copyAddressButton.dataset
      .copyAddress =
      masjid.address?.copy ||
      '';

    copyAddressButton.onclick =
      async () => {
        const value =
          copyAddressButton
            .dataset
            .copyAddress;

        if (!value) {
          return;
        }

        const originalText =
          copyAddressButton
            .textContent;

        try {
          await navigator
            .clipboard
            .writeText(value);

          copyAddressButton
            .textContent =
            'Copied';
        } catch {
          copyAddressButton
            .textContent =
            'Copy failed';
        }

        setTimeout(
          () => {
            copyAddressButton
              .textContent =
              originalText;
          },
          1600
        );
      };
  }

  const map =
    document.querySelector(
      '[data-map-frame]'
    );

  if (map) {
    map.src =
      masjid.address
        ?.mapEmbedUrl ||
      'about:blank';

    map.title =
      `Location of ${siteName} ${masjid.location}`;
  }

  const directions =
    document.querySelector(
      '[data-directions-link]'
    );

  if (directions) {
    const url =
      masjid.address
        ?.directionsUrl ||
      '';

    directions.href =
      url || '#';

    directions.hidden =
      !url;
  }

  const contactName =
    document.querySelector(
      '[data-contact-name]'
    );

  if (contactName) {
    contactName.textContent =
      masjid.contact?.name ||
      '';

    contactName.hidden =
      !masjid.contact?.name;
  }

  const phone =
    document.querySelector(
      '[data-contact-phone]'
    );

  if (phone) {
    const raw =
      masjid.contact?.phone ||
      '';

    phone.href =
      raw
        ? `tel:${raw}`
        : '#';

    phone.textContent =
      masjid.contact
        ?.displayPhone ||
      raw ||
      'Contact details coming soon';
  }

  const email =
    document.querySelector(
      '[data-contact-email]'
    );

  if (email) {
    const emailAddress =
      masjid.contact
        ?.email ||
      '';

    email.href =
      emailAddress
        ? `mailto:${emailAddress}`
        : '#';

    email.textContent =
      emailAddress;

    email.hidden =
      !emailAddress;
  }
}
