import { API_BASE_URL } from "./config";
/// <reference lib="webworker" />
declare let self: ServiceWorkerGlobalScope;

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  if (!event.data) return;
  
  const data = event.data.json();
  const { title, body, data: payloadData } = data;
  const { unit } = payloadData || {};
  
  // Xác định xem có hiển thị nút Yes/No dựa vào đơn vị không
  // Thuốc dạng lỏng/bôi ('ml', 'tuýp', 'gram') sẽ không có nút quick action
  const hasQuickActions = ['viên', 'gói', 'ống'].includes(unit?.toLowerCase());
  
  const options: NotificationOptions = {
    body,
    icon: '/icon-192x192.png',
    badge: '/icon-192x192.png',
    vibrate: [200, 100, 200],
    data: payloadData,
  };
  
  if (hasQuickActions) {
    options.actions = [
      { action: 'consume', title: '✅ Đã uống (Trừ tồn kho)' },
      { action: 'ignore', title: '❌ Chưa uống' }
    ];
  }
  
  event.waitUntil(
    self.registration.showNotification(title || 'AMA Scanner', options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  const payloadData = event.notification.data;
  if (!payloadData) return;
  
  if (event.action === 'consume') {
    // Gọi API trừ tồn kho
    event.waitUntil(
      fetch(`${API_BASE_URL}/api/inventory/consume`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          medicine_id: payloadData.medicine_id,
          dosage: payloadData.dosage,
          user_id: payloadData.user_id
        })
      })
      .then(res => res.json())
      .then(data => {
        // Có thể hiện thông báo phụ cảnh báo hết thuốc nếu cần
        if (data.warning) {
          self.registration.showNotification('Cảnh báo tồn kho', {
            body: data.warning,
            icon: '/icon-192x192.png'
          });
        }
      })
      .catch(err => console.error('Consume error:', err))
    );
  } else if (event.action === 'ignore') {
    // Nhắc nhở phụ
    event.waitUntil(
      self.registration.showNotification('Nhắc nhở', {
        body: 'Đừng quên uống thuốc đúng giờ để đảm bảo sức khỏe nhé!',
        icon: '/icon-192x192.png'
      })
    );
  } else {
    // Mở app và TỰ ĐỘNG TRỪ TỒN KHO nếu bấm vào thân thông báo (Vì iOS không hiển thị nút action)
    event.waitUntil(
      fetch(`${API_BASE_URL}/api/inventory/consume`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          medicine_id: payloadData.medicine_id,
          dosage: payloadData.dosage,
          user_id: payloadData.user_id
        })
      })
      .then(res => res.json())
      .then(data => {
        if (data.warning) {
          self.registration.showNotification('Cảnh báo tồn kho', {
            body: data.warning,
            icon: '/icon-192x192.png'
          });
        }
        // Sau khi trừ xong thì mở app
        return self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
          if (clientList.length > 0) {
            let client = clientList[0];
            for (let i = 0; i < clientList.length; i++) {
              if (clientList[i].focused) {
                client = clientList[i];
              }
            }
            return client.focus();
          }
          return self.clients.openWindow('/');
        });
      })
      .catch(err => {
        console.error('Consume error:', err);
        return self.clients.openWindow('/');
      })
    );
  }
});
