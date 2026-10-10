import LegalLayout, { APP_NAME, CONTACT_EMAIL } from './LegalLayout'

export default function Terms() {
  return (
    <LegalLayout title="Terms of Service">
      <p>By using {APP_NAME} you agree to these terms. If you do not agree, please do not use the app.</p>

      <h2>1. The service</h2>
      <p>{APP_NAME} helps dairy farms record and review milk production, animals, customers, sales, expenses, health, labour and cash
        collections. Features may change over time.</p>

      <h2>2. Accounts</h2>
      <ul>
        <li>Accounts are created and managed by the farm admin. There is no public sign-up.</li>
        <li>Keep your login details confidential and tell the admin if you think they were compromised.</li>
        <li>The admin can deactivate or reset any manager account and is responsible for who has access to the farm's data.</li>
      </ul>

      <h2>3. Your data</h2>
      <p>You own the farm data you enter. You give us permission to store and process it only to operate the app for you, as described
        in our <a href="/privacy">Privacy Policy</a>. You are responsible for the accuracy and legality of what you enter, including
        customers' details.</p>

      <h2>4. Acceptable use</h2>
      <ul>
        <li>Do not attempt to access data of other farms or accounts, or bypass access controls.</li>
        <li>Do not upload unlawful, harmful or malicious content.</li>
        <li>Do not reverse engineer, overload or disrupt the service.</li>
      </ul>

      <h2>5. Availability and backups</h2>
      <p>The app can queue entries while you are offline, but we do not guarantee uninterrupted service. Please export important records
        regularly from the Reports section.</p>

      <h2>6. Disclaimer</h2>
      <p>Reports, balances, milk-withdrawal alerts and other calculations are aids based on the data you enter. They are not
        veterinary, legal, tax or accounting advice. Verify important figures before relying on them. The service is provided "as is"
        without warranties of any kind.</p>

      <h2>7. Limitation of liability</h2>
      <p>To the extent permitted by law, we are not liable for indirect or consequential losses, or loss of data or profit arising from
        use of the app.</p>

      <h2>8. Termination</h2>
      <p>We may suspend access that breaks these terms. You may stop using the app at any time and request deletion of your data - see
        <a href="/delete-account"> Delete Account &amp; Data</a>.</p>

      <h2>9. Changes</h2>
      <p>We may update these terms. Continued use after an update means you accept the new terms.</p>

      <h2>10. Governing law and contact</h2>
      <p>These terms are governed by the laws of India. Contact: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.</p>
    </LegalLayout>
  )
}
