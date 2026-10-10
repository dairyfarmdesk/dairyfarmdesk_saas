import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSave } from '@/lib/useSave'
import { Button, Input, Modal } from '@/components/ui'
import { toNum } from '@/lib/format'
import type { Milk } from '@/lib/types'

export default function EditMilk({ m, onClose }: { m: Milk; onClose: () => void }) {
  const { t } = useTranslation()
  const save = useSave()
  const [l, setL] = useState(String(m.litres))
  const [fat, setFat] = useState(m.fat?.toString() ?? '')
  const [snf, setSnf] = useState(m.snf?.toString() ?? '')
  return (
    <Modal open onClose={onClose} title={t('edit')}>
      <div className="space-y-3">
        <Input type="number" step="0.1" value={l} onChange={(e) => setL(e.target.value)} />
        <div className="grid grid-cols-2 gap-2">
          <Input type="number" step="0.1" placeholder="Fat" value={fat} onChange={(e) => setFat(e.target.value)} />
          <Input type="number" step="0.1" placeholder="SNF" value={snf} onChange={(e) => setSnf(e.target.value)} />
        </div>
        <Button className="w-full" onClick={async () => (await save('milk_production', 'update', { litres: Number(l), fat: toNum(fat), snf: toNum(snf) }, { id: m.id })) && onClose()}>{t('save')}</Button>
      </div>
    </Modal>
  )
}
