import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from './supabase'
import { mutate } from './offline'
import type { Animal, CashCollection, Customer, Expense, Labourer, LabourPayment, Medical, Milk, Payment, Sale } from './types'
import { addDays, todayIST } from './format'

const run = async <T,>(p: PromiseLike<{ data: any; error: any }>): Promise<T> => {
  const { data, error } = await p
  if (error) throw error
  return data as T
}

// Fetch all rows (paginates past the 1000 row API limit)
async function all<T>(build: (from: number, to: number) => PromiseLike<{ data: any; error: any }>): Promise<T[]> {
  const out: T[] = []
  for (let i = 0; i < 50; i++) {
    const rows = await run<T[]>(build(i * 1000, i * 1000 + 999))
    out.push(...rows)
    if (rows.length < 1000) break
  }
  return out
}

export const useAnimals = () =>
  useQuery({ queryKey: ['animals'], queryFn: () => all<Animal>((f, t) => supabase.from('animals').select('*').order('tag_no').range(f, t)) })

export const useCustomers = () =>
  useQuery({ queryKey: ['customers'], queryFn: () => all<Customer>((f, t) => supabase.from('customers').select('*').order('name').range(f, t)) })

export const useMilk = (from: string, to: string) =>
  useQuery({
    queryKey: ['milk', from, to],
    queryFn: () => all<Milk>((f, t) => supabase.from('milk_production').select('*').gte('entry_date', from).lte('entry_date', to).order('entry_date').range(f, t)),
  })

export const useSales = (from: string, to: string) =>
  useQuery({
    queryKey: ['sales', from, to],
    queryFn: () => all<Sale>((f, t) => supabase.from('milk_sales').select('*').gte('entry_date', from).lte('entry_date', to).order('entry_date').range(f, t)),
  })

export const usePayments = (from: string, to: string) =>
  useQuery({
    queryKey: ['payments', from, to],
    queryFn: () => all<Payment>((f, t) => supabase.from('customer_payments').select('*').gte('entry_date', from).lte('entry_date', to).order('entry_date', { ascending: false }).range(f, t)),
  })

export const useExpenses = (from: string, to: string) =>
  useQuery({
    queryKey: ['expenses', from, to],
    queryFn: () => all<Expense>((f, t) => supabase.from('expenses').select('*').gte('entry_date', from).lte('entry_date', to).order('entry_date', { ascending: false }).range(f, t)),
  })

export const useMedical = () =>
  useQuery({ queryKey: ['medical'], queryFn: () => all<Medical>((f, t) => supabase.from('medical_records').select('*').order('entry_date', { ascending: false }).range(f, t)) })

export const useLedger = () =>
  useQuery({
    queryKey: ['ledger'],
    queryFn: () => run<{ customer_id: string; name: string; phone: string | null; opening: number; supplied: number; paid: number; outstanding: number }[]>(supabase.rpc('customer_ledger')),
  })

export const useLabourers = () =>
  useQuery({ queryKey: ['labourers'], queryFn: () => all<Labourer>((f, t) => supabase.from('labourers').select('*').order('name').range(f, t)) })

export const useCash = (from: string, to: string) =>
  useQuery({
    queryKey: ['cash', from, to],
    queryFn: () => all<CashCollection>((f, t) => supabase.from('cash_collections').select('*').gte('entry_date', from).lte('entry_date', to).order('entry_date', { ascending: false }).range(f, t)),
  })

export const useLabourPayments = () =>
  useQuery({
    queryKey: ['labour_payments'],
    queryFn: () => all<LabourPayment>((f, t) => supabase.from('labour_payments').select('*').order('entry_date', { ascending: false }).range(f, t)),
  })

export const useWithdrawal = () =>
  useQuery({
    queryKey: ['withdrawal'],
    queryFn: () => run<{ animal_id: string; tag_no: string; medicine: string | null; until: string }[]>(supabase.rpc('animals_under_withdrawal')),
  })

// Invalidate everything after a write
export function useRefresh() {
  const qc = useQueryClient()
  return () => qc.invalidateQueries()
}

export { mutate, addDays, todayIST }
