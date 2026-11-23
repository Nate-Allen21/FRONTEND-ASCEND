import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

const ZONE = 'America/Sao_Paulo';
const DAY = 86400000;
const HORIZON = 60;
const LIMIT = 256;
const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: ZONE, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
export const supportsCalendarReminders = () => Capacitor.getPlatform() === 'android';

// Os horários da agenda usam o mesmo fuso fixo já utilizado pelo ASCEND.
function instantFor(date, time) {
  const [year, month, day] = date.split('-').map(Number);
  const [hour, minute] = time.split(':').map(Number);
  const desired = Date.UTC(year, month - 1, day, hour, minute);
  let instant = desired;
  for (let i = 0; i < 3; i++) {
    const parts = Object.fromEntries(formatter.formatToParts(new Date(instant)).map(p => [p.type, p.value]));
    const represented = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute);
    instant += desired - represented;
  }
  return instant;
}

function keyOf(d) { return d.toISOString().slice(0, 10); }
function hashId(value) {
  let hash = 2166136261;
  for (const char of value) { hash ^= char.charCodeAt(0); hash = Math.imul(hash, 16777619); }
  return -(1 + ((hash >>> 0) % 2147483646));
}

export function planCalendarReminders(events, ownerId, now = Date.now()) {
  const candidates = [];
  const first = new Date(now - 2 * DAY); first.setUTCHours(0, 0, 0, 0);
  const last = now + HORIZON * DAY;
  for (const event of events) {
    if (event.deleted || event.completed || !event.id || !event.startTime || event.reminderMinutes == null) continue;
    const start = Date.parse(event.date + 'T00:00:00Z');
    if (!Number.isFinite(start)) continue;
    for (let n = 0; n <= HORIZON + 10; n++) {
      const occurrence = new Date(first.getTime() + n * DAY);
      const delta = Math.round((occurrence.getTime() - start) / DAY);
      const key = keyOf(occurrence);
      if (delta < 0) continue;
      const matches = delta === 0 || event.recurrence === 'daily' || event.recurrence === 'weekly' && delta % 7 === 0 || event.recurrence === 'monthly' && key.slice(8) === event.date.slice(8);
      if (!matches) continue;
      const at = instantFor(key, event.startTime) - event.reminderMinutes * 60000;
      if (at <= now || at > last) continue;
      candidates.push({ event, key, at });
    }
  }
  candidates.sort((a, b) => a.at - b.at || a.event.id - b.event.id);
  const used = new Set();
  const notifications = candidates.slice(0, LIMIT).map(({event, key, at}) => {
    let id = hashId(`${ownerId}:${event.id}:${key}`);
    while (used.has(id)) id = id === -2147483646 ? -1 : id - 1;
    used.add(id);
    return { id, title: 'ASCEND', body: 'Você tem uma atividade programada.', schedule: {at: new Date(at)}, isExactNotification: false,
      extra: { ascendCalendar: true, ownerId: String(ownerId), eventId: event.id, date: key } };
  });
  return { notifications, truncated: candidates.length > LIMIT };
}

let queue = Promise.resolve();
function enqueue(work) { const next = queue.then(work, work); queue = next.catch(() => {}); return next; }
export function clearCalendarReminders() {
  if (!supportsCalendarReminders()) return Promise.resolve();
  return enqueue(async () => {
    const pending = await LocalNotifications.getPending();
    const ours = pending.notifications.filter(n => n.extra?.ascendCalendar).map(n => ({id: n.id}));
    if (ours.length) await LocalNotifications.cancel({notifications: ours});
  });
}
export function syncCalendarReminders(events, ownerId) {
  if (!supportsCalendarReminders()) return Promise.resolve(null);
  return enqueue(() => reconcileCalendarReminders(LocalNotifications, events, ownerId));
}
export async function reconcileCalendarReminders(plugin, events, ownerId, now = Date.now()) {
    if ((await plugin.checkPermissions()).display !== 'granted') return null;
    const pending = await plugin.getPending();
    const ours = pending.notifications.filter(n => n.extra?.ascendCalendar).map(n => ({id: n.id}));
    const unmanaged = new Set(pending.notifications.filter(n => !n.extra?.ascendCalendar).map(n => n.id));
    const plan = planCalendarReminders(events, ownerId, now);
    if (plan.notifications.some(n => unmanaged.has(n.id))) throw new Error('Notification ID collision');
    if (ours.length) await plugin.cancel({notifications: ours});
    if (plan.notifications.length) await plugin.schedule({notifications: plan.notifications});
    return plan;
}
export async function requestCalendarReminderPermission() {
  if (!supportsCalendarReminders()) return false;
  return (await LocalNotifications.requestPermissions()).display === 'granted';
}
export function listenForCalendarReminder(callback) {
  if (!supportsCalendarReminders()) return;
  return LocalNotifications.addListener('localNotificationActionPerformed', action => {
    if (action.notification.extra?.ascendCalendar) callback(action.notification.extra);
  });
}
