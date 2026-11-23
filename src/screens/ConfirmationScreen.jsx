import { useState } from 'react'
import { DateTime } from 'luxon'
import { company } from '../data/seed.js'
import { cityLabel, findClockChanges } from '../utils/slots.js'

function generateICS(slot, host, inviteeName) {
  const start = slot.hostDT.toUTC()
  const end = start.plus({ minutes: company.durationMin })
  const fmt = dt => dt.toFormat("yyyyMMdd'T'HHmmss'Z'")
  const uid = `kestrel-${start.toMillis()}@kestrel.app`
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Kestrel//EN',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${fmt(DateTime.utc())}`,
    `DTSTART:${fmt(start)}`,
    `DTEND:${fmt(end)}`,
    `SUMMARY:${company.meetingType} with ${company.name}`,
    `DESCRIPTION:Host: ${host.name}\\nAttendee: ${inviteeName}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n')
}

function downloadICS(slot, host, inviteeName) {
  const content = generateICS(slot, host, inviteeName)
  const blob = new Blob([content], { type: 'text/calendar' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'kestrel-booking.ics'
  a.click()
  URL.revokeObjectURL(url)
}

function EmailCard({ subject, children, sendDate }) {
  return (
    <div className="email-card">
      <div className="email-header">
        <div>
          <div className="email-label">Email preview</div>
          <div className="email-subject">{subject}</div>
        </div>
        {sendDate && <div className="email-send-date">Send: {sendDate}</div>}
      </div>
      <div className="email-body">{children}</div>
    </div>
  )
}

export default function ConfirmationScreen({ booking, onReset }) {
  const { slot, host, inviteeZone, inviteeName = 'Alex Chen', inviteeEmail = 'alex@example.com' } = booking
  const [headsUpView, setHeadsUpView] = useState('invitee')

  const dateLabel = slot.inviteeDT.toFormat('EEE d MMM')
  const hostDateLabel = slot.hostDT.toFormat('EEE d MMM')
  const subjectDate = slot.hostDT.toFormat('EEE d MMM')

  // Find clock changes in next 14 days from slot
  const slotDateISO = slot.hostDT.toISODate()
  const hostChanges = findClockChanges(host.zone, slotDateISO)
  const inviteeChanges = findClockChanges(inviteeZone, slotDateISO)
  const allChanges = [...hostChanges, ...inviteeChanges]

  // For heads-up email: pick first clock change within 14 days
  const nextChange = allChanges.length > 0 ? allChanges[0] : null

  // Compute before/after times for invitee
  let headsUpSendDate = null
  let inviteeBefore = null
  let inviteeAfter = null
  let changingCity = null
  let hostAffected = false

  if (nextChange) {
    headsUpSendDate = nextChange.date.minus({ days: 7 }).toFormat('EEE d MMM')
    changingCity = cityLabel(nextChange.zone)
    // Before change
    inviteeBefore = slot.hostDT.setZone(inviteeZone)
    // After change: add a week so we're past the transition
    const afterDT = slot.hostDT.plus({ days: 7 })
    inviteeAfter = afterDT.setZone(inviteeZone)
    hostAffected = nextChange.zone === host.zone
  }

  return (
    <div className="screen">
      <h2 className="screen-heading">Booking confirmed</h2>
      <p className="screen-sub">{company.name} · {host.name} · {company.durationMin} min</p>

      <EmailCard subject={`Confirmed: ${company.meetingType}, ${subjectDate}`}>
        <p>Hi {inviteeName},</p>
        <p>Your <strong>{company.meetingType}</strong> with <strong>{company.name}</strong> is confirmed.</p>
        <p className="email-time-block">
          <strong>{slot.inviteeDT.toFormat('EEE d MMM, HH:mm')} {cityLabel(inviteeZone)} ({slot.inviteeDT.offsetNameShort})</strong><br />
          <strong>{slot.hostDT.toFormat('EEE d MMM, HH:mm')} {cityLabel(host.zone)} ({slot.hostDT.offsetNameShort})</strong>
        </p>
        <p>Host: {host.name}</p>
      </EmailCard>

      <EmailCard subject={`Reminder: ${company.meetingType} tomorrow — ${subjectDate}`}>
        <p>Hi {inviteeName}, just a reminder for tomorrow:</p>
        <p className="email-time-block">
          <strong>{slot.inviteeDT.toFormat('HH:mm')} {cityLabel(inviteeZone)} ({slot.inviteeDT.offsetNameShort})</strong><br />
          <strong>{slot.hostDT.toFormat('HH:mm')} {cityLabel(host.zone)} ({slot.hostDT.offsetNameShort})</strong>
        </p>
      </EmailCard>

      {nextChange ? (
        <div className="email-card">
          <div className="email-header">
            <div>
              <div className="email-label">Email preview · clock change heads-up</div>
              <div className="email-subject">Your {company.meetingType} time is changing</div>
            </div>
            <div className="email-send-date">Send: {headsUpSendDate}</div>
          </div>
          <div className="heads-up-toggle">
            <button
              className={`toggle-btn${headsUpView === 'invitee' ? ' toggle-btn--active' : ''}`}
              onClick={() => setHeadsUpView('invitee')}
            >Invitee</button>
            <button
              className={`toggle-btn${headsUpView === 'host' ? ' toggle-btn--active' : ''}`}
              onClick={() => setHeadsUpView('host')}
            >Host</button>
          </div>
          <div className="email-body">
            {headsUpView === 'invitee' ? (
              <>
                <p>Hi {inviteeName},</p>
                <p>
                  Your <strong>{company.meetingType}</strong> with {company.name} moves to{' '}
                  <strong>{inviteeAfter?.toFormat('HH:mm')}</strong> from {inviteeAfter?.toFormat('EEE d MMM')}{' '}
                  (it was <strong>{inviteeBefore?.toFormat('HH:mm')}</strong>).
                </p>
                <p>Clocks change in <strong>{changingCity}</strong> on {nextChange.date.toFormat('EEE d MMM')}. No action needed.</p>
              </>
            ) : (
              <>
                <p>Hi {host.name.split(' ')[0]},</p>
                <p>Your time stays <strong>{slot.hostDT.toFormat('HH:mm')} {cityLabel(host.zone)}</strong>.</p>
                <p>
                  Clocks change for 1 invitee: <strong>{inviteeName} ({cityLabel(inviteeZone)})</strong> will see{' '}
                  <strong>{inviteeAfter?.toFormat('HH:mm')}</strong> from {inviteeAfter?.toFormat('EEE d MMM')}.
                </p>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="email-card email-card--muted">
          <div className="email-label">Clock change heads-up</div>
          <p>No clock changes in the next 14 days for either zone — no heads-up email needed.</p>
        </div>
      )}

      <div className="confirmation-actions">
        <button className="btn-primary" onClick={() => downloadICS(slot, host, inviteeName)}>
          Download calendar invite (.ics)
        </button>
        <button className="btn-secondary" onClick={onReset}>Book another slot</button>
      </div>
    </div>
  )
}
