import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAnimals, useWithdrawal } from '@/lib/data'
import { Badge, Card, Input } from '@/components/ui'

export default function AnimalsList() {
  const { t } = useTranslation()
  const { data = [] } = useAnimals()
  const { data: wd = [] } = useWithdrawal()
  const [q, setQ] = useState('')
  const rows = data.filter((a) => !a.archived && (a.tag_no + (a.name || '') + a.breed).toLowerCase().includes(q.toLowerCase()))
  return (
    <div className="space-y-3">
      <h1 className="text-2xl font-extrabold text-brand-900">{t('animal.title')}</h1>
      <Input big placeholder={t('search')} value={q} onChange={(e) => setQ(e.target.value)} />
      {rows.map((a) => (
        <Link key={a.id} to={`/m/animals/${a.id}`}>
          <Card className="mb-2 flex items-center gap-3">
            {a.photo_url ? <img src={a.photo_url} className="h-14 w-14 rounded-xl object-cover" alt="" /> : <div className="grid h-14 w-14 place-items-center rounded-xl bg-brand-100 text-2xl">🐄</div>}
            <div className="flex-1">
              <div className="text-xl font-extrabold">{a.tag_no} {a.name && <span className="text-base font-semibold text-gray-600">· {a.name}</span>}</div>
              <div className="text-sm text-gray-600">{a.type} · {a.breed}</div>
            </div>
            <div className="text-right">
              <Badge tone={a.status === 'Lactating' ? 'green' : 'gray'}>{a.status}</Badge>
              {wd.some((w) => w.animal_id === a.id) && <div className="mt-1"><Badge tone="red">{t('home.withdrawal')}</Badge></div>}
            </div>
          </Card>
        </Link>
      ))}
    </div>
  )
}
