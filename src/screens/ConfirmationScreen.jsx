import { useState } from 'react'
import { DateTime } from 'luxon'
import { company } from '../data/seed.js'
import { cityLabel, findClockChanges, tzAbbr } from '../utils/slots.js'

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

function TimeLine({ primaryDT, primaryCity, secondaryDT, secondaryCity, secondaryName }) {
  return (
    <p className="email-time-block">
      <strong>
        {primaryDT.toFormat('HH:mm')} {primaryCity} ({tzAbbr(primaryDT)})
      </strong>
      <span className="email-time-secondary-inline">
        {' · '}{secondaryName}: {secondaryDT.toFormat('HH:mm')} {secondaryCity} ({tzAbbr(secondaryDT)})
      </span>
    </p>
  )
}

function EmailCard({ label, subject, sendStatus, children }) {
  return (
    <div className="email-card">
      <div className="email-header">
        <div>
          <div className="email-label">{label ?? 'Email preview'}</div>
          <div className="email-subject">{subject}</div>
        </div>
        {sendStatus && (
          <div className={`email-send-date ${sendStatus.scheduled ? 'send-status--scheduled' : 'send-status--sent'}`}>
            {sendStatus.text}
          </div>
        )}
      </div>
      <div className="email-body">{children}</div>
    </div>
  )
}

export default function ConfirmationScreen({ booking, onReset }) {
  const { slot, host, inviteeZone, inviteeName = 'Alex Chen' } = booking
  const [role, setRole] = useState('invitee')
  const isInvitee = role === 'invitee'
  const recipientName = isInvitee ? inviteeName : host.name.split(' ')[0]
  const subjectDate = slot.hostDT.toFormat('EEE d MMM')

  // Find first clock change in 14-day window from the slot date
  const slotDateISO = slot.hostDT.toISODate()
  const allChanges = [
    ...findClockChanges(host.zone, slotDateISO, 14),
    ...findClockChanges(inviteeZone, slotDateISO, 14),
  ].sort((a, b) => (a.date < b.date ? -1 : 1))
  const nextChange = allChanges[0] ?? null

  let headsUpSendDT = null
  let inviteeBefore = null
  let inviteeAfter = null
  let changingCity = null
  let headsUpSendStatus = null

  if (nextChange) {
    headsUpSendDT = nextChange.date.minus({ days: 7 })
    changingCity = cityLabel(nextChange.zone)
    inviteeBefore = slot.hostDT.setZone(inviteeZone)
    inviteeAfter = slot.hostDT.plus({ days: 7 }).setZone(inviteeZone)
    const isFuture = headsUpSendDT > DateTime.now()
    headsUpSendStatus = {
      scheduled: isFuture,
      text: isFuture
        ? `Scheduled to send ${headsUpSendDT.toFormat('d MMM yyyy')}`
        : `Sent ${headsUpSendDT.toFormat('d MMM yyyy')}`,
    }
  }

  return (
    <div className="screen">
      <div className="role-toggle-row">
        <span className="role-toggle-label">Viewing emails as:</span>
        <div className="role-toggle">
          <button
            className={`toggle-btn${isInvitee ? ' toggle-btn--active' : ''}`}
            onClick={() => setRole('invitee')}
          >
            Invitee · {inviteeName}
          </button>
          <button
            className={`toggle-btn${!isInvitee ? ' toggle-btn--active' : ''}`}
            onClick={() => setRole('host')}
          >
            Host · {host.name}
          </button>
        </div>
      </div>

      {/* Email 1: Confirmation */}
      <EmailCard subject={`Confirmed: ${company.meetingType}, ${subjectDate}`}>
        <p>Hi {recipientName},</p>
        <p>
          {isInvitee
            ? <><strong>{company.meetingType}</strong> with <strong>{company.name}</strong> confirmed.</>
            : <>New booking: <strong>{company.meetingType}</strong> with {inviteeName}.</>}
        </p>
        {isInvitee ? (
          <TimeLine
            primaryDT={slot.inviteeDT} primaryCity={cityLabel(inviteeZone)}
            secondaryDT={slot.hostDT}  secondaryCity={cityLabel(host.zone)} secondaryName={host.name.split(' ')[0]}
          />
        ) : (
          <TimeLine
            primaryDT={slot.hostDT}   primaryCity={cityLabel(host.zone)}
            secondaryDT={slot.inviteeDT} secondaryCity={cityLabel(inviteeZone)} secondaryName={inviteeName}
          />
        )}
        {isInvitee && <p>Host: {host.name}</p>}
      </EmailCard>

      {/* Email 2: 24h reminder */}
      <EmailCard subject={`Reminder: ${company.meetingType} tomorrow — ${subjectDate}`}>
        <p>
          Hi {recipientName},{' '}
          {isInvitee ? 'just a reminder for tomorrow:' : `reminder: ${company.meetingType} with ${inviteeName} tomorrow.`}
        </p>
        {isInvitee ? (
          <TimeLine
            primaryDT={slot.inviteeDT} primaryCity={cityLabel(inviteeZone)}
            secondaryDT={slot.hostDT}  secondaryCity={cityLabel(host.zone)} secondaryName={host.name.split(' ')[0]}
          />
        ) : (
          <TimeLine
            primaryDT={slot.hostDT}   primaryCity={cityLabel(host.zone)}
            secondaryDT={slot.inviteeDT} secondaryCity={cityLabel(inviteeZone)} secondaryName={inviteeName}
          />
        )}
      </EmailCard>

      {/* Email 3: Clock-change heads-up */}
      {nextChange ? (
        <EmailCard
          label="Email preview · clock change heads-up"
          subject={`Your ${company.meetingType} time is changing`}
          sendStatus={headsUpSendStatus}
        >
          {isInvitee ? (
            <>
              <p>Hi {inviteeName},</p>
              <p>
                Your <strong>{company.meetingType}</strong> with {company.name} moves to{' '}
                <strong>{inviteeAfter?.toFormat('HH:mm')}</strong> from {inviteeAfter?.toFormat('EEE d MMM')}{' '}
                (it was <strong>{inviteeBefore?.toFormat('HH:mm')}</strong>).
              </p>
              <TimeLine
                primaryDT={inviteeAfter}  primaryCity={cityLabel(inviteeZone)}
                secondaryDT={slot.hostDT} secondaryCity={cityLabel(host.zone)} secondaryName={host.name.split(' ')[0]}
              />
              <p>Clocks change in <strong>{changingCity}</strong> on {nextChange.date.toFormat('EEE d MMM')}. No action needed.</p>
            </>
          ) : (
            <>
              <p>Hi {host.name.split(' ')[0]},</p>
              <p>
                Your time stays{' '}
                <strong>{slot.hostDT.toFormat('HH:mm')} {cityLabel(host.zone)} ({tzAbbr(slot.hostDT)})</strong>.
              </p>
              <TimeLine
                primaryDT={slot.hostDT}    primaryCity={cityLabel(host.zone)}
                secondaryDT={inviteeAfter} secondaryCity={cityLabel(inviteeZone)} secondaryName={inviteeName}
              />
              <p>
                Clocks change in <strong>{changingCity}</strong> on {nextChange.date.toFormat('EEE d MMM')}.{' '}
                <strong>{inviteeName} ({cityLabel(inviteeZone)})</strong> will see{' '}
                <strong>{inviteeAfter?.toFormat('HH:mm')}</strong> from {inviteeAfter?.toFormat('EEE d MMM')}.
              </p>
            </>
          )}
        </EmailCard>
      ) : (
        <div className="email-card email-card--muted">
          <div className="email-label">Clock change heads-up</div>
          <p style={{ padding: '1rem', fontSize: '0.875rem', color: 'var(--muted)' }}>
            No clock changes in the next 14 days for either zone — no heads-up email needed.
          </p>
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
