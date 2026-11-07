self.addEventListener("push", (event) => {
  let payload = {};
  try { payload = event.data ? event.data.json() : {}; }
  catch { payload = { title: "Lazzat Tiffin", body: event.data?.text() || "You have a new notification." }; }
  const title = payload.title || "Lazzat Tiffin";
  const options = {
    body: payload.body || "You have a new notification.",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    data: { url: payload.url || "/" },
    tag: payload.tag || "lazzat-notification",
    renotify: false
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || "/", self.location.origin).href;
  event.waitUntil((async () => {
    const clientsList = await clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const client of clientsList) {
      if (client.url.startsWith(self.location.origin) && "focus" in client) {
        await client.navigate(target);
        return client.focus();
      }
    }
    return clients.openWindow(target);
  })());
});
