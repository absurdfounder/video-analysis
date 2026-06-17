const PAGE_SOURCE = 'fruit-miner-page';
const BRIDGE_SOURCE = 'fruit-miner-extension';
const REQUEST_TIMEOUT_MS = 3 * 60 * 1000;

function postToPage(payload) {
  window.postMessage({ source: BRIDGE_SOURCE, ...payload }, '*');
}

postToPage({ type: 'ready' });

window.addEventListener('message', (event) => {
  if (event.source !== window || !event.data || event.data.source !== PAGE_SOURCE) return;

  if (event.data.type === 'ping') {
    postToPage({ type: 'ready' });
    return;
  }

  const { requestId, path, body } = event.data;
  if (!requestId || !path) return;

  const timer = setTimeout(() => {
    postToPage({
      requestId,
      data: { ok: false, error: 'Extension request timed out.' },
    });
  }, REQUEST_TIMEOUT_MS);

  chrome.runtime.sendMessage({ type: 'api', path, body: body || {} })
    .then((data) => {
      clearTimeout(timer);
      postToPage({ requestId, data: data || { ok: false, error: 'Empty extension response.' } });
    })
    .catch((error) => {
      clearTimeout(timer);
      postToPage({
        requestId,
        data: { ok: false, error: error?.message || String(error) },
      });
    });
});
