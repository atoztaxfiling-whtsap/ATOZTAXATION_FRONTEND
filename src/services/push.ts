const API_BASE = import.meta.env.VITE_API_URL;

export async function setupPushNotifications(): Promise<boolean> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false;
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') return false;
  try {
    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      const key = import.meta.env.VITE_VAPID_PUBLIC_KEY;
      if (!key) { console.log('[Push] No VAPID key'); return false; }
      const padding = '='.repeat((4 - (key.length % 4)) % 4);
      const raw = atob((key + padding).replace(/-/g, '+').replace(/_/g, '/'));
      const arr = Uint8Array.from(raw, c => c.charCodeAt(0));
      sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: arr });
    }
    const token = localStorage.getItem('console_token') || '';
    const res = await fetch(`${API_BASE}/api/push-subscribe`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Console-Token': token }, body: JSON.stringify(sub) });
    return res.ok;
  } catch (e) { console.error('[Push]', e); return false; }
}
