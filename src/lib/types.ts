export type Role = 'admin' | 'manager'
export type Shift = 'Morning' | 'Evening'

export const ANIMAL_TYPES = ['Cow', 'Buffalo', 'Calf', 'Heifer', 'Bull'] as const
export const BREEDS = ['HF', 'Jersey', 'Gir', 'Sahiwal', 'Murrah', 'Crossbred', 'Other'] as const
export const STATUSES = ['Lactating', 'Dry', 'Pregnant', 'Sold', 'Dead'] as const
export const CUSTOMER_TYPES = ['Home delivery', 'Dairy-cooperative', 'Hotel', 'Shop'] as const
export const PAY_MODES = ['Cash', 'UPI', 'Bank'] as const
export const EXPENSE_CATS = ['Feed', 'Labour/Salary', 'Electricity', 'Fuel', 'Transport', 'Repairs', 'Other'] as const
export const MED_TYPES = ['Treatment', 'Vaccination', 'Deworming', 'Artificial Insemination', 'Pregnancy check', 'Checkup', 'Other'] as const
export const FEED_ITEMS = ['Green fodder', 'Dry fodder/Bhusa', 'Cattle feed/Pellet', 'Mustard cake', 'Cotton seed', 'Mineral mixture', 'Silage', 'Other']
export const MILK_TYPES = ['Cow', 'Buffalo'] as const
export type MilkType = (typeof MILK_TYPES)[number]
export const UNITS = ['kg', 'quintal', 'bag', 'trolley'] as const

export interface Profile { id: string; full_name: string; email: string | null; phone: string | null; role: Role; active: boolean; created_at: string; farm_id?: string }
export interface Settings { id: number; farm_id?: string; farm_name: string; logo_url: string | null; default_rate: number; manager_edit_days: number; language: string }
export interface Animal {
  id: string; tag_no: string; name: string | null; type: string; breed: string; dob: string | null
  purchase_date: string | null; purchase_price: number | null; source: string | null; status: string
  photo_url: string | null; notes: string | null; archived: boolean; created_at: string
}
export interface Milk { id: string; animal_id: string; entry_date: string; shift: Shift; litres: number; fat: number | null; snf: number | null; notes?: string | null; created_by?: string | null; created_at?: string }
export interface Customer {
  id: string; name: string; phone: string | null; area: string | null; type: string; default_rate: number
  default_morning_litres: number; default_evening_litres: number; opening_balance: number; active: boolean
  // Cow rate/litres are the default_* fields above; buffalo has its own. A customer can buy cow, buffalo or both.
  buys_cow: boolean; buys_buffalo: boolean; default_rate_buffalo: number
  default_morning_litres_buffalo: number; default_evening_litres_buffalo: number
}
export interface Sale { id: string; customer_id: string; entry_date: string; shift: Shift; milk_type: MilkType; litres: number; rate: number; amount: number; notes?: string | null }
export interface Payment { id: string; customer_id: string; entry_date: string; amount: number; mode: string; note: string | null }
export interface Expense {
  id: string; entry_date: string; category: string; item_name: string; quantity: number | null; unit: string | null
  rate: number | null; amount: number; supplier: string | null; pay_mode: string; bill_url: string | null; notes: string | null
}
export interface Medical {
  id: string; animal_id: string; entry_date: string; type: string; symptoms: string | null; medicine: string | null
  dose: string | null; vet_name: string | null; cost: number; withdrawal_days: number; next_due_date: string | null
  notes: string | null; photo_url: string | null
}
export interface AuditRow { id: string; user_name: string | null; action: string; table_name: string; record_id: string | null; old_data: any; new_data: any; created_at: string }

export const LABOUR_TYPES = ['Salary', 'Advance', 'Bonus', 'Other'] as const
export interface Labourer {
  id: string; name: string; phone: string | null; role: string | null; monthly_salary: number
  join_date: string | null; active: boolean; notes: string | null
}
export interface LabourPayment {
  id: string; labour_id: string; entry_date: string; amount: number; pay_type: string; mode: string; note: string | null
}
export interface CashCollection {
  id: string; entry_date: string; amount: number; litres: number | null; handed_to: string | null; note: string | null
}
