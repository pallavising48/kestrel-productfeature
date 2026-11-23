import { useState } from 'react'
import './App.css'

const SCREENS = [
  { id: 'booking',      label: 'Booking Page' },
  { id: 'confirmation', label: 'Confirmation Email' },
  { id: 'dst',          label: 'Daylight-Saving Check' },
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

function PlaceholderScreen({ title }) {
  return (
    <div className="screen-card">
      <h2 className="screen-title">{title}</h2>
      <p className="coming-soon">Coming soon</p>
    </div>
  )
}

export default function App() {
  const [active, setActive] = useState('booking')
  const current = SCREENS.find(s => s.id === active)

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
        {SCREENS.map(s => (
          <button
            key={s.id}
            className={`nav-btn${active === s.id ? ' nav-btn--active' : ''}`}
            onClick={() => setActive(s.id)}
          >
            {s.label}
          </button>
        ))}
      </nav>

      <main className="main">
        <PlaceholderScreen title={current.label} />
      </main>

      <footer className="footer">
        <span>Kestrel · prototype shell</span>
      </footer>
    </div>
  )
}
