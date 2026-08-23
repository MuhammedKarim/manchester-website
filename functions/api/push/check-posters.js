import { sendWebPush } from '../../_lib/web-push.js';

const POSTER_EXTENSIONS = [
  'png',
  'jpg',
  'jpeg',
  'webp',
  'gif',
  'avif'
];

function json(data, status = 200) {
  return Response.json(data, {
    status,
    headers: {
      'Cache-Control': 'no-store'
    }
  });
}

async function fetchJson(url) {
  try {
    const response = await fetch(
      `${url}${url.includes('?') ? '&' : '?'}v=${Date.now()}`,
      {
        cache: 'no-store'
      }
    );

    if (!response.ok) {
      return null;
    }

    const type = (
      response.headers.get('content-type') || ''
    ).toLowerCase();

    if (!type.includes('application/json')) {
      return null;
    }

    return await response.json();
  } catch {
    return null;
  }
}

async function posterImageExists(origin, folder) {
  const timestamp = Date.now();

  for (const extension of POSTER_EXTENSIONS) {
    const url = new URL(
      `${folder}/poster.${extension}?v=${timestamp}`,
      origin
    );

    try {
      const response = await fetch(url, {
        cache: 'no-store'
      });

      if (!response.ok) {
        continue;
      }

      const type = (
        response.headers.get('content-type') || ''
      ).toLowerCase();

      if (type.startsWith('image/')) {
        return true;
      }
    } catch {
    }
  }

  return false;
}

async function getPosterStatus(origin, controlUrl, folder) {
  const control = await fetchJson(
    new URL(controlUrl, origin).href
  );

  if (!control) {
    return {
      ok: false,
      active: false
    };
  }

  if (control.active !== true) {
    return {
      ok: true,
      active: false
    };
  }

  const imageExists = await posterImageExists(
    origin,
    folder
  );

  if (!imageExists) {
    return {
      ok: false,
      active: false
    };
  }

  return {
    ok: true,
    active: true
  };
}

async function getStoredState(env, posterKey) {
  return env.DB
    .prepare(`
      SELECT active
      FROM poster_states
      WHERE poster_key = ?
    `)
    .bind(posterKey)
    .first();
}

async function saveState(env, posterKey, active) {
  await env.DB
    .prepare(`
      INSERT INTO poster_states (
        poster_key,
        active,
        updated_at
      )
      VALUES (?, ?, CURRENT_TIMESTAMP)

      ON CONFLICT(poster_key)
      DO UPDATE SET
        active = excluded.active,
        updated_at = CURRENT_TIMESTAMP
    `)
    .bind(
      posterKey,
      active ? 1 : 0
    )
    .run();
}

async function removeSubscription(env, subscriptionId) {
  await env.DB
    .prepare(`
      DELETE FROM notification_preferences
      WHERE subscription_id = ?
    `)
    .bind(subscriptionId)
    .run();

  await env.DB
    .prepare(`
      DELETE FROM push_subscriptions
      WHERE id = ?
    `)
    .bind(subscriptionId)
    .run();
}

async function getGlobalSubscribers(env) {
  const result = await env.DB
    .prepare(`
      SELECT DISTINCT
        s.id,
        s.endpoint,
        s.p256dh,
        s.auth
      FROM push_subscriptions s
      INNER JOIN notification_preferences p
        ON p.subscription_id = s.id
      WHERE p.announcements = 1
         OR p.prayer_changes = 1
    `)
    .all();

  return result.results || [];
}

async function getKhanqahSubscribers(env, khanqahId) {
  const result = await env.DB
    .prepare(`
      SELECT DISTINCT
        s.id,
        s.endpoint,
        s.p256dh,
        s.auth
      FROM push_subscriptions s
      INNER JOIN notification_preferences p
        ON p.subscription_id = s.id
      WHERE p.khanqah_id = ?
        AND p.announcements = 1
    `)
    .bind(khanqahId)
    .all();

  return result.results || [];
}

async function sendAnnouncement(
  env,
  subscribers,
  {
    type,
    khanqahId = null,
    title,
    body,
    tag
  }
) {
  const payload = JSON.stringify({
    title,
    body,
    url: '/',
    tag
  });

  let sent = 0;
  let failed = 0;
  let removed = 0;

  for (const row of subscribers) {
    const subscription = {
      endpoint: row.endpoint,
      keys: {
        p256dh: row.p256dh,
        auth: row.auth
      }
    };

    try {
      await sendWebPush({
        subscription,
        payload,
        vapidPublicKey: env.VAPID_PUBLIC_KEY,
        vapidPrivateKey: env.VAPID_PRIVATE_KEY,
        vapidSubject: env.VAPID_SUBJECT,
        ttl: 86400,
        urgency: 'normal'
      });

      sent += 1;
    } catch (error) {
      const statusCode =
        error?.statusCode || null;

      if (
        statusCode === 404 ||
        statusCode === 410
      ) {
        await removeSubscription(
          env,
          row.id
        );

        removed += 1;
        continue;
      }

      failed += 1;

      console.error(
        'Announcement push failed:',
        {
          subscriptionId: row.id,
          statusCode,
          message: error?.message,
          body: error?.body
        }
      );
    }
  }

  await env.DB
    .prepare(`
      INSERT INTO notification_log (
        type,
        khanqah_id,
        title,
        body,
        sent_count
      )
      VALUES (?, ?, ?, ?, ?)
    `)
    .bind(
      type,
      khanqahId,
      title,
      body,
      sent
    )
    .run();

  return {
    sent,
    failed,
    removed
  };
}

async function processPoster(
  env,
  {
    posterKey,
    status,
    type,
    khanqahId = null,
    location = null
  }
) {
  if (!status.ok) {
    return {
      posterKey,
      status: 'unavailable'
    };
  }

  const stored = await getStoredState(
    env,
    posterKey
  );

  const currentlyActive =
    status.active === true;

  /*
   * First ever check:
   * save the current state without
   * sending a notification.
   */
  if (!stored) {
    await saveState(
      env,
      posterKey,
      currentlyActive
    );

    return {
      posterKey,
      status: 'initialised',
      active: currentlyActive
    };
  }

  const previouslyActive =
    stored.active === 1;

  await saveState(
    env,
    posterKey,
    currentlyActive
  );

  if (
    previouslyActive ||
    !currentlyActive
  ) {
    return {
      posterKey,
      status: 'unchanged',
      active: currentlyActive
    };
  }

  let subscribers;
  let title;
  let body;
  let tag;

  if (type === 'global') {
    subscribers =
      await getGlobalSubscribers(env);

    title =
      'Khanqah Naqshbandia Mujaddidia';

    body =
      'A new general announcement has been posted.';

    tag =
      'general-announcement';
  } else {
    subscribers =
      await getKhanqahSubscribers(
        env,
        khanqahId
      );

    title =
      `${location} Khanqah`;

    body =
      'A new announcement has been posted.';

    tag =
      `announcement-${khanqahId}`;
  }

  const result =
    await sendAnnouncement(
      env,
      subscribers,
      {
        type:
          type === 'global'
            ? 'general_announcement'
            : 'khanqah_announcement',
        khanqahId,
        title,
        body,
        tag
      }
    );

  return {
    posterKey,
    status: 'notification-sent',
    active: true,
    subscribers: subscribers.length,
    ...result
  };
}

export async function onRequestPost(context) {
  const { request, env } = context;

  const suppliedKey =
    request.headers.get(
      'X-Poster-Check-Key'
    );

  if (
    !env.POSTER_CHECK_KEY ||
    suppliedKey !== env.POSTER_CHECK_KEY
  ) {
    return json({
      error: 'Unauthorized.'
    }, 401);
  }

  if (
    !env.DB ||
    !env.VAPID_PUBLIC_KEY ||
    !env.VAPID_PRIVATE_KEY ||
    !env.VAPID_SUBJECT
  ) {
    return json({
      error: 'Announcement configuration is incomplete.'
    }, 500);
  }

  const origin =
    new URL(request.url).origin;

  const [
    siteConfig,
    masjidsConfig
  ] = await Promise.all([
    fetchJson(
      new URL(
        '/data/config.json',
        origin
      ).href
    ),
    fetchJson(
      new URL(
        '/data/masjids.json',
        origin
      ).href
    )
  ]);

  if (
    !siteConfig ||
    !masjidsConfig
  ) {
    return json({
      error: 'Unable to load website configuration.'
    }, 502);
  }

  const results = [];

  if (
    siteConfig.poster?.controlUrl &&
    siteConfig.poster?.folder
  ) {
    const status =
      await getPosterStatus(
        origin,
        siteConfig.poster.controlUrl,
        siteConfig.poster.folder
      );

    results.push(
      await processPoster(
        env,
        {
          posterKey: 'global',
          status,
          type: 'global'
        }
      )
    );
  }

  for (
    const [
      khanqahId,
      masjid
    ] of Object.entries(
      masjidsConfig.masjids || {}
    )
  ) {
    const folder =
      masjid?.assets?.folder;

    if (!folder) {
      continue;
    }

    const status =
      await getPosterStatus(
        origin,
        `${folder}/poster.json`,
        folder
      );

    results.push(
      await processPoster(
        env,
        {
          posterKey:
            `khanqah:${khanqahId}`,
          status,
          type: 'khanqah',
          khanqahId,
          location:
            masjid.location ||
            'Khanqah'
        }
      )
    );
  }

  return json({
    success: true,
    results
  });
}