import { useState } from 'react'
import './App.css'
import BookingPage from './screens/BookingPage.jsx'
import ConfirmStep from './screens/ConfirmStep.jsx'
import ConfirmationScreen from './screens/ConfirmationScreen.jsx'
import DSTCheckScreen from './screens/DSTCheckScreen.jsx'
import { hosts, inviteeZones } from './data/seed.js'
import { cityLabel } from './utils/slots.js'

function detectDefaultZone() {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
  return inviteeZones.includes(tz) ? tz : inviteeZones[1]
}

const TABS = [
  { id: 'booking', label: 'Booking page' },
  { id: 'emails',  label: 'Emails' },
  { id: 'dst',     label: 'DST check (admin)' },
]

function Logo() {
  return (
    <svg className="logo-mark" viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <circle cx="16" cy="16" r="14" fill="var(--brand)" />
      <path d="M10 22 L16 10 L22 22" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <path d="M12.5 18 H19.5" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  )
}

export default function App() {
  const [tab, setTab] = useState('booking')
  const [inviteeZone, setInviteeZone] = useState(detectDefaultZone)
  const [pendingBooking, setPendingBooking] = useState(null)
  const [confirmed, setConfirmed] = useState(null)

  function handleBook(data) { setPendingBooking(data) }
  function handleConfirm(data) {
    setConfirmed(data)
    setPendingBooking(null)
    setTab('emails')
  }
  function handleReset() {
    setPendingBooking(null)
    setConfirmed(null)
    setTab('booking')
  }

  // "Viewing as" label per tab
  const adminHost = hosts[0]
  const inviteeName = confirmed?.inviteeName ?? 'invitee'
  const viewingAs = {
    booking: `Viewing as: ${inviteeName}, invitee (${cityLabel(inviteeZone)})`,
    emails:  `Viewing as: ${inviteeName}, invitee (${cityLabel(inviteeZone)})`,
    dst:     `Viewing as: ${adminHost.name}, host (${cityLabel(adminHost.zone)})`,
  }

  function renderBookingFlow() {
    if (pendingBooking) return <ConfirmStep booking={pendingBooking} onConfirm={handleConfirm} onBack={() => setPendingBooking(null)} />
    return <BookingPage onBook={handleBook} inviteeZone={inviteeZone} onZoneChange={setInviteeZone} />
  }

  // Emails tab: use confirmed booking if available, else show placeholder prompt
  function renderEmails() {
    if (confirmed) return <ConfirmationScreen booking={confirmed} onReset={handleReset} />
    return (
      <div className="screen">
        <div className="placeholder-hint">
          <span className="placeholder-icon">✉</span>
          <p>Book a slot on the <strong>Booking page</strong> tab to see the email previews here.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="app">
      <header className="header">
        <div className="header-inner">
          <div className="brand">
            <Logo />
            <span className="brand-name">Kestrel</span>
          </div>
          <span className="feature-badge">Time-Zone-Safe Booking</span>
        </div>
      </header>

      <nav className="nav" aria-label="Screens">
        {TABS.map(t => (
          <button
            key={t.id}
            className={`nav-btn${tab === t.id ? ' nav-btn--active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <div className="viewing-as">{viewingAs[tab]}</div>

      <main className="main">
        {tab === 'booking' && renderBookingFlow()}
        {tab === 'emails'  && renderEmails()}
        {tab === 'dst'     && <DSTCheckScreen />}
      </main>

      <footer className="footer">
        <span>Kestrel · prototype · Pemberton Insurance demo</span>
      </footer>
    </div>
  )
}
