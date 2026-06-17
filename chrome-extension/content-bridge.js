const PAGE_SOURCE = 'fruit-miner-page';
const BRIDGE_SOURCE = 'fruit-miner-extension';
const REQUEST_TIMEOUT_MS = 5 * 60 * 1000;

function postToPage(payload) {
  window.postMessage({ source: BRIDGE_SOURCE, ...payload }, '*');
}

postToPage({ type: 'ready' });

function callExtensionPort(path, body) {
  return new Promise((resolve, reject) => {
    let port;
    try {
      port = chrome.runtime.connect({ name: 'fruit-miner-website' });
    } catch (error) {
      reject(error);
      return;
    }

    let settled = false;
    const finish = (handler) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try { port.disconnect(); } catch {}
      handler();
    };

    const timer = setTimeout(() => {
      finish(() => reject(new Error('Extension request timed out after 5 minutes. Open youtube.com in this Chrome profile, sign in, then retry.')));
    }, REQUEST_TIMEOUT_MS);

    port.onMessage.addListener((message) => {
      if (!message) return;
      if (message.type === 'progress') {
        postToPage({
          type: 'progress',
          videoId: message.videoId,
          stage: message.stage,
          detail: message.detail,
        });
        return;
      }
      if (message.type === 'response') {
        finish(() => {
          const data = message.data || {};
          if (data.ok === false) reject(new Error(data.error || 'Extension request failed.'));
          else resolve(data);
        });
      }
    });

    port.onDisconnect.addListener(() => {
      if (settled) return;
      const reason = chrome.runtime.lastError?.message || 'Extension disconnected before the transcript finished.';
      finish(() => reject(new Error(reason)));
    });

    port.postMessage({
      path,
      body: { ...(body || {}), fromWebsite: true },
    });
  });
}

window.addEventListener('message', (event) => {
  if (event.source !== window || !event.data || event.data.source !== PAGE_SOURCE) return;

  if (event.data.type === 'ping') {
    postToPage({ type: 'ready' });
    return;
  }

  const { requestId, path, body } = event.data;
  if (!requestId || !path) return;

  callExtensionPort(path, body)
    .then((data) => {
      postToPage({ requestId, data });
    })
    .catch((error) => {
      postToPage({
        requestId,
        data: { ok: false, error: error?.message || String(error) },
      });
    });
});
