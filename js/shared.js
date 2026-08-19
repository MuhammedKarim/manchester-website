export function initSharedBanner(
  config
) {
  const banner =
    document.querySelector(
      '[data-media-banner]'
    );

  const image =
    document.querySelector(
      '[data-media-banner-image]'
    );

  const topLink =
    document.querySelector(
      '[data-media-banner-top]'
    );

  const bottomLink =
    document.querySelector(
      '[data-media-banner-bottom]'
    );

  if (
    !banner ||
    !image ||
    !config?.image
  ) {
    if (banner) {
      banner.hidden = true;
    }

    return;
  }

  image.src =
    config.image;

  topLink.href =
    config.topUrl || '#';

  bottomLink.href =
    config.bottomUrl || '#';

  image.addEventListener(
    'error',
    () => {
      banner.hidden = true;
    },
    {
      once: true
    }
  );
}
