type Status = { offlineReady: boolean; updateAvailable: boolean; unavailable: boolean };
const initialStatus: Status = {
  offlineReady: false,
  updateAvailable: false,
  unavailable: false,
};
let status = initialStatus;
export const getServerPwaStatus = () => initialStatus;
const listeners = new Set<() => void>();
let registration: ServiceWorkerRegistration | null = null;
let requestedUpdate = false;
export const getPwaStatus = () => status;
export function watchPwa(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
function update(patch: Partial<Status>) {
  status = { ...status, ...patch };
  listeners.forEach((listener) => listener());
}

/** Update only after this tab explicitly requests it, never during another tab's game. */
export function registerOfflineSupport(): void {
  if (!('serviceWorker' in navigator)) {
    update({ unavailable: true });
    return;
  }
  let hadController = Boolean(navigator.serviceWorker.controller);
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (requestedUpdate) window.location.reload();
    else if (hadController) update({ updateAvailable: true });
    hadController = true;
  });
  void navigator.serviceWorker
    .register('/sw.js')
    .then((next) => {
      registration = next;
      if (next.waiting) update({ updateAvailable: true });
      next.addEventListener('updatefound', () => {
        const worker = next.installing;
        worker?.addEventListener('statechange', () => {
          if (worker.state === 'installed')
            update(
              navigator.serviceWorker.controller
                ? { updateAvailable: true }
                : { offlineReady: true },
            );
          if (worker.state === 'redundant') update({ unavailable: !status.offlineReady });
        });
      });
      void navigator.serviceWorker.ready.then(() => update({ offlineReady: true }));
    })
    .catch(() => update({ unavailable: true }));
}

export function applyAvailableUpdate(): void {
  if (window.location.hash.startsWith('#/play/')) return;
  // Another tab may already have activated it: this tab still needs the new UI.
  if (!registration?.waiting) {
    if (status.updateAvailable) window.location.reload();
    return;
  }
  requestedUpdate = true;
  registration.waiting.postMessage({ type: 'SKIP_WAITING' });
}
