import { test } from 'node:test';
import assert from 'node:assert/strict';
import { planCalendarReminders, reconcileCalendarReminders } from '../js/calendar-reminders.js';

test('reminder uses Sao Paulo time and changes when an event is rescheduled', () => {
  const event = {id: 1, date: '2026-11-19', startTime: '09:00', reminderMinutes: 15, recurrence: 'none'};
  const now = Date.parse('2026-11-18T12:00:00Z');
  const original = planCalendarReminders([event], 12, now).notifications;
  assert.equal(original.length, 1);
  assert.equal(original[0].schedule.at.toISOString(), '2026-11-19T11:45:00.000Z');
  const changed = planCalendarReminders([{...event, startTime:'10:00'}], 12, now).notifications;
  assert.equal(changed[0].id, original[0].id);
  assert.equal(changed[0].schedule.at.toISOString(), '2026-11-19T12:45:00.000Z');
  assert.equal(planCalendarReminders([{...event, deleted:true}], 12, now).notifications.length, 0);
});

test('daily and weekly recurrences have unique ids and completed events are excluded', () => {
  const now = Date.parse('2026-11-18T12:00:00Z');
  const events = [
    {id: 1, date:'2026-11-19', startTime:'09:00', reminderMinutes:0, recurrence:'daily'},
    {id: 2, date:'2026-11-19', startTime:'09:00', reminderMinutes:0, recurrence:'weekly'},
    {id: 3, date:'2026-11-19', startTime:'09:00', reminderMinutes:0, recurrence:'daily', completed:true}
  ];
  const {notifications} = planCalendarReminders(events, 12, now);
  const daily = notifications.filter(n => n.extra.eventId === 1);
  const weekly = notifications.filter(n => n.extra.eventId === 2);
  assert.ok(daily.length > weekly.length && weekly.length > 1);
  assert.equal(new Set(notifications.map(n => n.id)).size, notifications.length);
  assert.ok(notifications.every(n => n.isExactNotification === false && n.extra.eventId !== 3));
});

test('reconciliation cancels only calendar notifications before rescheduling', async () => {
  const calls = [];
  const plugin = {
    checkPermissions: async () => ({display:'granted'}),
    getPending: async () => ({notifications:[{id:1,extra:{ascendCalendar:true}},{id:2,extra:{}}]}),
    cancel: async value => calls.push(['cancel', value]),
    schedule: async value => calls.push(['schedule', value])
  };
  const event = {id:10, date:'2026-11-19', startTime:'09:00', reminderMinutes:15, recurrence:'none'};
  await reconcileCalendarReminders(plugin, [event], 12, Date.parse('2026-11-18T12:00:00Z'));
  assert.deepEqual(calls[0], ['cancel',{notifications:[{id:1}]}]);
  assert.equal(calls[1][0], 'schedule');
  assert.equal(calls[1][1].notifications.length, 1);
  calls.length = 0;
  await reconcileCalendarReminders(plugin, [{...event, deleted:true}], 12, Date.parse('2026-11-18T12:00:00Z'));
  assert.deepEqual(calls, [['cancel',{notifications:[{id:1}]}]]);
});
