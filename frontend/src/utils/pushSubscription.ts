import { API_BASE_URL } from "../config";
import axios from 'axios';

// Public VAPID key sinh ra từ Backend
const PUBLIC_VAPID_KEY = 'BCCvu27a05p5ouVBpkgG3UdYRUK69dx0ETfx2F9GbjICORUkr1iubmauzJJEIZTk45IRz9curCbd5dojx70nvF8';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function subscribeUserToPush() {
  if (!('serviceWorker' in navigator)) {
    console.log('Service Worker is not supported');
    return;
  }
  if (!('PushManager' in window) || !('Notification' in window)) {
    alert('Trình duyệt của bạn không hỗ trợ thông báo đẩy. Đối với iPhone (iOS), bạn BẮT BUỘC phải thêm ứng dụng vào Màn hình chính (Add to Home Screen) trước tiên!');
    console.log('Push messaging is not supported');
    return;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.log('Permission not granted for Notification');
      return;
    }

    const registration = await navigator.serviceWorker.ready;
    let subscription = await registration.pushManager.getSubscription();
    
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(PUBLIC_VAPID_KEY)
      });
    }

    // Gửi subscription lên server
    await axios.post(`${API_BASE_URL}/api/inventory/push/subscribe`, {
      user_id: 'demo_user_2026',
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.toJSON().keys?.p256dh,
        auth: subscription.toJSON().keys?.auth
      }
    });
    
    console.log('Subscribed to push notifications successfully!');
    
  } catch (error) {
    console.error('Failed to subscribe to push notifications:', error);
  }
}
