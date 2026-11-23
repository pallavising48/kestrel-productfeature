import { DateTime } from 'luxon'

export function generateSlots(host, dateISO, inviteeZone) {
  const slots = []
  const [h1, m1] = host.workStart.split(':').map(Number)
  const [h2, m2] = host.workEnd.split(':').map(Number)

  let cursor = DateTime.fromISO(dateISO, { zone: host.zone }).set({ hour: h1, minute: m1, second: 0, millisecond: 0 })
  const end = DateTime.fromISO(dateISO, { zone: host.zone }).set({ hour: h2, minute: m2, second: 0, millisecond: 0 })

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
    slots.push({ hostDT: cursor, inviteeDT: inInvitee, dayTag })
    cursor = slotEnd
  }
  return slots
}

// For each candidate day D in [fromDateISO, fromDateISO + days),
// compare the zone's UTC offset at 12:00 on (D-1) with 12:00 on D.
// If they differ, the clock change happened on D.
export function findClockChanges(zone, fromDateISO, days = 14) {
  const changes = []
  const base = DateTime.fromISO(fromDateISO, { zone }).startOf('day')
  for (let i = 0; i < days; i++) {
    const D = base.plus({ days: i })
    const prevNoon = D.minus({ days: 1 }).set({ hour: 12, minute: 0, second: 0, millisecond: 0 })
    const currNoon = D.set({ hour: 12, minute: 0, second: 0, millisecond: 0 })
    if (prevNoon.offset !== currNoon.offset) {
      changes.push({
        zone,
        date: D,
        offsetBefore: prevNoon.offset,
        offsetAfter: currNoon.offset,
      })
    }
  }
  return changes
}

export function cityLabel(zone) {
  return zone.split('/').pop().replace(/_/g, ' ')
}

// Correct abbreviations where Luxon returns generic GMT±N
const TZ_ABBR = {
  'Europe/London': { 0: 'GMT', 60: 'BST' },
  'Europe/Berlin': { 60: 'CET', 120: 'CEST' },
  'Europe/Paris':  { 60: 'CET', 120: 'CEST' },
}

export function tzAbbr(dt) {
  const overrides = TZ_ABBR[dt.zoneName]
  if (overrides && overrides[dt.offset] !== undefined) return overrides[dt.offset]
  return dt.offsetNameShort
}
