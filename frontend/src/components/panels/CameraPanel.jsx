// Janela flutuante "Câmara": a vista ao vivo de um módulo de câmara da montagem (renderizada em
// three/CameraFeeds.jsx a partir da objetiva). Arrasta-se pelo cabeçalho. Se o programa usa a
// câmara (esp_camera.h) mostra o tamanho/formato pedido e, em tons de cinzento, a imagem como o
// programa a recebe.
import { useEffect, useMemo, useRef, useState } from 'react'
import { Button, Card, CardBody, CardHeader, Chip, Select, SelectItem, Tooltip } from '@heroui/react'
import { Camera, GripHorizontal, X } from 'lucide-react'
import { useStore } from '../../contexts/store.js'
import { simRef } from '../../contexts/simRef.js'
import { camFeed, CAM_W, CAM_H } from '../three/CameraFeeds.jsx'
import { useT } from '../../i18n/index.js'

const GRAY = 3 // PIXFORMAT_GRAYSCALE (libs/esp_camera.js)

// botão da barra da Montagem 3D (só aparece se houver uma câmara na montagem)
export function CameraToggle() {
  const t = useT()
  const has = useStore((s) => s.parts.some((p) => p.type === 'cameraModule'))
  const open = useStore((s) => s.camOpen)
  const set = useStore((s) => s.set)
  if (!has) return null
  return (
    <Tooltip content={t('wb.cam.tip')}>
      <Button size="sm" variant="flat" aria-pressed={open} className={`border border-white/10 ${open ? 'bg-white text-black' : 'bg-black/70'}`} onPress={() => set({ camOpen: !open })} startContent={<Camera size={14} />}>
        {t('wb.cam.button')}
      </Button>
    </Tooltip>
  )
}

export function CameraPanel() {
  const t = useT()
  const open = useStore((s) => s.camOpen)
  const parts = useStore((s) => s.parts)
  const camSel = useStore((s) => s.camSel)
  const set = useStore((s) => s.set)
  const cams = useMemo(() => parts.filter((p) => p.type === 'cameraModule'), [parts])
  const id = cams.some((c) => c.id === camSel) ? camSel : cams[0]?.id
  const canvasRef = useRef(null)
  const [info, setInfo] = useState({ has: false, prog: null })
  // posição (arrastável): distância ao canto inferior direito da área do simulador
  const [pos, setPos] = useState({ r: 12, b: 56 })
  const drag = useRef(null)

  useEffect(() => {
    if (!open || !id) return
    const draw = (fid) => {
      if (fid !== id) return
      const f = camFeed.frames.get(id)
      const cv = canvasRef.current
      if (!f || !cv) return
      const cam = simRef.engine?.live?.[id]?.cam
      const prog = cam?.on ? { w: cam.w, h: cam.h, fmt: cam.fmt } : null
      let data = f.rgba
      // o programa pede tons de cinzento: mostra a imagem como ele a recebe (mesma fórmula)
      if (prog?.fmt === GRAY) {
        data = new Uint8ClampedArray(f.rgba)
        for (let i = 0; i < data.length; i += 4) data[i] = data[i + 1] = data[i + 2] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
      }
      cv.getContext('2d').putImageData(new ImageData(data, f.w, f.h), 0, 0)
      setInfo((o) => (o.has && o.prog?.w === prog?.w && o.prog?.h === prog?.h && o.prog?.fmt === prog?.fmt ? o : { has: true, prog }))
    }
    draw(id)
    return camFeed.subscribe(draw)
  }, [open, id])

  if (!open || !cams.length) return null
  const onDown = (e) => {
    // (o botão de fechar fica no cabeçalho: não começa a arrastar)
    if (e.button !== 0 || e.target.closest?.('button')) return
    drag.current = { x: e.clientX, y: e.clientY, ...pos }
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  const onMove = (e) => {
    const d = drag.current
    if (!d) return
    setPos({ r: Math.max(0, d.r - (e.clientX - d.x)), b: Math.max(0, d.b - (e.clientY - d.y)) })
  }
  const onUp = () => (drag.current = null)
  const fmtName = (f) => (f === GRAY ? t('wb.cam.gray') : t('wb.cam.color'))

  return (
    <Card className="absolute z-30 w-[344px] max-w-[calc(100%-24px)] border border-white/10 bg-[#0f0f0f]/95 backdrop-blur" style={{ right: pos.r, bottom: pos.b }} shadow="lg" radius="lg">
      <CardHeader className="flex items-center gap-2 py-2 px-3 cursor-move select-none touch-none" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
        <GripHorizontal size={14} className="text-neutral-500" />
        <Camera size={14} className="text-neutral-300" />
        <span className="text-sm font-medium text-white flex-1">{t('wb.cam.title')}</span>
        {info.prog && (
          <Chip size="sm" variant="flat" color="success" classNames={{ content: 'text-[10px]' }}>
            {t('wb.cam.program', { w: info.prog.w, h: info.prog.h, fmt: fmtName(info.prog.fmt) })}
          </Chip>
        )}
        <Button size="sm" variant="light" isIconOnly radius="full" className="text-neutral-500 data-[hover=true]:text-white w-7 h-7 min-w-7" onPress={() => set({ camOpen: false })} aria-label={t('common.close')}>
          <X size={14} />
        </Button>
      </CardHeader>
      <CardBody className="pt-0 px-3 pb-3 gap-2">
        {cams.length > 1 && (
          <Select size="sm" aria-label={t('wb.cam.pick')} selectedKeys={[id]} onSelectionChange={(k) => set({ camSel: [...k][0] || null })}>
            {cams.map((c) => (
              <SelectItem key={c.id}>{c.label || c.id}</SelectItem>
            ))}
          </Select>
        )}
        <div className="relative rounded-md overflow-hidden bg-black border border-white/10" style={{ aspectRatio: `${CAM_W} / ${CAM_H}` }}>
          <canvas ref={canvasRef} width={CAM_W} height={CAM_H} className="w-full h-full block" />
          {!info.has && <div className="absolute inset-0 flex items-center justify-center text-xs text-neutral-500 px-4 text-center">{t('wb.cam.waiting')}</div>}
        </div>
        <div className="flex items-center justify-between gap-2 text-[11px] text-neutral-500">
          <span>{t('wb.cam.preview', { w: CAM_W, h: CAM_H })}</span>
        </div>
        {!info.prog && <p className="text-[11px] text-neutral-500 leading-snug">{t('wb.cam.hint')}</p>}
      </CardBody>
    </Card>
  )
}
