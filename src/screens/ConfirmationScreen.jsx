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
      {secondaryName && (
        <span className="email-time-secondary-inline">
          {' · '}{secondaryName}: {secondaryDT.toFormat('HH:mm')} {secondaryCity} ({tzAbbr(secondaryDT)})
        </span>
      )}
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
  const isSameZone = host.zone === inviteeZone
  const recipientName = isInvitee ? inviteeName : host.name.split(' ')[0]
  const subjectDate = slot.hostDT.toFormat('EEE d MMM')

  // 8 weekly occurrences starting from the booked slot
  const occurrences = Array.from({ length: 8 }, (_, i) => ({
    hostDT: slot.hostDT.plus({ weeks: i }),
    inviteeDT: slot.hostDT.plus({ weeks: i }).setZone(inviteeZone),
  }))

  // First occurrence where the invitee's displayed time (HH:mm) changes
  let changeIdx = -1
  for (let i = 1; i < occurrences.length; i++) {
    if (occurrences[i].inviteeDT.toFormat('HH:mm') !== occurrences[i - 1].inviteeDT.toFormat('HH:mm')) {
      changeIdx = i
      break
    }
  }

  const hasHeadsUp = changeIdx !== -1
  let inviteeBefore = null, inviteeAfter = null, afterOcc = null
  let changingCity = null, changeDate = null, headsUpSendStatus = null

  if (hasHeadsUp) {
    const beforeOcc = occurrences[changeIdx - 1]
    afterOcc = occurrences[changeIdx]
    inviteeBefore = beforeOcc.inviteeDT
    inviteeAfter = afterOcc.inviteeDT

    const inviteeSideChanged = beforeOcc.inviteeDT.offset !== afterOcc.inviteeDT.offset
    const changingZone = inviteeSideChanged ? inviteeZone : host.zone
    changingCity = cityLabel(changingZone)

    const scanChanges = findClockChanges(changingZone, beforeOcc.hostDT.toISODate(), 8)
    changeDate = scanChanges[0]?.date ?? null

    if (changeDate) {
      const headsUpSendDT = changeDate.minus({ days: 7 })
      const isFuture = headsUpSendDT > DateTime.now()
      headsUpSendStatus = {
        scheduled: isFuture,
        text: isFuture
          ? `Scheduled to send ${headsUpSendDT.toFormat('d MMM yyyy')}`
          : `Sent ${headsUpSendDT.toFormat('d MMM yyyy')}`,
      }
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
            secondaryDT={slot.hostDT}  secondaryCity={cityLabel(host.zone)}
            secondaryName={isSameZone ? null : host.name.split(' ')[0]}
          />
        ) : (
          <TimeLine
            primaryDT={slot.hostDT}   primaryCity={cityLabel(host.zone)}
            secondaryDT={slot.inviteeDT} secondaryCity={cityLabel(inviteeZone)}
            secondaryName={isSameZone ? null : inviteeName}
          />
        )}
        {isSameZone && <p>You and {isInvitee ? host.name.split(' ')[0] : inviteeName} are in the same time zone.</p>}
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
            secondaryDT={slot.hostDT}  secondaryCity={cityLabel(host.zone)}
            secondaryName={isSameZone ? null : host.name.split(' ')[0]}
          />
        ) : (
          <TimeLine
            primaryDT={slot.hostDT}   primaryCity={cityLabel(host.zone)}
            secondaryDT={slot.inviteeDT} secondaryCity={cityLabel(inviteeZone)}
            secondaryName={isSameZone ? null : inviteeName}
          />
        )}
        {isSameZone && <p>You and {isInvitee ? host.name.split(' ')[0] : inviteeName} are in the same time zone.</p>}
      </EmailCard>

      {/* Email 3: Clock-change heads-up */}
      {hasHeadsUp ? (
        <EmailCard
          label="Email preview · clock change heads-up"
          subject={`Your weekly ${company.meetingType} time is changing`}
          sendStatus={headsUpSendStatus}
        >
          {isInvitee ? (
            <>
              <p>Hi {inviteeName},</p>
              <p>
                From <strong>{afterOcc.inviteeDT.toFormat('EEE d MMM')}</strong>, your weekly{' '}
                <strong>{company.meetingType}</strong> is at{' '}
                <strong>{inviteeAfter.toFormat('HH:mm')} {cityLabel(inviteeZone)} ({tzAbbr(inviteeAfter)})</strong>{' '}
                (it was <strong>{inviteeBefore.toFormat('HH:mm')}</strong>).
              </p>
              <p>Clocks change in <strong>{changingCity}</strong> on {changeDate?.toFormat('EEE d MMM')}. No action needed.</p>
            </>
          ) : (
            <>
              <p>Hi {host.name.split(' ')[0]},</p>
              <p>
                Your time stays{' '}
                <strong>{afterOcc.hostDT.toFormat('HH:mm')} {cityLabel(host.zone)} ({tzAbbr(afterOcc.hostDT)})</strong>.
              </p>
              <p>
                Clocks change in <strong>{changingCity}</strong> on {changeDate?.toFormat('EEE d MMM')}.{' '}
                <strong>{inviteeName} ({cityLabel(inviteeZone)})</strong> will see{' '}
                <strong>{inviteeAfter.toFormat('HH:mm')}</strong> from {afterOcc.inviteeDT.toFormat('EEE d MMM')}.
              </p>
            </>
          )}
        </EmailCard>
      ) : (
        <div className="email-card email-card--muted">
          <div className="email-label">Clock change heads-up</div>
          <p style={{ padding: '1rem', fontSize: '0.875rem', color: 'var(--muted)' }}>
            No clock changes affect this weekly series (8 weeks from {slot.hostDT.toFormat('d MMM yyyy')}).
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
