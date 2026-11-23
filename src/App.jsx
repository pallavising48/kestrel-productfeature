import { useState } from 'react'
import './App.css'
import BookingPage from './screens/BookingPage.jsx'
import ConfirmStep from './screens/ConfirmStep.jsx'
import ConfirmationScreen from './screens/ConfirmationScreen.jsx'
import DSTCheckScreen from './screens/DSTCheckScreen.jsx'

const TABS = [
  { id: 'booking', label: 'Booking page' },
  { id: 'dst', label: 'DST check (admin)' },
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
  // booking flow state
  const [bookingData, setBookingData] = useState(null)      // slot selected
  const [confirmed, setConfirmed] = useState(null)          // name/email added

  function handleBook(data) {
    setBookingData(data)
  }
  function handleConfirm(data) {
    setConfirmed(data)
  }
  function handleReset() {
    setBookingData(null)
    setConfirmed(null)
  }

  function renderBookingFlow() {
    if (confirmed) return <ConfirmationScreen booking={confirmed} onReset={handleReset} />
    if (bookingData) return <ConfirmStep booking={bookingData} onConfirm={handleConfirm} onBack={handleReset} />
    return <BookingPage onBook={handleBook} />
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
            onClick={() => { setTab(t.id); handleReset() }}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <main className="main">
        {tab === 'booking' ? renderBookingFlow() : <DSTCheckScreen />}
      </main>

      <footer className="footer">
        <span>Kestrel · prototype · Pemberton Insurance demo</span>
      </footer>
    </div>
  )
}
