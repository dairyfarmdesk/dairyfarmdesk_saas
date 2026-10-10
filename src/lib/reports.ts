import type { Animal, CashCollection, Customer, Expense, LabourPayment, Medical, Milk, Sale } from './types'
import type { Row } from './export'
import { fmtDate, round2 } from './format'
import { groupBy, sum } from './utils'

export type ReportTab = 'daily' | 'monthly' | 'yearly' | 'pnl' | 'dues' | 'yield'

interface Ledger { name: string; phone: string | null; opening: number; supplied: number; paid: number; outstanding: number }
interface Input { milk: Milk[]; sales: Sale[]; cash: CashCollection[]; exp: Expense[]; med: Medical[]; labour: LabourPayment[]; ledger: Ledger[]; animals: Animal[]; from: string; to: string }

function summary(i: Input, key: (d: string) => string): Row[] {
  const keys = new Set<string>([...i.milk, ...i.sales, ...i.cash, ...i.exp, ...i.labour].map((r) => key(r.entry_date)))
  return [...keys].sort().map((k) => {
    const l = sum(i.milk.filter((m) => key(m.entry_date) === k), (m) => m.litres)
    const sl = sum(i.sales.filter((m) => key(m.entry_date) === k), (m) => m.litres)
    const credit = sum(i.sales.filter((m) => key(m.entry_date) === k), (m) => m.amount)
    const cash = sum(i.cash.filter((m) => key(m.entry_date) === k), (m) => m.amount)
    const ex = sum(i.exp.filter((m) => key(m.entry_date) === k), (m) => m.amount)
    const md = sum(i.med.filter((m) => key(m.entry_date) === k), (m) => m.cost)
    const lb = sum(i.labour.filter((m) => key(m.entry_date) === k), (m) => m.amount)
    return {
      Period: k.length === 10 ? fmtDate(k) : k, 'Produced (L)': round2(l), 'Sold (L)': round2(sl), 'Customer sales': round2(credit), 'Cash sales': round2(cash),
      Revenue: round2(credit + cash), Expenses: round2(ex), Medical: round2(md), Labour: round2(lb), Profit: round2(credit + cash - ex - md - lb), 'Cost/L': l ? round2((ex + md + lb) / l) : 0,
    }
  })
}

export function buildReport(tab: ReportTab, i: Input): Row[] {
  if (tab === 'daily') return summary(i, (d) => d)
  if (tab === 'monthly') return summary(i, (d) => d.slice(0, 7))
  if (tab === 'yearly') return summary(i, (d) => d.slice(0, 4))
  if (tab === 'pnl') {
    const med = sum(i.med.filter((m) => m.entry_date >= i.from && m.entry_date <= i.to), (m) => m.cost)
    const lb = sum(i.labour.filter((m) => m.entry_date >= i.from && m.entry_date <= i.to), (m) => m.amount)
    const rev = sum(i.sales, (s) => s.amount)
    const cash = sum(i.cash, (c) => c.amount)
    const ex = sum(i.exp, (e) => e.amount)
    const cats = Object.entries(groupBy(i.exp, (e) => e.category)).map(([c, r]) => ({ Item: 'Expense - ' + c, Amount: -round2(sum(r, (e) => e.amount)) }))
    return [{ Item: 'Milk sales to customers', Amount: round2(rev) }, { Item: 'Direct cash sales', Amount: round2(cash) }, ...cats, { Item: 'Medical costs', Amount: -round2(med) }, { Item: 'Labour payments', Amount: -round2(lb) }, { Item: 'NET PROFIT', Amount: round2(rev + cash - ex - med - lb) }]
  }
  if (tab === 'dues') {
    return i.ledger.filter((l) => Number(l.outstanding) !== 0).sort((a, b) => b.outstanding - a.outstanding)
      .map((l) => ({ Customer: l.name, Phone: l.phone, Opening: l.opening, Supplied: l.supplied, Paid: l.paid, Outstanding: l.outstanding }))
  }
  const days = new Set(i.milk.map((m) => m.entry_date)).size || 1
  return Object.entries(groupBy(i.milk, (m) => m.animal_id))
    .map(([id, r]) => {
      const withFat = r.filter((x) => x.fat)
      return {
        Animal: i.animals.find((a) => a.id === id)?.tag_no ?? id, 'Total (L)': round2(sum(r, (x) => x.litres)),
        'Avg / day (L)': round2(sum(r, (x) => x.litres) / days), 'Avg Fat %': round2(sum(withFat, (x) => x.fat!) / (withFat.length || 1)),
      }
    })
    .sort((a, b) => b['Total (L)'] - a['Total (L)'])
}

export type { Customer }
