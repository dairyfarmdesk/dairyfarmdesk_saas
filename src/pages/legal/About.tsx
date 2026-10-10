import { Link } from 'react-router-dom'
import LegalLayout, { APP_NAME, CONTACT_EMAIL } from './LegalLayout'

const FEATURES = [
  'Daily milk entry by animal and shift, with fat/SNF and unusual-value warnings',
  'Animal records with photos, breed, status and health history',
  'Customers, deliveries, payments, ledgers and monthly bills',
  'Expenses, labour payments and cash collections',
  'Vaccination, treatment and milk-withdrawal alerts',
  'Reports with CSV, Excel and PDF export',
  'Works offline and syncs when internet returns',
  'English and Hindi',
]

export default function About() {
  return (
    <LegalLayout title={`About ${APP_NAME}`} updated={false}>
      <p>
        {APP_NAME} is a simple farm management app for dairy owners and managers. Record milk, animals, sales, expenses, health and labour
        in one place and see clear reports - even with a weak internet connection.
      </p>

      <h2>Features</h2>
      <ul>{FEATURES.map((f) => <li key={f}>{f}</li>)}</ul>

      <h2>Two roles</h2>
      <p><b>Manager:</b> fast daily data entry on the phone. <b>Admin:</b> dashboard, reports, user management and audit log.</p>

      <h2>Get started</h2>
      <p>Accounts are created by the farm admin. <Link to="/login">Sign in</Link> with the email and password you were given.</p>

      <h2>Contact</h2>
      <p><a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> · <Link to="/support">Support</Link></p>
    </LegalLayout>
  )
}
