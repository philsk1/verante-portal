// Twilio SMS helper — platform-level, not per-tenant credentials
// Gracefully skips if TWILIO_* env vars are not set

export async function sendSms({ to, message }) {
  const sid   = process.env.TWILIO_ACCOUNT_SID
  const token = process.env.TWILIO_AUTH_TOKEN
  const from  = process.env.TWILIO_PHONE_NUMBER
  if (!sid || !token || !from) {
    console.warn('Twilio not configured — SMS skipped')
    return
  }

  // Normalise UK number to E.164 (+44...)
  const toE164 = to.replace(/\D/g, '').replace(/^0/, '+44').replace(/^44/, '+44').replace(/^\+44/, '+44')
  const toFinal = toE164.startsWith('+') ? toE164 : `+${toE164}`

  const resp = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
    {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`${sid}:${token}`).toString('base64'),
        'Content-Type':  'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ From: from, To: toFinal, Body: message }).toString(),
    }
  )
  if (!resp.ok) {
    const detail = await resp.text()
    console.error('Twilio SMS failed:', detail)
  }
}
