export const company = {
  name: 'Pemberton Insurance',
  meetingType: 'Policy review',
  durationMin: 30,
}

export const hosts = [
  {
    id: 'sarah',
    name: 'Sarah Lin',
    zone: 'Europe/London',
    workStart: '09:00',
    workEnd: '17:00',
    workDays: [1, 2, 3, 4, 5], // Mon–Fri
  },
  {
    id: 'raj',
    name: 'Raj Mehta',
    zone: 'America/New_York',
    workStart: '09:00',
    workEnd: '17:00',
    workDays: [1, 2, 3, 4, 5],
  },
]

export const inviteeZones = [
  'America/Los_Angeles',
  'America/New_York',
  'Europe/London',
  'Europe/Berlin',
  'Asia/Singapore',
  'Australia/Sydney',
  'Asia/Kolkata',
]

export const DEFAULT_DATE = '2027-03-15' // week with US/UK DST gap visible
