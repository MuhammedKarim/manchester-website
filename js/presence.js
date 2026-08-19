const HEARTBEAT_MS =
  30 * 1000;

const container =
  document.querySelector(
    '[data-live-visitors]'
  );

const countElement =
  document.querySelector(
    '[data-live-visitor-count]'
  );

let endpoint = '';
let socket = null;
let heartbeatTimer = null;
let reconnectTimer = null;
let reconnectDelay = 2000;

function setCount(count) {
  if (
    !container ||
    !countElement
  ) {
    return;
  }

  const value =
    Math.max(
      0,
      Number(count) || 0
    );

  countElement.textContent =
    value === 1
      ? '1 person online'
      : `${value} people online`;

  container.hidden =
    false;
}

function send(type) {
  if (
    socket
      ?.readyState !==
    WebSocket.OPEN
  ) {
    return;
  }

  socket.send(
    JSON.stringify({
      type
    })
  );
}

function stopHeartbeat() {
  clearInterval(
    heartbeatTimer
  );

  heartbeatTimer = null;
}

function startHeartbeat() {
  stopHeartbeat();

  if (
    document.visibilityState !==
    'visible'
  ) {
    return;
  }

  send('heartbeat');

  heartbeatTimer =
    setInterval(
      () => {
        if (
          document.visibilityState ===
          'visible'
        ) {
          send(
            'heartbeat'
          );
        }
      },
      HEARTBEAT_MS
    );
}

function scheduleReconnect() {
  if (
    reconnectTimer ||
    document.visibilityState ===
      'hidden' ||
    !endpoint
  ) {
    return;
  }

  reconnectTimer =
    setTimeout(
      () => {
        reconnectTimer =
          null;

        connect();

        reconnectDelay =
          Math.min(
            reconnectDelay *
              1.5,
            15000
          );
      },
      reconnectDelay
    );
}

function connect() {
  if (
    !endpoint ||
    document.visibilityState ===
      'hidden'
  ) {
    return;
  }

  if (
    socket &&
    (
      socket.readyState ===
        WebSocket.OPEN ||
      socket.readyState ===
        WebSocket.CONNECTING
    )
  ) {
    return;
  }

  try {
    socket =
      new WebSocket(
        endpoint
      );
  } catch {
    scheduleReconnect();
    return;
  }

  socket.addEventListener(
    'open',
    () => {
      reconnectDelay =
        2000;

      send('active');
      startHeartbeat();
    }
  );

  socket.addEventListener(
    'message',
    event => {
      try {
        const data =
          JSON.parse(
            event.data
          );

        if (
          data.type ===
            'presence' &&
          Number.isFinite(
            Number(
              data.count
            )
          )
        ) {
          setCount(
            data.count
          );
        }
      } catch {
      }
    }
  );

  socket.addEventListener(
    'close',
    () => {
      stopHeartbeat();
      socket = null;
      scheduleReconnect();
    }
  );

  socket.addEventListener(
    'error',
    () => {
      socket?.close();
    }
  );
}

export function initPresence(
  url
) {
  endpoint = url;

  if (!endpoint) {
    return;
  }

  connect();
}

document.addEventListener(
  'visibilitychange',
  () => {
    if (!endpoint) {
      return;
    }

    if (
      document.visibilityState ===
      'visible'
    ) {
      if (
        socket?.readyState ===
        WebSocket.OPEN
      ) {
        send('active');
        startHeartbeat();
      } else {
        connect();
      }
    } else {
      send('inactive');
      stopHeartbeat();
    }
  }
);

window.addEventListener(
  'pagehide',
  () => {
    send('inactive');
    stopHeartbeat();

    if (
      socket?.readyState ===
      WebSocket.OPEN
    ) {
      socket.close(
        1000,
        'Page closed'
      );
    }
  }
);
