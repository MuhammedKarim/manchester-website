const TURNSTILE_VERIFY_URL =
  'https://challenges.cloudflare.com/turnstile/v0/siteverify';

const RESEND_URL =
  'https://api.resend.com/emails';

const EMAIL_REGEX =
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function response(
  data,
  status = 200
) {
  return Response.json(
    data,
    {
      status,
      headers: {
        'Cache-Control':
          'no-store'
      }
    }
  );
}

function clean(
  value,
  maximum
) {
  return String(
    value || ''
  )
    .trim()
    .slice(
      0,
      maximum
    );
}

function escapeHtml(
  value
) {
  return String(value)
    .replace(
      /&/g,
      '&amp;'
    )
    .replace(
      /</g,
      '&lt;'
    )
    .replace(
      />/g,
      '&gt;'
    )
    .replace(
      /"/g,
      '&quot;'
    )
    .replace(
      /'/g,
      '&#039;'
    );
}

async function verifyTurnstile(
  token,
  secret,
  ip
) {
  const form =
    new FormData();

  form.append(
    'secret',
    secret
  );

  form.append(
    'response',
    token
  );

  if (ip) {
    form.append(
      'remoteip',
      ip
    );
  }

  const result =
    await fetch(
      TURNSTILE_VERIFY_URL,
      {
        method: 'POST',
        body: form
      }
    );

  if (!result.ok) {
    return false;
  }

  const data =
    await result.json();

  return (
    data.success === true
  );
}

export async function onRequestPost(
  context
) {
  const {
    request,
    env
  } = context;

  if (
    !env.RESEND_API_KEY ||
    !env.TURNSTILE_SECRET_KEY ||
    !env.CONTACT_FROM_EMAIL ||
    !env.CONTACT_RECIPIENTS
  ) {
    console.error(
      'Missing contact form configuration.'
    );

    return response(
      {
        error:
          'The contact form is temporarily unavailable.'
      },
      500
    );
  }

  let recipients;

  try {
    recipients =
      JSON.parse(
        env.CONTACT_RECIPIENTS
      );
  } catch {
    console.error(
      'CONTACT_RECIPIENTS is invalid JSON.'
    );

    return response(
      {
        error:
          'The contact form is temporarily unavailable.'
      },
      500
    );
  }

  let body;

  try {
    body =
      await request.json();
  } catch {
    return response(
      {
        error:
          'Invalid request.'
      },
      400
    );
  }

  const khanqahId =
    clean(
      body.khanqahId,
      100
    );

  const name =
    clean(
      body.name,
      100
    );

  const phone =
    clean(
      body.phone,
      30
    );

  const email =
    clean(
      body.email,
      200
    );

  const subject =
    clean(
      body.subject,
      150
    );

  const message =
    clean(
      body.message,
      5000
    );

  const token =
    clean(
      body.turnstileToken,
      2500
    );

  if (
    !khanqahId ||
    !name ||
    !phone ||
    !email ||
    !subject ||
    !message ||
    !token
  ) {
    return response(
      {
        error:
          'Please complete all required fields.'
      },
      400
    );
  }

  if (
    !EMAIL_REGEX.test(
      email
    )
  ) {
    return response(
      {
        error:
          'Please enter a valid email address.'
      },
      400
    );
  }

  const recipient =
    recipients[
      khanqahId
    ];

  if (
    !recipient ||
    !EMAIL_REGEX.test(
      recipient
    )
  ) {
    return response(
      {
        error:
          'The contact form is not available for this Khanqah.'
      },
      404
    );
  }

  const verified =
    await verifyTurnstile(
      token,
      env.TURNSTILE_SECRET_KEY,
      request.headers.get(
        'CF-Connecting-IP'
      )
    );

  if (!verified) {
    return response(
      {
        error:
          'The security check could not be verified. Please try again.'
      },
      403
    );
  }

  const safeName =
    escapeHtml(name);

  const safePhone =
    escapeHtml(phone);

  const safeEmail =
    escapeHtml(email);

  const safeSubject =
    escapeHtml(subject);

  const safeMessage =
    escapeHtml(message)
      .replace(
        /\n/g,
        '<br>'
      );

  const resendResponse =
    await fetch(
      RESEND_URL,
      {
        method: 'POST',

        headers: {
          Authorization:
            `Bearer ${env.RESEND_API_KEY}`,

          'Content-Type':
            'application/json',

          'User-Agent':
            'Khanqah-Website/1.0'
        },

        body:
          JSON.stringify({
            from:
              `Khanqah Naqshbandia Mujaddidia <${env.CONTACT_FROM_EMAIL}>`,

            to: [
              recipient
            ],

            reply_to:
              email,

            subject:
              `[Website] ${subject}`,

            html: `
              <div
                style="
                  font-family:
                    Arial,
                    sans-serif;
                  line-height:1.6;
                  color:#202020;
                "
              >
                <h2>
                  New Khanqah Website Enquiry
                </h2>

                <p>
                  <strong>Name:</strong>
                  ${safeName}
                </p>

                <p>
                  <strong>Phone Number:</strong>
                  ${safePhone}
                </p>

                <p>
                  <strong>Email:</strong>
                  ${safeEmail}
                </p>

                <p>
                  <strong>Subject:</strong>
                  ${safeSubject}
                </p>

                <p>
                  <strong>Message:</strong>
                </p>

                <p>
                  ${safeMessage}
                </p>
              </div>
            `,

            text:
              [
                'New Khanqah Website Enquiry',
                '',
                `Name: ${name}`,
                `Phone Number: ${phone}`,
                `Email: ${email}`,
                `Subject: ${subject}`,
                '',
                'Message:',
                message
              ].join('\n')
          })
      }
    );

  const resendData =
    await resendResponse
      .json()
      .catch(
        () => ({})
      );

  if (!resendResponse.ok) {
    console.error(
      'Resend error:',
      resendData
    );

    return response(
      {
        error:
          'Your message could not be sent. Please try again.'
      },
      502
    );
  }

  return response({
    success: true
  });
}