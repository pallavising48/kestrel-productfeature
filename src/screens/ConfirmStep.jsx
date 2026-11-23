import { useState } from 'react'
import { company } from '../data/seed.js'
import { cityLabel, tzAbbr } from '../utils/slots.js'

export default function ConfirmStep({ booking, onConfirm, onBack }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const { slot, host, inviteeZone } = booking

  function handleSubmit(e) {
    e.preventDefault()
    onConfirm({ ...booking, inviteeName: name, inviteeEmail: email })
  }

  return (
    <div className="screen">
      <button className="back-btn" onClick={onBack}>← Back to slots</button>
      <h2 className="screen-heading">Confirm your booking</h2>

      <div className="confirm-summary">
        <div className="confirm-time">
          <span className="confirm-time-primary">
            {slot.inviteeDT.toFormat('EEE d MMM, HH:mm')}
            <em> {cityLabel(inviteeZone)} ({tzAbbr(slot.inviteeDT)})</em>
          </span>
          <span className="confirm-time-secondary">
            {slot.hostDT.toFormat('HH:mm')} {host.name.split(' ')[0]}'s time
            <em> ({cityLabel(host.zone)}, {tzAbbr(slot.hostDT)})</em>
          </span>
        </div>
        <p className="confirm-meta">Weekly {company.meetingType}, 8 weeks from {slot.hostDT.toFormat('d MMM yyyy')}</p>
        <p className="confirm-meta">{company.name} · {host.name} · {company.durationMin} min</p>
      </div>

      <form className="confirm-form" onSubmit={handleSubmit}>
        <label className="field">
          <span>Your name</span>
          <input required value={name} onChange={e => setName(e.target.value)} placeholder="Alex Chen" />
        </label>
        <label className="field">
          <span>Email</span>
          <input required type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="alex@example.com" />
        </label>
        <button className="btn-primary" type="submit">Confirm booking</button>
      </form>
    </div>
  )
}
