function setText(
  selector,
  value = ''
) {
  document
    .querySelectorAll(
      selector
    )
    .forEach(
      element => {
        element.textContent =
          value;
      }
    );
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

export function applyMasjidContent(
  masjid
) {
  document.title =
    `${masjid.name} | ${masjid.location}`;

  setText(
    '[data-brand-name]',
    masjid.name
  );

  setText(
    '[data-brand-location]',
    masjid.location
  );

  setText(
    '[data-hero-name]',
    masjid.name
  );

  setText(
    '[data-hero-location]',
    masjid.location
  );

  setText(
    '[data-footer-name]',
    masjid.name
  );

  setText(
    '[data-location-name]',
    masjid.name
  );

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
    masjid.donation
      ?.accountName ||
      ''
  );

  setText(
    '[data-bank-name]',
    masjid.donation
      ?.bank ||
      ''
  );

  setText(
    '[data-bank-sort-code]',
    masjid.donation
      ?.sortCode ||
      ''
  );

  setText(
    '[data-bank-account-number]',
    masjid.donation
      ?.accountNumber ||
      ''
  );

  const logo =
    document.querySelector(
      '[data-masjid-logo]'
    );

  if (logo) {
    logo.src =
      masjid.logo ||
      '';

    logo.alt = '';
  }

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
          paragraph =>
            `<p>${paragraph}</p>`
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

  const copyButton =
    document.querySelector(
      '.copy-address-button'
    );

  if (copyButton) {
    copyButton.dataset
      .copyAddress =
      masjid.address
        ?.copy ||
      '';

    copyButton.onclick =
      async () => {
        const value =
          copyButton.dataset
            .copyAddress;

        if (!value) {
          return;
        }

        const originalText =
          copyButton.textContent;

        try {
          await navigator
            .clipboard
            .writeText(
              value
            );

          copyButton.textContent =
            'Copied';
        } catch {
          copyButton.textContent =
            'Copy failed';
        }

        setTimeout(
          () => {
            copyButton.textContent =
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
      `Location of ${masjid.name}`;
  }

  const directions =
    document.querySelector(
      '[data-directions-link]'
    );

  if (directions) {
    const directionsUrl =
      masjid.address
        ?.directionsUrl ||
      '';

    directions.href =
      directionsUrl ||
      '#';

    directions.hidden =
      !directionsUrl;
  }

  const contactName =
    document.querySelector(
      '[data-contact-name]'
    );

  if (contactName) {
    contactName.textContent =
      masjid.contact
        ?.name ||
      '';

    contactName.hidden =
      !masjid.contact
        ?.name;
  }

  const phone =
    document.querySelector(
      '[data-contact-phone]'
    );

  if (phone) {
    const rawNumber =
      masjid.contact
        ?.phone ||
      '';

    phone.href =
      rawNumber
        ? `tel:${rawNumber}`
        : '#';

    phone.textContent =
      masjid.contact
        ?.displayPhone ||
      rawNumber ||
      'Contact details coming soon';

    phone.hidden =
      false;
  }
}