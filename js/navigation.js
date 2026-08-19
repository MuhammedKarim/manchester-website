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

  navMenu?.addEventListener(
    'click',
    event => {
      if (
        event.target.matches('a')
      ) {
        navMenu.classList.remove(
          'is-open'
        );

        navToggle?.setAttribute(
          'aria-expanded',
          'false'
        );
      }
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
          navMenu?.classList.remove(
            'is-open'
          );

          navToggle?.setAttribute(
            'aria-expanded',
            'false'
          );

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
        navMenu.classList.remove(
          'is-open'
        );

        navToggle?.setAttribute(
          'aria-expanded',
          'false'
        );

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
