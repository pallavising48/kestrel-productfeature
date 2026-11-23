import { useState, useMemo } from 'react'
import { DateTime } from 'luxon'
import { hosts, inviteeZones, company } from '../data/seed.js'
import { cityLabel, tzAbbr } from '../utils/slots.js'

const ANCHOR_DATE = '2027-03-02'
const DEFAULT_ANCHOR_TIME = '10:00'

function getOccurrences(host, inviteeZone, anchorTime, count = 8) {
  const [h, m] = anchorTime.split(':').map(Number)
  const rows = []
  let cursor = DateTime.fromISO(ANCHOR_DATE, { zone: host.zone })
    .set({ hour: h, minute: m, second: 0, millisecond: 0 })

  for (let i = 0; i < count; i++) {
    while (cursor.weekday !== 2) cursor = cursor.plus({ days: 1 })

    const inInvitee = cursor.setZone(inviteeZone)
    let clockChange = false
    let changeDate = null
    let changingZone = null

    if (rows.length > 0) {
      const prev = rows[rows.length - 1]
      // Flag whenever the invitee's displayed time actually differs (either side changed)
      if (prev.inviteeDT.toFormat('HH:mm') !== inInvitee.toFormat('HH:mm')) {
        clockChange = true
        const inviteeSideChanged = prev.inviteeDT.offset !== inInvitee.offset
        const hostSideChanged = prev.hostDT.offset !== cursor.offset
        // Attribute the change to whichever side's offset moved
        changingZone = inviteeSideChanged ? inviteeZone : host.zone
        // Find the exact transition date by probing in that zone
        let probe = DateTime.fromISO(prev.hostDT.toISODate(), { zone: changingZone })
        const probeEnd = DateTime.fromISO(cursor.toISODate(), { zone: changingZone })
        while (probe < probeEnd) {
          const next = probe.plus({ days: 1 })
          if (probe.offset !== next.offset) {
            changeDate = next.startOf('day')
            break
          }
          probe = next
        }
      }
    }

    rows.push({ hostDT: cursor, inviteeDT: inInvitee, clockChange, changeDate, changingZone })
    cursor = cursor.plus({ weeks: 1 })
  }
  return rows
}

function headsUpStatus(changeDate) {
  if (!changeDate) return { label: '—', scheduled: false }
  const sendDT = changeDate.minus({ days: 7 })
  const isFuture = sendDT > DateTime.now()
  return {
    label: sendDT.toFormat('d MMM'),
    fullLabel: sendDT.toFormat('d MMM yyyy'),
    scheduled: isFuture,
  }
}

function HeadsUpModal({ row, host, inviteeZone, onClose }) {
  const { hostDT, inviteeDT, changeDate, changingZone } = row
  const beforeInvitee = hostDT.minus({ weeks: 1 }).setZone(inviteeZone)
  const afterInvitee = inviteeDT
  const changingCity = changingZone ? cityLabel(changingZone) : cityLabel(inviteeZone)
  const status = headsUpStatus(changeDate)
  const statusText = status.scheduled
    ? `Scheduled to send ${status.fullLabel}`
    : `Sent ${status.fullLabel}`

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>✕</button>
        <div className="email-label">Heads-up email preview</div>
        <div className="email-subject">Your {company.meetingType} time is changing</div>
        <div className={`modal-send-status ${status.scheduled ? 'status--scheduled' : 'status--sent'}`}>
          {statusText}
        </div>
        <div className="email-body" style={{ marginTop: '0.75rem' }}>
          <p>
            Your <strong>{company.meetingType}</strong> with {company.name} moves to{' '}
            <strong>{afterInvitee.toFormat('HH:mm')}</strong> from {afterInvitee.toFormat('EEE d MMM')}{' '}
            (it was <strong>{beforeInvitee.toFormat('HH:mm')}</strong>).
          </p>
          <p>
            Clocks change in <strong>{changingCity}</strong> on{' '}
            {changeDate?.toFormat('EEE d MMM') ?? '—'}. No action needed.
          </p>
        </div>
      </div>
    </div>
  )
}

export default function DSTCheckScreen() {
  const [hostId, setHostId] = useState(hosts[0].id)
  const [inviteeZone, setInviteeZone] = useState('America/New_York')
  const [anchorTime, setAnchorTime] = useState(DEFAULT_ANCHOR_TIME)
  const [modalRow, setModalRow] = useState(null)

  const host = hosts.find(h => h.id === hostId)
  const rows = useMemo(() => getOccurrences(host, inviteeZone, anchorTime), [host, inviteeZone, anchorTime])

  return (
    <div className="screen">
      <h2 className="screen-heading">Daylight-saving check</h2>
      <p className="screen-sub">Admin view — recurring meeting impact</p>

      <div className="controls">
        <label className="field">
          <span>Host</span>
          <select value={hostId} onChange={e => setHostId(e.target.value)}>
            {hosts.map(h => <option key={h.id} value={h.id}>{h.name} ({cityLabel(h.zone)})</option>)}
          </select>
        </label>
        <label className="field">
          <span>Invitee zone</span>
          <select value={inviteeZone} onChange={e => setInviteeZone(e.target.value)}>
            {inviteeZones.map(z => <option key={z} value={z}>{z.replace(/_/g, ' ')}</option>)}
          </select>
        </label>
        <label className="field">
          <span>Anchor time ({cityLabel(host.zone)})</span>
          <input type="time" value={anchorTime} onChange={e => setAnchorTime(e.target.value)} />
        </label>
      </div>

      <p className="dst-note">
        Recurring meetings stay at <strong>{anchorTime} {cityLabel(host.zone)}</strong> for{' '}
        {host.name.split(' ')[0]}. The invitee's time shifts when either side's clocks change,
        and both get a heads-up 7 days before.
      </p>

      <div className="table-wrap">
        <table className="dst-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Host time</th>
              <th>Invitee time</th>
              <th>Note</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => {
              const status = row.clockChange ? headsUpStatus(row.changeDate) : null
              return (
                <tr key={i} className={row.clockChange ? 'row-change' : ''}>
                  <td>{row.hostDT.toFormat('EEE d MMM yyyy')}</td>
                  <td>
                    {row.hostDT.toFormat('HH:mm')}{' '}
                    <span className="tz-tag">{tzAbbr(row.hostDT)}</span>
                  </td>
                  <td>
                    {row.inviteeDT.toFormat('HH:mm')}{' '}
                    <span className="tz-tag">{tzAbbr(row.inviteeDT)}</span>
                  </td>
                  <td>
                    {row.clockChange && status && (
                      <button
                        className={`chip-btn ${status.scheduled ? 'chip-btn--blue' : 'chip-btn--green'}`}
                        onClick={() => setModalRow(row)}
                      >
                        Clock change ({cityLabel(row.changingZone ?? inviteeZone)})
                        {' · '}
                        {status.scheduled ? 'Heads-up scheduled' : 'Heads-up sent'}
                        {' · '}{status.label}
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {modalRow && (
        <HeadsUpModal
          row={modalRow}
          host={host}
          inviteeZone={inviteeZone}
          onClose={() => setModalRow(null)}
        />
      )}
    </div>
  )
}
