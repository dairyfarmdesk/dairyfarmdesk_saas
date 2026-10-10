import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { supabase } from '@/lib/supabase'
import { DataTable } from '@/components/DataTable'
import { Button, Input, Modal, Select } from '@/components/ui'
import { fmtDateTime } from '@/lib/format'
import type { AuditRow } from '@/lib/types'

export default function AuditLog() {
  const { t } = useTranslation()
  const [table, setTable] = useState('')
  const [sel, setSel] = useState<AuditRow | null>(null)
  const { data = [] } = useQuery({
    queryKey: ['audit'],
    queryFn: async () => {
      const { data, error } = await supabase.from('audit_log').select('*').order('created_at', { ascending: false }).limit(1000)
      if (error) throw error
      return data as AuditRow[]
    },
  })
  const tables = [...new Set(data.map((d) => d.table_name))]
  const rows = data.filter((d) => !table || d.table_name === table)
  const summary = (r: AuditRow) => {
    const n = r.new_data || r.old_data || {}
    return n.tag_no || n.name || n.item_name || (n.litres != null ? `${n.litres} L` : '') || (n.amount != null ? `₹${n.amount}` : '') || ''
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold text-brand-900">{t('nav.audit')}</h1>
      <DataTable
        rows={rows} exportName="audit-log" rowKey={(r) => r.id}
        toolbar={<Select className="!h-10 !w-48" value={table} onChange={(e) => setTable(e.target.value)}><option value="">{t('all')}</option>{tables.map((x) => <option key={x}>{x}</option>)}</Select>}
        cols={[
          { key: 'w', header: t('admin.when'), value: (r) => fmtDateTime(r.created_at) },
          { key: 'u', header: t('admin.who'), value: (r) => r.user_name ?? 'system' },
          { key: 'a', header: t('admin.action'), value: (r) => r.action },
          { key: 't', header: t('admin.table'), value: (r) => r.table_name },
          { key: 'd', header: t('admin.details'), value: (r) => summary(r) },
        ]}
        actions={(r) => <Button size="sm" variant="ghost" onClick={() => setSel(r)}>JSON</Button>}
      />
      <Modal open={!!sel} onClose={() => setSel(null)} title={`${sel?.action} ${sel?.table_name}`}>
        <pre className="max-h-96 overflow-auto rounded-lg bg-gray-100 p-3 text-xs">{JSON.stringify({ old: sel?.old_data, new: sel?.new_data }, null, 2)}</pre>
      </Modal>
      <Input className="hidden" readOnly />
    </div>
  )
}
