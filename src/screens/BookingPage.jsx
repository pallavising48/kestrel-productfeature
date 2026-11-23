import { useState, useMemo } from 'react'
import { DateTime } from 'luxon'
import { hosts, inviteeZones, DEFAULT_DATE, company } from '../data/seed.js'
import { generateSlots, findClockChanges, cityLabel } from '../utils/slots.js'

export default function BookingPage({ onBook, inviteeZone, onZoneChange }) {
  const [hostId, setHostId] = useState(hosts[0].id)
  const [date, setDate] = useState(DEFAULT_DATE)

  const host = hosts.find(h => h.id === hostId)

  const slots = useMemo(() => generateSlots(host, date, inviteeZone), [host, date, inviteeZone])

  const clockChanges = useMemo(() => {
    const hChanges = findClockChanges(host.zone, date)
    const iChanges = findClockChanges(inviteeZone, date)
    return [...hChanges, ...iChanges]
  }, [host.zone, inviteeZone, date])

  function bannerText() {
    if (clockChanges.length === 0) return null
    return clockChanges.map(c => {
      const city = cityLabel(c.zone)
      const d = c.date.toFormat('EEE d MMM')
      const gapBefore = Math.abs(
        DateTime.fromISO(date, { zone: host.zone }).offset -
        DateTime.fromISO(date, { zone: inviteeZone }).offset
      ) / 60
      const gapAfter = Math.abs(
        DateTime.fromISO(date, { zone: host.zone }).plus({ days: 7 }).offset -
        DateTime.fromISO(date, { zone: inviteeZone }).plus({ days: 7 }).offset
      ) / 60
      return `Clocks change in ${city} on ${d}. The gap between you and ${cityLabel(host.zone)} is ${gapBefore}h this week, ${gapAfter}h from ${c.date.plus({ days: 1 }).toFormat('d MMM')}. Times below are already adjusted.`
    }).join(' ')
  }

  const banner = bannerText()

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
                <em> ({cityLabel(inviteeZone)}, {s.inviteeDT.offsetNameShort})</em>
              </span>
              <span className="slot-secondary">
                {s.hostDT.toFormat('HH:mm')} {host.name.split(' ')[0]}'s time
                <em> ({cityLabel(host.zone)}, {s.hostDT.offsetNameShort})</em>
              </span>
              {s.dayTag && <span className="day-tag">{s.dayTag}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
