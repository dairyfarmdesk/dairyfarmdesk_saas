import LegalLayout, { APP_NAME, CONTACT_EMAIL } from './LegalLayout'

export default function PrivacyPolicy() {
  return (
    <LegalLayout title="Privacy Policy">
      <p>
        This Privacy Policy explains how {APP_NAME} ("we", "us", "the app") collects, uses and protects information when you use
        our Android app and website (package name <code>in.dairyfarmdesk.app</code>). {APP_NAME} is a dairy farm management tool
        used by farm owners (admins) and farm managers to record milk production, animals, customers, sales, expenses, health
        records, labour and cash collections.
      </p>

      <h2>1. Information we collect</h2>
      <p><b>Account information.</b> Accounts are created by the farm admin. We store the user's email address, full name, optional
        phone number, role (admin or manager) and active status. Passwords are handled by our authentication provider and are never
        stored in readable form.</p>
      <p><b>Farm records entered by users.</b> Animal details (tag number, name, breed, dates, purchase details, notes, optional photo),
        milk production, customers (name, phone number, area, rates, balances), milk sales and payments, expenses (including optional
        bill photos), medical records, labourers and their payments, and cash collections.</p>
      <p><b>Photos and files.</b> Only if you choose to attach them: animal photos, bill/receipt images and the farm logo. The app
        does not read your gallery or camera without your action.</p>
      <p><b>Activity log.</b> An audit log records which user created, changed or deleted a record and when, so the farm owner can
        review changes.</p>
      <p><b>On-device data.</b> The app stores your language preference and a temporary offline queue of entries on your device so you
        can keep working without internet. Queued entries are sent when you are online again.</p>
      <p><b>What we do not collect.</b> We do not collect your location, contacts, SMS, call logs or microphone data. We do not use
        advertising or third-party analytics SDKs.</p>

      <h2>2. How we use information</h2>
      <ul>
        <li>To sign you in and apply role-based access (admin or manager).</li>
        <li>To provide the app's features: records, reports, ledgers, exports (CSV, Excel, PDF) and alerts.</li>
        <li>To keep an audit trail and protect the account and data from misuse.</li>
        <li>To provide support when you contact us.</li>
      </ul>
      <p>We do not sell your data and we do not use it for advertising.</p>

      <h2>3. Where data is stored and who processes it</h2>
      <p>Data is stored with our backend provider, Supabase (database, authentication and file storage), on cloud servers. The web app is
        hosted on Vercel. These providers process data on our behalf under their own security and privacy terms. Data is transmitted
        over HTTPS (encrypted in transit) and access to records is restricted by role-based database rules.</p>
      <p>Uploaded animal photos, bill images and the farm logo are kept in storage buckets that may be readable by anyone who has the
        exact file link. Please do not upload photos that contain sensitive personal information.</p>

      <h2>4. Sharing</h2>
      <p>We do not share personal data with third parties except our infrastructure providers listed above, or when required by law.
        If you use the "WhatsApp" bill feature, the app opens WhatsApp on your device with a pre-filled message to the customer's phone
        number; the message is then handled by WhatsApp under its own privacy policy.</p>

      <h2>5. Data retention and deletion</h2>
      <p>We keep data for as long as the farm account is active. You can ask us to delete your account and associated data at any
        time - see <a href="/delete-account">Delete Account &amp; Data</a>. Deleted data is removed from active systems promptly and
        from backups within a reasonable period, unless we must keep certain information to meet legal obligations.</p>

      <h2>6. Your rights</h2>
      <p>You can ask to access, correct, export or delete your personal data. The farm admin can export records from the Reports
        section. To make a request, write to <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.</p>

      <h2>7. Security</h2>
      <p>We use encrypted connections, hashed passwords, role-based access control and an audit log. No system is completely secure, so
        please use a strong password and sign out on shared devices.</p>

      <h2>8. Children</h2>
      <p>{APP_NAME} is a business tool intended for adults. It is not directed to children under 13 and we do not knowingly collect their
        data.</p>

      <h2>9. Changes to this policy</h2>
      <p>We may update this policy from time to time. The "Last updated" date above shows the latest version. Significant changes will be
        communicated in the app or on this page.</p>

      <h2>10. Contact</h2>
      <p>Questions about this policy: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.</p>
    </LegalLayout>
  )
}
