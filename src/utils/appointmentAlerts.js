// Fires a browser notification (and a short beep) when a new appointment
// comes in while this app's tab is open — even if it's in the background.
// This is a nice-to-have on top of the phone push notification set up via
// supabase/appointment_notifications.sql, which is the one that reaches you
// when the tab isn't open at all.

export function requestNotificationPermission() {
  if (typeof Notification === 'undefined') return
  if (Notification.permission === 'default') {
    Notification.requestPermission()
  }
}

export function notifyNewAppointment(appointment) {
  playChime()

  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return
  try {
    const title = 'New appointment request'
    const body = `${appointment.client_name || 'A customer'} — ${appointment.service_name || 'a service'} on ${appointment.appointment_date}${
      appointment.appointment_time ? ` at ${appointment.appointment_time}` : ''
    }`
    const n = new Notification(title, { body })
    n.onclick = () => {
      window.focus()
      n.close()
    }
  } catch (err) {
    console.error('Failed to show appointment notification:', err)
  }
}

// A short two-tone chime via the Web Audio API — no audio file needed.
function playChime() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const now = ctx.currentTime
    ;[880, 1174.66].forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = freq
      gain.gain.setValueAtTime(0, now + i * 0.16)
      gain.gain.linearRampToValueAtTime(0.2, now + i * 0.16 + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.16 + 0.35)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(now + i * 0.16)
      osc.stop(now + i * 0.16 + 0.4)
    })
    setTimeout(() => ctx.close(), 800)
  } catch (err) {
    // Autoplay can be blocked before the user has interacted with the page
    // at all — harmless, the browser Notification (if permitted) still shows.
  }
}
