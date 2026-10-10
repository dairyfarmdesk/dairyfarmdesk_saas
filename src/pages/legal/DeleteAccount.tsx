import LegalLayout, { APP_NAME, CONTACT_EMAIL } from './LegalLayout'

export default function DeleteAccount() {
  const subject = encodeURIComponent(`${APP_NAME} - account and data deletion request`)
  const body = encodeURIComponent(
    'Please delete my account and data.\n\nRegistered email:\nFull name:\nFarm name:\nDelete: (account only / account and all farm data)\n',
  )
  return (
    <LegalLayout title="Delete Account & Data">
      <p>
        {APP_NAME} accounts are created by the farm admin. You can ask for your account, or for the whole farm's data, to be deleted at
        any time.
      </p>

      <h2>How to request deletion</h2>
      <ul>
        <li>
          Email <a href={`mailto:${CONTACT_EMAIL}?subject=${subject}&body=${body}`}>{CONTACT_EMAIL}</a> from the email address
          registered in the app, with the subject "Account and data deletion request".
        </li>
        <li>Include your full name, the farm name, and whether you want only your account removed or all farm data removed.</li>
        <li>Managers can also ask their farm admin to deactivate or remove their account from Users &amp; Settings.</li>
      </ul>
      <p>We may ask you to confirm your identity before deleting anything. We aim to complete requests within 30 days.</p>

      <h2>What is deleted</h2>
      <ul>
        <li><b>Account deletion:</b> login, name, email, phone number and role of the user.</li>
        <li><b>Full farm deletion (admin request):</b> animals, milk records, customers, sales and payments, expenses, health records,
          labour and cash records, audit log, and uploaded photos, bills and logo.</li>
      </ul>

      <h2>What may be kept</h2>
      <p>Records that identify who made an entry (for example the audit log) may be kept in anonymised form when deleting only a
        manager account, so the farm's accounts stay consistent. Backups are overwritten on a regular cycle, after which the data is
        permanently gone. We may keep limited information if the law requires it.</p>

      <h2>Before you delete</h2>
      <p>Export what you need from the Reports section (CSV, Excel or PDF). Deletion cannot be undone.</p>
      <p>See also our <a href="/privacy">Privacy Policy</a>.</p>
    </LegalLayout>
  )
}
