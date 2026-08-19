const EXTENSIONS = [
  'png',
  'jpg',
  'jpeg',
  'webp',
  'gif',
  'avif',
  'pdf'
];

async function findTimetable(
  folder
) {
  const timestamp =
    Date.now();

  for (
    const extension
    of EXTENSIONS
  ) {
    const url =
      `${folder}/timetable.${extension}?v=${timestamp}`;

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
        ) &&
        !type.includes(
          'application/pdf'
        )
      ) {
        continue;
      }

      return {
        url,
        filename:
          `timetable.${extension}`
      };
    } catch {
    }
  }

  return null;
}

export async function initTimetable(
  masjid
) {
  const links =
    document.querySelectorAll(
      '[data-timetable-download]'
    );

  const navItem =
    document.querySelector(
      '[data-timetable-nav-item]'
    );

  links.forEach(link => {
    link.href = '#';
    link.removeAttribute(
      'download'
    );

    link.setAttribute(
      'aria-disabled',
      'true'
    );

    link.hidden = false;
  });

  const folder =
    masjid.assets?.folder;

  if (!folder) {
    links.forEach(
      link => {
        link.hidden = true;
      }
    );

    if (navItem) {
      navItem.hidden = true;
    }

    return;
  }

  const timetable =
    await findTimetable(
      folder
    );

  if (!timetable) {
    links.forEach(
      link => {
        link.hidden = true;
      }
    );

    if (navItem) {
      navItem.hidden = true;
    }

    return;
  }

  if (navItem) {
    navItem.hidden = false;
  }

  links.forEach(link => {
    link.hidden = false;
    link.href =
      timetable.url;

    link.setAttribute(
      'download',
      timetable.filename
    );

    link.removeAttribute(
      'aria-disabled'
    );
  });
}
