import { get, set } from 'idb-keyval'
import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import { uuid } from './utils'

// Offline write queue: failed/offline writes are stored in IndexedDB and replayed when online.
// Inserts use client-generated UUIDs + upsert-on-id, so replays are idempotent.

export type QItem = {
  qid: string
  table: string
  op: 'insert' | 'upsert' | 'update' | 'delete'
  payload?: any
  id?: string
  onConflict?: string
  at: number
  error?: string
}

const KEY = 'dd-queue'
const listeners = new Set<() => void>()
const notify = () => listeners.forEach((f) => f())

export const getQueue = async (): Promise<QItem[]> => (await get(KEY)) || []
const saveQueue = async (q: QItem[]) => {
  await set(KEY, q)
  notify()
}

export const isNetworkErr = (e: any) =>
  !!e && (e.status === 0 || (!e.code && /fetch|network|load failed/i.test(String(e.message || e))))

async function runOp(it: QItem): Promise<{ error: any }> {
  const t: any = supabase.from(it.table)
  if (it.op === 'upsert' || it.op === 'insert') return t.upsert(it.payload, { onConflict: it.onConflict || 'id' })
  if (it.op === 'update') return t.update(it.payload).eq('id', it.id)
  return t.delete().eq('id', it.id)
}

export async function enqueue(it: Omit<QItem, 'qid' | 'at'>) {
  const q = await getQueue()
  q.push({ ...it, qid: uuid(), at: Date.now() })
  await saveQueue(q)
}

export async function mutate(
  table: string,
  op: QItem['op'],
  payload?: any,
  opts: { id?: string; onConflict?: string } = {},
): Promise<{ queued: boolean; error?: string }> {
  const item = { table, op, payload, id: opts.id, onConflict: opts.onConflict }
  if (!navigator.onLine) {
    if (op === 'delete') return { queued: false, error: 'Delete needs an internet connection' }
    await enqueue(item)
    return { queued: true }
  }
  try {
    const { error } = await runOp({ ...item, qid: '', at: 0 })
    if (!error) return { queued: false }
    if (isNetworkErr(error) && op !== 'delete') {
      await enqueue(item)
      return { queued: true }
    }
    return { queued: false, error: friendlyError(error) }
  } catch (e: any) {
    if (op !== 'delete') {
      await enqueue(item)
      return { queued: true }
    }
    return { queued: false, error: String(e?.message || e) }
  }
}

export function friendlyError(e: any): string {
  const m = String(e?.message || e)
  if (e?.code === '42501' || /row-level security/i.test(m)) return 'Not allowed: entry is older than the allowed edit window or you lack permission.'
  if (e?.code === '23503') return 'Cannot delete: this record is used by other entries. Mark it inactive instead.'
  if (e?.code === '23505') return 'Duplicate entry: this record already exists.'
  return m
}

let syncing = false
export async function syncQueue(onSynced?: () => void) {
  if (syncing || !navigator.onLine) return
  syncing = true
  try {
    const q = await getQueue()
    if (!q.length) return
    const keep: QItem[] = []
    let stop = false
    let synced = 0
    for (const it of q) {
      if (stop || it.error) {
        keep.push(it)
        continue
      }
      try {
        const { error } = await runOp(it)
        if (!error) synced++
        else if (isNetworkErr(error)) {
          stop = true
          keep.push(it)
        } else keep.push({ ...it, error: friendlyError(error) })
      } catch {
        stop = true
        keep.push(it)
      }
    }
    const latest = await getQueue()
    const added = latest.filter((c) => !q.some((o) => o.qid === c.qid))
    await saveQueue([...keep, ...added])
    if (synced) onSynced?.()
  } finally {
    syncing = false
  }
}

export async function discardQueueItem(qid: string) {
  await saveQueue((await getQueue()).filter((i) => i.qid !== qid))
}

export function useQueue() {
  const [q, setQ] = useState<QItem[]>([])
  useEffect(() => {
    const load = () => getQueue().then(setQ)
    load()
    listeners.add(load)
    return () => {
      listeners.delete(load)
    }
  }, [])
  return q
}

export function useOnline() {
  const [on, setOn] = useState(navigator.onLine)
  useEffect(() => {
    const a = () => setOn(true)
    const b = () => setOn(false)
    window.addEventListener('online', a)
    window.addEventListener('offline', b)
    return () => {
      window.removeEventListener('online', a)
      window.removeEventListener('offline', b)
    }
  }, [])
  return on
}
