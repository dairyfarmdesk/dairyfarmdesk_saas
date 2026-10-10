import LegalLayout, { APP_NAME, CONTACT_EMAIL } from './LegalLayout'

export default function Support() {
  return (
    <LegalLayout title="Support & Contact" updated={false}>
      <p>Need help with {APP_NAME}? We are happy to help.</p>

      <h2>Contact</h2>
      <p>Email: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a></p>
      <p>Please include your farm name, the email you sign in with, your phone model and a short description or screenshot of the problem.</p>

      <h2>Common questions</h2>
      <p><b>I cannot sign in.</b> Accounts are created by your farm admin. Ask the admin to check that your account is active and to reset
        your password in Users &amp; Settings.</p>
      <p><b>My entries are not showing.</b> If you were offline, entries are saved on the device and sync automatically when internet is
        back. Keep the app open for a moment after reconnecting.</p>
      <p><b>How do I export my data?</b> Admins can use the Reports section to export CSV, Excel or PDF.</p>
      <p><b>How do I delete my account or data?</b> See <a href="/delete-account">Delete Account &amp; Data</a>.</p>

      <h2>Policies</h2>
      <p><a href="/privacy">Privacy Policy</a> · <a href="/terms">Terms of Service</a></p>
    </LegalLayout>
  )
}
