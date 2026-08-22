const header =
  document.querySelector(
    '[data-header]'
  );

const navToggle =
  document.querySelector(
    '[data-nav-toggle]'
  );

const navMenu =
  document.querySelector(
    '[data-nav-menu]'
  );

function setHeaderState() {
  header?.classList.toggle(
    'is-scrolled',
    window.scrollY > 12
  );
}

function closeMenu() {
  navMenu?.classList.remove(
    'is-open'
  );

  navToggle?.setAttribute(
    'aria-expanded',
    'false'
  );
}

function getCleanUrl() {
  return (
    window.location.pathname +
    window.location.search
  );
}

export function initNavigation(
  onChangeMasjid
) {
  navToggle?.addEventListener(
    'click',
    () => {
      const isOpen =
        navMenu?.classList.toggle(
          'is-open'
        ) ?? false;

      navToggle.setAttribute(
        'aria-expanded',
        String(isOpen)
      );
    }
  );

  document.addEventListener(
    'click',
    event => {
      const link =
        event.target.closest(
          'a[href^="#"]'
        );

      if (!link) {
        return;
      }

      const href =
        link.getAttribute(
          'href'
        );

      if (!href) {
        return;
      }

      event.preventDefault();
      closeMenu();

      if (href === '#') {
        return;
      }

      const target =
        document.querySelector(
          href
        );

      if (!target) {
        return;
      }

      target.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });

      history.replaceState(
        history.state,
        '',
        getCleanUrl()
      );
    }
  );

  document
    .querySelectorAll(
      '[data-change-masjid]'
    )
    .forEach(button => {
      button.addEventListener(
        'click',
        () => {
          closeMenu();
          onChangeMasjid();
        }
      );
    });

  document.addEventListener(
    'keydown',
    event => {
      if (
        event.key === 'Escape' &&
        navMenu?.classList.contains(
          'is-open'
        )
      ) {
        closeMenu();
        navToggle?.focus();
      }
    }
  );

  window.addEventListener(
    'scroll',
    setHeaderState,
    {
      passive: true
    }
  );

  setHeaderState();

  const revealItems =
    document.querySelectorAll(
      '.reveal'
    );

  if (
    'IntersectionObserver' in window
  ) {
    const observer =
      new IntersectionObserver(
        entries => {
          entries.forEach(
            entry => {
              if (
                entry.isIntersecting
              ) {
                entry.target
                  .classList
                  .add(
                    'is-visible'
                  );

                observer.unobserve(
                  entry.target
                );
              }
            }
          );
        },
        {
          threshold: 0.14
        }
      );

    revealItems.forEach(
      item => observer.observe(item)
    );
  } else {
    revealItems.forEach(
      item =>
        item.classList.add(
          'is-visible'
        )
    );
  }
}
