function json(data, status = 200) {
  return Response.json(
    data,
    {
      status,
      headers: {
        'Cache-Control': 'no-store'
      }
    }
  );
}

function clean(value, maxLength = 5000) {
  return String(value || '')
    .trim()
    .slice(0, maxLength);
}

export async function onRequestPost(context) {
  const { request, env } = context;

  if (!env.DB) {
    return json(
      {
        error: 'Notification database is unavailable.'
      },
      500
    );
  }

  let body;

  try {
    body = await request.json();
  } catch {
    return json(
      {
        error: 'Invalid request.'
      },
      400
    );
  }

  const subscription =
    body.subscription;

  const preferences =
    body.preferences &&
    typeof body.preferences === 'object'
      ? body.preferences
      : {};

  const endpoint =
    clean(subscription?.endpoint);

  const p256dh =
    clean(subscription?.keys?.p256dh);

  const auth =
    clean(subscription?.keys?.auth);

  if (
    !endpoint ||
    !p256dh ||
    !auth
  ) {
    return json(
      {
        error: 'Invalid push subscription.'
      },
      400
    );
  }

  await env.DB
    .prepare(`
      INSERT INTO push_subscriptions (
        endpoint,
        p256dh,
        auth,
        updated_at
      )
      VALUES (?, ?, ?, CURRENT_TIMESTAMP)

      ON CONFLICT(endpoint)
      DO UPDATE SET
        p256dh = excluded.p256dh,
        auth = excluded.auth,
        updated_at = CURRENT_TIMESTAMP
    `)
    .bind(
      endpoint,
      p256dh,
      auth
    )
    .run();

  const row = await env.DB
    .prepare(`
      SELECT id
      FROM push_subscriptions
      WHERE endpoint = ?
    `)
    .bind(endpoint)
    .first();

  if (!row?.id) {
    return json(
      {
        error: 'Unable to save push subscription.'
      },
      500
    );
  }

  const subscriptionId =
    row.id;

  await env.DB
    .prepare(`
      DELETE FROM notification_preferences
      WHERE subscription_id = ?
    `)
    .bind(subscriptionId)
    .run();

  for (
    const [
      khanqahId,
      preference
    ]
    of Object.entries(preferences)
  ) {
    const announcements =
      preference?.announcements === true
        ? 1
        : 0;

    const prayerChanges =
      preference?.prayerChanges === true
        ? 1
        : 0;

    if (
      announcements === 0 &&
      prayerChanges === 0
    ) {
      continue;
    }

    await env.DB
      .prepare(`
        INSERT INTO notification_preferences (
          subscription_id,
          khanqah_id,
          announcements,
          prayer_changes,
          updated_at
        )
        VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
      `)
      .bind(
        subscriptionId,
        khanqahId,
        announcements,
        prayerChanges
      )
      .run();
  }

  return json({
    success: true
  });
}