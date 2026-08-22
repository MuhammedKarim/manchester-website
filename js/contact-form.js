const formCard =
  document.querySelector(
    '[data-contact-form-card]'
  );

const form =
  document.querySelector(
    '[data-contact-form]'
  );

const submitButton =
  document.querySelector(
    '[data-contact-submit]'
  );

const status =
  document.querySelector(
    '[data-contact-form-status]'
  );

const turnstileContainer =
  document.querySelector(
    '[data-contact-turnstile]'
  );

let currentKhanqahId = null;
let config = null;
let widgetId = null;
let turnstileToken = '';

function setStatus(
  message,
  type = ''
) {
  if (!status) {
    return;
  }

  status.textContent =
    message;

  status.classList.remove(
    'is-success',
    'is-error'
  );

  if (type) {
    status.classList.add(
      `is-${type}`
    );
  }
}

function renderTurnstile() {
  if (
    !turnstileContainer ||
    !config?.turnstileSiteKey
  ) {
    return;
  }

  const attempt =
    () => {
      if (!window.turnstile) {
        setTimeout(
          attempt,
          100
        );

        return;
      }

      if (widgetId !== null) {
        window.turnstile.remove(
          widgetId
        );
      }

      turnstileContainer.innerHTML =
        '';

      widgetId =
        window.turnstile.render(
          turnstileContainer,
          {
            sitekey:
              config
                .turnstileSiteKey,

            theme: 'dark',

            callback(token) {
              turnstileToken =
                token;
            },

            'expired-callback'() {
              turnstileToken =
                '';
            },

            'error-callback'() {
              turnstileToken =
                '';

              setStatus(
                'Unable to complete the security check.',
                'error'
              );
            }
          }
        );
    };

  attempt();
}

function resetTurnstile() {
  turnstileToken = '';

  if (
    window.turnstile &&
    widgetId !== null
  ) {
    window.turnstile.reset(
      widgetId
    );
  }
}

export function initContactForm(
  contactConfig
) {
  config =
    contactConfig;

  renderTurnstile();
}

export function setContactFormKhanqah(
  id
) {
  currentKhanqahId =
    id;

  formCard.hidden =
    false;

  form?.reset();

  setStatus('');

  resetTurnstile();
}

form?.addEventListener(
  'submit',
  async event => {
    event.preventDefault();

    if (
      !currentKhanqahId ||
      !config?.endpoint
    ) {
      setStatus(
        'The contact form is currently unavailable.',
        'error'
      );

      return;
    }

    if (!form.checkValidity()) {
      form.reportValidity();

      return;
    }

    const formData =
      new FormData(form);

    if (
      String(
        formData.get(
          'website'
        ) || ''
      ).trim()
    ) {
      form.reset();

      setStatus(
        'Your message has been sent.',
        'success'
      );

      return;
    }

    if (!turnstileToken) {
      setStatus(
        'Please complete the security check.',
        'error'
      );

      return;
    }

    const payload = {
      khanqahId:
        currentKhanqahId,

      name:
        String(
          formData.get(
            'name'
          ) || ''
        ).trim(),

      phone:
        String(
          formData.get(
            'phone'
          ) || ''
        ).trim(),

      email:
        String(
          formData.get(
            'email'
          ) || ''
        ).trim(),

      subject:
        String(
          formData.get(
            'subject'
          ) || ''
        ).trim(),

      message:
        String(
          formData.get(
            'message'
          ) || ''
        ).trim(),

      turnstileToken
    };

    submitButton.disabled =
      true;

    submitButton.textContent =
      'Sending…';

    setStatus(
      'Sending your message…'
    );

    try {
      const response =
        await fetch(
          config.endpoint,
          {
            method: 'POST',

            headers: {
              'Content-Type':
                'application/json'
            },

            body:
              JSON.stringify(
                payload
              )
          }
        );

      const result =
        await response
          .json()
          .catch(
            () => ({})
          );

      if (!response.ok) {
        throw new Error(
          result.error ||
          'Unable to send message.'
        );
      }

      form.reset();

      setStatus(
        'Your message has been sent successfully.',
        'success'
      );

      resetTurnstile();
    } catch (error) {
      console.error(
        'Contact form error:',
        error
      );

      setStatus(
        error.message ||
        'Unable to send your message. Please try again.',
        'error'
      );

      resetTurnstile();
    } finally {
      submitButton.disabled =
        false;

      submitButton.textContent =
        'Send Message';
    }
  }
);