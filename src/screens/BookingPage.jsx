import { useState, useMemo } from 'react'
import { DateTime } from 'luxon'
import { hosts, inviteeZones, DEFAULT_DATE, company } from '../data/seed.js'
import { generateSlots, findClockChanges, cityLabel, tzAbbr } from '../utils/slots.js'

export default function BookingPage({ onBook, inviteeZone, onZoneChange }) {
  const [hostId, setHostId] = useState(hosts[0].id)
  const [date, setDate] = useState(DEFAULT_DATE)

  const host = hosts.find(h => h.id === hostId)
  const slots = useMemo(() => generateSlots(host, date, inviteeZone), [host, date, inviteeZone])

  // Scan 15 days starting from 1 day before chosen date to catch recent changes too
  const banner = useMemo(() => {
    const scanStart = DateTime.fromISO(date).minus({ days: 1 }).toISODate()
    const hChanges = findClockChanges(host.zone, scanStart, 15)
    const iChanges = findClockChanges(inviteeZone, scanStart, 15)
    const all = [...hChanges, ...iChanges].sort((a, b) => (a.date < b.date ? -1 : 1))
    if (all.length === 0) return null

    const chosenDT = DateTime.fromISO(date)
    const gapNow = Math.abs(
      DateTime.fromISO(date, { zone: host.zone }).offset -
      DateTime.fromISO(date, { zone: inviteeZone }).offset
    ) / 60

    const futureChanges = all.filter(c => c.date >= chosenDT)
    let gapText = ''
    if (futureChanges.length > 0) {
      const nextChangeDateISO = futureChanges[futureChanges.length - 1].date.plus({ days: 1 }).toISODate()
      const gapAfter = Math.abs(
        DateTime.fromISO(nextChangeDateISO, { zone: host.zone }).offset -
        DateTime.fromISO(nextChangeDateISO, { zone: inviteeZone }).offset
      ) / 60
      gapText = ` The gap to ${host.name.split(' ')[0]} is ${gapNow}h until ${futureChanges[0].date.toFormat('d MMM')}, ${gapAfter}h after.`
    } else {
      gapText = ` The gap to ${host.name.split(' ')[0]} is now ${gapNow}h.`
    }

    const parts = all.map((c, i) => {
      const city = cityLabel(c.zone)
      const d = c.date.toFormat('d MMM')
      const isPast = c.date < chosenDT
      if (i === 0) return isPast ? `Clocks changed in ${city} on ${d}` : `Clocks change in ${city} on ${d}`
      return isPast ? `changed in ${city} on ${d}` : `change in ${city} on ${d}`
    })

    return parts.join(' and ') + '.' + gapText + ' Times below are already adjusted.'
  }, [host, inviteeZone, date])

  return (
    <div className="screen">
      <h2 className="screen-heading">Book a {company.meetingType}</h2>
      <p className="screen-sub">{company.name} · {company.durationMin} min</p>

      <div className="controls">
        <label className="field">
          <span>Host</span>
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
          <input type="date" value={date} onChange={e => setDate(e.target.value)} />
        </label>
      </div>

      {banner && <div className="dst-banner">{banner}</div>}

      {slots.length === 0 ? (
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
      )}
    </div>
  )
}
