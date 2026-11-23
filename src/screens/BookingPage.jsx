import { useState, useMemo } from 'react'
import { DateTime } from 'luxon'
import { hosts, inviteeZones, DEFAULT_DATE, company } from '../data/seed.js'
import { generateSlots, findClockChanges, cityLabel, tzAbbr } from '../utils/slots.js'

function parseDateStrict(str) {
  if (!str) return null
  const dt = DateTime.fromISO(str)
  if (!dt.isValid) return null
  if (dt.year < 2026 || dt.year > 2028) return null
  return dt
}

export default function BookingPage({ onBook, inviteeZone, onZoneChange }) {
  const [hostId, setHostId] = useState(hosts[0].id)
  const [date, setDate] = useState(DEFAULT_DATE)

  const host = hosts.find(h => h.id === hostId)
  const chosenDT = parseDateStrict(date)
  const dateValid = chosenDT !== null

  const slots = useMemo(() => {
    if (!dateValid) return []
    return generateSlots(host, date, inviteeZone)
  }, [host, date, inviteeZone, dateValid])

  const banner = useMemo(() => {
    if (!dateValid || host.zone === inviteeZone) return null

    // 14 days before + 14 days after the chosen date (29-day window)
    const scanStart = chosenDT.minus({ days: 14 }).toISODate()
    const hChanges = findClockChanges(host.zone, scanStart, 29)
    const iChanges = findClockChanges(inviteeZone, scanStart, 29)

    // Deduplicate: at most one entry per zone per change date
    const seen = new Set()
    const all = []
    for (const c of [...hChanges, ...iChanges]) {
      const key = `${c.zone}-${c.date.toISODate()}`
      if (!seen.has(key)) { seen.add(key); all.push(c) }
    }
    all.sort((a, b) => (a.date < b.date ? -1 : 1))
    if (all.length === 0) return null

    const gapNow = Math.abs(
      DateTime.fromISO(date, { zone: host.zone }).offset -
      DateTime.fromISO(date, { zone: inviteeZone }).offset
    ) / 60

    const futureChanges = all.filter(c => c.date > chosenDT)
    let gapText
    if (futureChanges.length > 0) {
      const afterISO = futureChanges[futureChanges.length - 1].date.plus({ days: 1 }).toISODate()
      const gapAfter = Math.abs(
        DateTime.fromISO(afterISO, { zone: host.zone }).offset -
        DateTime.fromISO(afterISO, { zone: inviteeZone }).offset
      ) / 60
      gapText = `The gap to ${host.name.split(' ')[0]} is ${gapNow} hours until ${futureChanges[0].date.toFormat('d MMM')}, then ${gapAfter} hours.`
    } else {
      gapText = `The gap to ${host.name.split(' ')[0]} is now ${gapNow} hours.`
    }

    // Past tense for changes before the chosen date, future tense for after
    const parts = all.map((c, i) => {
      const city = cityLabel(c.zone)
      const d = c.date.toFormat('d MMM')
      const isPast = c.date < chosenDT
      if (i === 0) return isPast ? `Clocks changed in ${city} on ${d}` : `Clocks change in ${city} on ${d}`
      return isPast ? `and changed in ${city} on ${d}` : `and change in ${city} on ${d}`
    })

    return `${parts.join(' ')}. ${gapText} Times below are already adjusted.`
  }, [host, inviteeZone, date, dateValid, chosenDT])

  return (
    <div className="screen">
      <h2 className="screen-heading">Book a {company.meetingType} with {company.name}</h2>
      <p className="screen-sub">{company.name} · {company.durationMin} min</p>

      <div className="controls">
        <label className="field">
          <span>Meet with</span>
          <select value={hostId} onChange={e => setHostId(e.target.value)}>
            {hosts.map(h => <option key={h.id} value={h.id}>{h.name} ({cityLabel(h.zone)})</option>)}
          </select>
        </label>
        <label className="field">
          <span>Your time zone</span>
          <select value={inviteeZone} onChange={e => onZoneChange(e.target.value)}>
            {inviteeZones.map(z => <option key={z} value={z}>{z.replace(/_/g, ' ')}</option>)}
          </select>
        </label>
        <label className="field">
          <span>Date</span>
          <input
            type="date"
            value={date}
            min="2026-01-01"
            max="2028-12-31"
            onChange={e => setDate(e.target.value)}
          />
          {!dateValid && date !== '' && (
            <span className="field-error">Enter a valid date between 2026 and 2028.</span>
          )}
        </label>
      </div>

      {dateValid && banner && <div className="dst-banner">{banner}</div>}

      {dateValid && (
        slots.length === 0 ? (
          <p className="no-slots">No available slots on this day (non-working day or outside hours).</p>
        ) : (
          <div className="slots-grid">
            {slots.map((s, i) => (
              <button key={i} className="slot-btn" onClick={() => onBook({ slot: s, host, inviteeZone })}>
                <span className="slot-primary">
                  {s.inviteeDT.toFormat('HH:mm')} your time
                  <em> ({cityLabel(inviteeZone)}, {tzAbbr(s.inviteeDT)})</em>
                </span>
                <span className="slot-secondary">
                  {s.hostDT.toFormat('HH:mm')} {host.name.split(' ')[0]}'s time
                  <em> ({cityLabel(host.zone)}, {tzAbbr(s.hostDT)})</em>
                </span>
                {s.dayTag && <span className="day-tag">{s.dayTag}</span>}
              </button>
            ))}
          </div>
        )
      )}
    </div>
  )
}
