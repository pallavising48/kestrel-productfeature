import { useState, useMemo } from 'react'
import { DateTime } from 'luxon'
import { hosts, inviteeZones, company } from '../data/seed.js'
import { cityLabel } from '../utils/slots.js'

const ANCHOR_DATE = '2027-03-02' // 8 Tuesdays starting here
const DEFAULT_ANCHOR_TIME = '10:00'

function getOccurrences(host, inviteeZone, anchorTime, count = 8) {
  const [h, m] = anchorTime.split(':').map(Number)
  const rows = []
  let cursor = DateTime.fromISO(ANCHOR_DATE, { zone: host.zone }).set({ hour: h, minute: m, second: 0, millisecond: 0 })

  for (let i = 0; i < count; i++) {
    // Skip to next Tuesday (weekday 2) if cursor isn't one
    while (cursor.weekday !== 2) cursor = cursor.plus({ days: 1 })

    const inInvitee = cursor.setZone(inviteeZone)

    // Check previous occurrence offset
    let clockChange = false
    let changeDate = null
    if (rows.length > 0) {
      const prev = rows[rows.length - 1]
      if (prev.inviteeDT.offset !== inInvitee.offset) {
        clockChange = true
        // Find the transition date between prev and this
        let probe = prev.inviteeDT
        while (probe < inInvitee) {
          const next = probe.plus({ days: 1 })
          if (probe.offset !== next.offset) {
            changeDate = probe.plus({ days: 1 }).startOf('day')
            break
          }
          probe = next
        }
      }
    }

    rows.push({
      hostDT: cursor,
      inviteeDT: inInvitee,
      clockChange,
      changeDate,
    })

    cursor = cursor.plus({ weeks: 1 })
  }
  return rows
}

function HeadsUpModal({ row, host, inviteeZone, onClose }) {
  const { hostDT, inviteeDT, changeDate } = row
  // find before/after
  const beforeInvitee = hostDT.minus({ weeks: 1 }).setZone(inviteeZone)
  const afterInvitee = inviteeDT
  const changingCity = changeDate
    ? (changeDate.setZone(inviteeZone).offset !== changeDate.minus({ days: 1 }).setZone(inviteeZone).offset
      ? cityLabel(inviteeZone)
      : cityLabel(host.zone))
    : cityLabel(inviteeZone)
  const sendDate = changeDate ? changeDate.minus({ days: 7 }).toFormat('EEE d MMM') : '—'

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>✕</button>
        <div className="email-label">Heads-up email preview · Send {sendDate}</div>
        <div className="email-subject">Your {company.meetingType} time is changing</div>
        <div className="email-body" style={{ marginTop: '1rem' }}>
          <p>Your <strong>{company.meetingType}</strong> with {company.name} moves to{' '}
            <strong>{afterInvitee.toFormat('HH:mm')}</strong> from {afterInvitee.toFormat('EEE d MMM')}{' '}
            (it was <strong>{beforeInvitee.toFormat('HH:mm')}</strong>).</p>
          <p>Clocks change in <strong>{changingCity}</strong> on {changeDate?.toFormat('EEE d MMM') ?? '—'}. No action needed.</p>
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
        Recurring meetings stay at <strong>{anchorTime} {cityLabel(host.zone)}</strong> for {host.name.split(' ')[0]}.
        Invitee times shift only when their clocks change, and we tell them in advance.
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
            {rows.map((row, i) => (
              <tr key={i} className={row.clockChange ? 'row-change' : ''}>
                <td>{row.hostDT.toFormat('EEE d MMM yyyy')}</td>
                <td>{row.hostDT.toFormat('HH:mm')} <span className="tz-tag">{row.hostDT.offsetNameShort}</span></td>
                <td>{row.inviteeDT.toFormat('HH:mm')} <span className="tz-tag">{row.inviteeDT.offsetNameShort}</span></td>
                <td>
                  {row.clockChange && (
                    <button className="chip-btn" onClick={() => setModalRow(row)}>
                      Clock change · Heads-up sent {row.changeDate ? row.changeDate.minus({ days: 7 }).toFormat('d MMM') : '—'}
                    </button>
                  )}
                </td>
              </tr>
            ))}
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
