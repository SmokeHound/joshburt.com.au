# Self-Hosted SMTP (No External Email Provider)

This project sends email via SMTP (configured by environment variables or DB settings). If you want to avoid a third-party SMTP provider, you can run your own mail server and point the app at it.

## What you’re signing up for

Running your own SMTP is absolutely possible, but deliverability is the hard part:

- You must set up DNS correctly (SPF/DKIM/DMARC + MX).
- You should use TLS (STARTTLS on 587 is typical).
- Many hosts block outbound port 25; use 587/465 for submission.
- You’ll often need a VPS with a clean IP and correct PTR/reverse-DNS.

If you don’t want to operate a mail server, use a provider instead.

## Recommended approach

Use a packaged mail server stack on a VPS you control (pick one):

- **Mailcow** (Docker-based)
- **Mail-in-a-Box**
- **iRedMail**

These provide SMTP submission + DKIM + web admin.

## Minimum setup checklist

### 1) Pick a mail hostname

Example: `mail.yourdomain.com`

- Create an **A/AAAA record** for `mail.yourdomain.com` pointing to your VPS.
- Create an **MX record** for `yourdomain.com` pointing to `mail.yourdomain.com`.

### 2) Configure SPF

Example (adjust for your server):

- `yourdomain.com TXT "v=spf1 mx -all"`

### 3) Configure DKIM

Generate DKIM keys in your mail server and publish the DKIM TXT record it gives you.

### 4) Configure DMARC

Start with monitoring:

- `_dmarc.yourdomain.com TXT "v=DMARC1; p=none; rua=mailto:dmarc@yourdomain.com"`

Later you can tighten to `quarantine` or `reject`.

### 5) Reverse DNS (PTR)

Set your VPS IP’s **PTR** to `mail.yourdomain.com`. This matters a lot for deliverability.

### 6) Create a mailbox/account

Create a user such as:

- `noreply@yourdomain.com` (or another sender address)

## App configuration

Set these environment variables (locally in `.env`, and in Netlify for production):

```env
SMTP_HOST=mail.yourdomain.com
SMTP_PORT=587
SMTP_USER=noreply@yourdomain.com
SMTP_PASS=your-password
FROM_EMAIL=noreply@yourdomain.com
```

Notes:

- The app treats port **465** as `secure=true`; port **587** uses STARTTLS.
- SMTP can also be set via DB settings keys: `smtpHost`, `smtpPort`, `smtpUser`, `smtpPassword`.

## Testing

Use the included SMTP test script after setting env vars:

```bash
node scripts/test-smtp.js
```

If you’re using the email queue (`EMAIL_QUEUE_ENABLED=true`), you also need a worker/scheduled job to process queued emails (or manually process via the email-queue admin endpoint).
