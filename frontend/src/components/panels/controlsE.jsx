// Controlos de simulação das peças do grupo E:
//   'fields'  vários valores numéricos ajustáveis em tempo real (ex.: GPS: lat, lon, velocidade…)
//   'text'    texto enviado pela peça (ex.: HC-05: o "telemóvel" envia; mostra o que o Arduino enviou)
import { useEffect, useState } from 'react'
import { Button, Code, Input, ScrollShadow, Select, SelectItem } from '@heroui/react'
import { NumField } from '../common/NumField.jsx'
import { SendHorizontal } from 'lucide-react'
import { setInput } from '../../services/simControl.js'
import { simRef } from '../../contexts/simRef.js'
import { useT } from '../../i18n/index.js'

export function FieldsControl({ part, name, ia }) {
  const inp = simRef.inputs[part.id] || {}
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs text-neutral-300">{name}</span>
      <div className="grid grid-cols-2 gap-1.5">
        {ia.items.map((f) =>
          f.options ? (
            // escolha de uma lista (ex.: forma de onda do gerador de sinais)
            <Select
              key={f.key}
              size="sm"
              variant="bordered"
              label={f.label}
              selectedKeys={[String(inp[f.key] ?? part.config?.[f.key] ?? f.options[0][0])]}
              onSelectionChange={(k) => {
                const v = [...k][0]
                const opt = f.options.find((o) => String(o[0]) === v)
                if (opt) setInput(part.id, { [f.key]: opt[0] })
              }}
              className={f.wide ? 'col-span-2' : ''}
            >
              {f.options.map(([v, l]) => (
                <SelectItem key={String(v)}>{l}</SelectItem>
              ))}
            </Select>
          ) : (
          <NumField key={f.key} label={f.label} min={f.min} max={f.max} step={f.step} unit={f.unit} value={inp[f.key] ?? part.config?.[f.key] ?? 0} onChange={(x) => setInput(part.id, { [f.key]: x })} />
          ),
        )}
      </div>
    </div>
  )
}

export function TextControl({ part, name, ia }) {
  const t = useT()
  const [text, setText] = useState('')
  const [rx, setRx] = useState('')
  // o que a peça recebeu do Arduino (estado vivo do backend), atualizado 3× por segundo
  useEffect(() => {
    const timer = setInterval(() => setRx(String(simRef.engine?.live?.[part.id]?.rx ?? '')), 300)
    return () => clearInterval(timer)
  }, [part.id])
  const send = () => {
    setInput(part.id, { text, seq: Date.now() })
    setText('')
  }
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs text-neutral-300">
        {name} · {ia.label || t('tools.text.send')}
      </span>
      <div className="flex gap-1.5">
        <Input size="sm" variant="bordered" aria-label={ia.label || t('tools.text.text')} placeholder={ia.placeholder} value={text} onValueChange={setText} onKeyDown={(e) => e.key === 'Enter' && send()} />
        <Button size="sm" isIconOnly variant="flat" color="primary" aria-label={t('tools.text.sendBtn')} onPress={send}>
          <SendHorizontal size={15} />
        </Button>
      </div>
      <span className="text-[11px] text-neutral-500">{t('tools.text.received')}</span>
      <ScrollShadow className="max-h-20">
        <Code size="sm" className="text-[11px] whitespace-pre-wrap break-all w-full">
          {rx ? rx.slice(-200) : '—'}
        </Code>
      </ScrollShadow>
    </div>
  )
}
