import { DateTime, Interval } from 'luxon'

export function generateSlots(host, dateISO, inviteeZone) {
  const slots = []
  const [h1, m1] = host.workStart.split(':').map(Number)
  const [h2, m2] = host.workEnd.split(':').map(Number)

  let cursor = DateTime.fromISO(dateISO, { zone: host.zone }).set({ hour: h1, minute: m1, second: 0, millisecond: 0 })
  const end = DateTime.fromISO(dateISO, { zone: host.zone }).set({ hour: h2, minute: m2, second: 0, millisecond: 0 })

  // skip non-work days
  if (!host.workDays.includes(cursor.weekday)) return []

  while (cursor < end) {
    const slotEnd = cursor.plus({ minutes: 30 })
    if (slotEnd > end) break

    const inInvitee = cursor.setZone(inviteeZone)
    const hostDate = cursor.toISODate()
    const inviteeDate = inInvitee.toISODate()
    let dayTag = null
    if (inviteeDate > hostDate) dayTag = 'next day'
    if (inviteeDate < hostDate) dayTag = 'previous day'

    slots.push({
      hostDT: cursor,
      inviteeDT: inInvitee,
      dayTag,
    })
    cursor = slotEnd
  }
  return slots
}

export function findClockChanges(zone, dateISO) {
  // Check the 7-day window starting at dateISO for DST transitions
  const changes = []
  const start = DateTime.fromISO(dateISO, { zone })
  for (let i = 0; i < 7; i++) {
    const a = start.plus({ days: i })
    const b = start.plus({ days: i + 1 })
    if (a.offset !== b.offset) {
      // Find the exact day
      changes.push({
        zone,
        date: a.startOf('day').plus({ hours: 3 }).setZone(zone).startOf('day'),
        offsetBefore: a.offset,
        offsetAfter: b.offset,
      })
    }
  }
  return changes
}

export function formatZoneLabel(dt) {
  return `${dt.offsetNameShort}`
}

export function cityLabel(zone) {
  return zone.split('/').pop().replace(/_/g, ' ')
}
