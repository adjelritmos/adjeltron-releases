// esp_camera.h (componente esp32-camera da Espressif, o da ESP32-CAM) — subconjunto real da API:
//   camera_config_t config;  config.pixel_format = PIXFORMAT_GRAYSCALE;  config.frame_size = FRAMESIZE_QQVGA;
//   esp_camera_init(&config) → ESP_OK
//   camera_fb_t *fb = esp_camera_fb_get();  fb->buf[i], fb->len, fb->width, fb->height, fb->format
//   esp_camera_fb_return(fb);  esp_camera_deinit();  sensor_t *s = esp_camera_sensor_get(); s->set_vflip(s, 1)…
// A imagem é a do módulo de câmara (peça cameraModule) da montagem: o browser renderiza a cena 3D a
// partir da objetiva (components/three/CameraFeeds.jsx) e envia-a ao worker (mensagem 'camFrame',
// fica em env.input(id).frame = { w, h, rgb }). Sem vista 3D (verificação sem browser, aba 3D
// nunca aberta) a imagem é sintética: céu claro e chão escuro com o horizonte calculado pela
// inclinação real da câmara — dá para testar o programa, não para "ver" objetos.
// Limitações do tradutor: o frame buffer é um objeto JS (fb->campo vira fb.campo) e fb->buf é um
// Uint8Array — índices (fb->buf[i]) e ponteiros simples (uint8_t *p = fb->buf; p[i]) funcionam;
// aritmética de ponteiros (*(p + i), p++) e memcpy para structs não.
import * as i18n from '../../../../../shared/i18n.js'

// formatos (pixformat_t) e tamanhos (framesize_t) com os mesmos valores do esp32-camera
const PIX = { PIXFORMAT_RGB565: 0, PIXFORMAT_YUV422: 1, PIXFORMAT_YUV420: 2, PIXFORMAT_GRAYSCALE: 3, PIXFORMAT_JPEG: 4, PIXFORMAT_RGB888: 5, PIXFORMAT_RAW: 6, PIXFORMAT_RGB444: 7, PIXFORMAT_RGB555: 8 }
const SIZES = [
  ['FRAMESIZE_96X96', 96, 96], ['FRAMESIZE_QQVGA', 160, 120], ['FRAMESIZE_QCIF', 176, 144], ['FRAMESIZE_HQVGA', 240, 176],
  ['FRAMESIZE_240X240', 240, 240], ['FRAMESIZE_QVGA', 320, 240],
]
// tamanhos maiores existem na API mas o simulador limita-se à vista de 320×240
const BIG = ['FRAMESIZE_CIF', 'FRAMESIZE_HVGA', 'FRAMESIZE_VGA', 'FRAMESIZE_SVGA', 'FRAMESIZE_XGA', 'FRAMESIZE_HD', 'FRAMESIZE_SXGA', 'FRAMESIZE_UXGA']
const FRAMESIZE = {}
SIZES.forEach(([n], i) => (FRAMESIZE[n] = i))
BIG.forEach((n, i) => (FRAMESIZE[n] = SIZES.length + i))
const ESP_OK = 0
const ESP_FAIL = -1
const ESP_ERR_NOT_SUPPORTED = 0x106
const ESP_ERR_INVALID_STATE = 0x103
const ESP_ERR_CAMERA_NOT_DETECTED = 0x20001
const ESP_ERR_CAMERA_NOT_SUPPORTED = 0x20003

// campos de camera_config_t (os pinos são aceites e ignorados: a ligação da câmara é a da placa)
class CameraConfig {
  constructor() {
    Object.assign(this, {
      pin_pwdn: -1, pin_reset: -1, pin_xclk: -1, pin_sccb_sda: -1, pin_sccb_scl: -1, pin_sscb_sda: -1, pin_sscb_scl: -1,
      pin_d7: -1, pin_d6: -1, pin_d5: -1, pin_d4: -1, pin_d3: -1, pin_d2: -1, pin_d1: -1, pin_d0: -1,
      pin_vsync: -1, pin_href: -1, pin_pclk: -1, xclk_freq_hz: 20000000, ledc_timer: 0, ledc_channel: 0,
      pixel_format: PIX.PIXFORMAT_JPEG, frame_size: FRAMESIZE.FRAMESIZE_QVGA, jpeg_quality: 12, fb_count: 1, fb_location: 1, grab_mode: 0, sccb_i2c_port: -1,
    })
  }
}
class CameraFb {}

// imagem RGB (w×h×3) → tamanho pedido (média das caixas, como o redimensionamento do sensor)
function resample(src, sw, sh, w, h) {
  if (sw === w && sh === h) return src
  const out = new Uint8Array(w * h * 3)
  // recorte central quando a proporção difere (96×96, 240×240: o sensor recorta o centro)
  const ar = w / h
  let cw = sw
  let ch = sh
  if (sw / sh > ar) cw = Math.round(sh * ar)
  else ch = Math.round(sw / ar)
  const ox = (sw - cw) >> 1
  const oy = (sh - ch) >> 1
  for (let y = 0; y < h; y++) {
    const y0 = oy + Math.floor((y * ch) / h)
    const y1 = Math.max(y0 + 1, oy + Math.floor(((y + 1) * ch) / h))
    for (let x = 0; x < w; x++) {
      const x0 = ox + Math.floor((x * cw) / w)
      const x1 = Math.max(x0 + 1, ox + Math.floor(((x + 1) * cw) / w))
      let r = 0
      let g = 0
      let b = 0
      let n = 0
      for (let yy = y0; yy < y1; yy++)
        for (let xx = x0; xx < x1; xx++) {
          const k = (yy * sw + xx) * 3
          r += src[k]
          g += src[k + 1]
          b += src[k + 2]
          n++
        }
      const o = (y * w + x) * 3
      out[o] = r / n
      out[o + 1] = g / n
      out[o + 2] = b / n
    }
  }
  return out
}

// imagem sintética (sem vista 3D): horizonte pela inclinação da objetiva (+y local da peça)
function synthetic(env, camId, w, h) {
  let pitch = 0
  try {
    const d = env.worldDir(camId, [0, 1, 0])
    pitch = Math.asin(Math.max(-1, Math.min(1, d[1])))
  } catch {
    pitch = 0
  }
  const half = (24 * Math.PI) / 180 // meio campo vertical (~48°)
  // linha do horizonte (0 = topo): câmara a olhar para baixo → horizonte sobe na imagem
  const hy = (h / 2) * (1 + Math.tan(pitch) / Math.tan(half))
  const out = new Uint8Array(w * h * 3)
  for (let y = 0; y < h; y++) {
    const sky = y < hy
    for (let x = 0; x < w; x++) {
      const o = (y * w + x) * 3
      // céu mais claro em cima; chão com um degradê suave para o brilho não ser constante
      const v = sky ? 200 - (y / h) * 30 : 70 + ((y - hy) / h) * 40
      out[o] = v
      out[o + 1] = v
      out[o + 2] = sky ? Math.min(255, v + 20) : v
    }
  }
  return out
}

function esp32Camera(env) {
  const S = { on: false, cfg: null, camId: null, w: 160, h: 120, fmt: PIX.PIXFORMAT_GRAYSCALE, out: 0, count: 1, seq: 0, sensor: null, vflip: 0, hmirror: 0, brightness: 0, contrast: 0 }
  const L = () => env.live(S.camId)
  const publish = () => {
    if (!S.camId) return
    // o browser só renderiza para o motor enquanto L().cam estiver ligado (ver CameraFeeds.jsx)
    L().cam = S.on ? { on: true, w: S.w, h: S.h, fmt: S.fmt, seq: S.seq } : { on: false }
  }
  const sizeOf = (fs) => {
    const s = SIZES[fs]
    if (s) return [s[1], s[2]]
    return null
  }
  const setSize = (fs) => {
    const s = sizeOf(fs)
    if (!s) {
      env.warnOnce(`cam-size${fs}`, i18n.m('esp_camera: o simulador só gera imagens até 320×240 (FRAMESIZE_QVGA) — use FRAMESIZE_QQVGA ou FRAMESIZE_QVGA. Fica QVGA.', 'esp_camera: the simulator only produces images up to 320×240 (FRAMESIZE_QVGA) — use FRAMESIZE_QQVGA or FRAMESIZE_QVGA. Using QVGA.'))
      ;[S.w, S.h] = [320, 240]
      return
    }
    ;[S.w, S.h] = s
  }
  const setFmt = (f) => {
    if (f === PIX.PIXFORMAT_GRAYSCALE || f === PIX.PIXFORMAT_RGB565 || f === PIX.PIXFORMAT_RGB888) return (S.fmt = f), true
    env.warnOnce(`cam-fmt${f}`, i18n.m('esp_camera: formato não suportado no simulador (JPEG/YUV) — use PIXFORMAT_GRAYSCALE, PIXFORMAT_RGB565 ou PIXFORMAT_RGB888.', 'esp_camera: pixel format not supported in the simulator (JPEG/YUV) — use PIXFORMAT_GRAYSCALE, PIXFORMAT_RGB565 or PIXFORMAT_RGB888.'))
    return false
  }
  const sensor = () =>
    (S.sensor ||= {
      id: { PID: 0x26 }, // OV2640
      pixformat: S.fmt,
      set_framesize: (_s, fs) => (setSize(fs), publish(), 0),
      set_pixformat: (_s, f) => (setFmt(f) ? (publish(), 0) : -1),
      set_vflip: (_s, v) => ((S.vflip = v ? 1 : 0), 0),
      set_hmirror: (_s, v) => ((S.hmirror = v ? 1 : 0), 0),
      set_brightness: (_s, v) => ((S.brightness = Math.max(-2, Math.min(2, v | 0))), 0),
      set_contrast: (_s, v) => ((S.contrast = Math.max(-2, Math.min(2, v | 0))), 0),
      set_saturation: () => 0, set_quality: () => 0, set_whitebal: () => 0, set_awb_gain: () => 0, set_wb_mode: () => 0,
      set_exposure_ctrl: () => 0, set_aec2: () => 0, set_ae_level: () => 0, set_aec_value: () => 0, set_gain_ctrl: () => 0,
      set_agc_gain: () => 0, set_gainceiling: () => 0, set_bpc: () => 0, set_wpc: () => 0, set_raw_gma: () => 0, set_lenc: () => 0,
      set_dcw: () => 0, set_colorbar: () => 0, set_special_effect: () => 0, set_sharpness: () => 0, set_denoise: () => 0,
    })

  const grab = () => {
    const inp = env.input(S.camId)?.frame
    let rgb
    let w = S.w
    let h = S.h
    if (inp?.rgb && inp.w > 0 && inp.h > 0) rgb = resample(inp.rgb, inp.w, inp.h, w, h)
    else {
      if (env.rt.t > 3e6)
        env.warnOnce('cam-synth', i18n.m('ℹ esp_camera: sem imagem da vista 3D (separador Montagem 3D fechado ou simulação sem browser) — a imagem é sintética (céu e chão pela inclinação da câmara).', 'ℹ esp_camera: no image from the 3D view (3D Assembly tab closed or simulation without a browser) — the image is synthetic (sky and floor from the camera tilt).'), 'info')
      rgb = synthetic(env, S.camId, w, h)
    }
    const n = w * h
    const bpp = S.fmt === PIX.PIXFORMAT_GRAYSCALE ? 1 : S.fmt === PIX.PIXFORMAT_RGB565 ? 2 : 3
    const buf = new Uint8Array(n * bpp)
    const gain = 1 + S.contrast * 0.15
    const off = S.brightness * 20
    for (let y = 0; y < h; y++) {
      const sy = S.vflip ? h - 1 - y : y
      for (let x = 0; x < w; x++) {
        const sx = S.hmirror ? w - 1 - x : x
        const k = (sy * w + sx) * 3
        const adj = (v) => Math.max(0, Math.min(255, Math.round((v - 128) * gain + 128 + off)))
        const r = adj(rgb[k])
        const g = adj(rgb[k + 1])
        const b = adj(rgb[k + 2])
        const i = y * w + x
        if (bpp === 1) buf[i] = Math.round(0.299 * r + 0.587 * g + 0.114 * b)
        else if (bpp === 2) {
          // RGB565 com o byte alto primeiro (como o OV2640 envia)
          const v = ((r & 0xf8) << 8) | ((g & 0xfc) << 3) | (b >> 3)
          buf[2 * i] = v >> 8
          buf[2 * i + 1] = v & 0xff
        } else {
          // RGB888 do esp32-camera: ordem B, G, R
          buf[3 * i] = b
          buf[3 * i + 1] = g
          buf[3 * i + 2] = r
        }
      }
    }
    const fb = new CameraFb()
    Object.assign(fb, { buf, len: buf.length, width: w, height: h, format: S.fmt, timestamp: { tv_sec: Math.floor(env.rt.t / 1e6), tv_usec: Math.floor(env.rt.t % 1e6) } })
    return fb
  }

  return {
    esp_camera_init(cfg) {
      env.rt.t += 300000 // arranque do sensor (SCCB, XCLK, DMA)
      if (env.board?.id !== 'esp32') {
        env.warnOnce('cam-board', i18n.m('esp_camera.h é do ESP32 (ESP32-CAM): escolha a placa ESP32 DevKit.', 'esp_camera.h is for the ESP32 (ESP32-CAM): choose the ESP32 DevKit board.'), 'error')
        return ESP_ERR_NOT_SUPPORTED
      }
      const cam = (env.parts || []).find((p) => p.type === 'cameraModule')
      if (!cam) {
        env.warnOnce('cam-none', i18n.m('esp_camera_init: não há câmara na montagem — acrescente um "Módulo de câmara" (o programa recebe ESP_ERR_CAMERA_NOT_DETECTED, como no real sem câmara ligada).', 'esp_camera_init: there is no camera in the assembly — add a "Camera module" (the program gets ESP_ERR_CAMERA_NOT_DETECTED, as on real hardware with no camera attached).'), 'error')
        return ESP_ERR_CAMERA_NOT_DETECTED
      }
      if (S.on) return ESP_ERR_INVALID_STATE
      const c = cfg || new CameraConfig()
      if (!setFmt(c.pixel_format ?? PIX.PIXFORMAT_JPEG)) return ESP_ERR_CAMERA_NOT_SUPPORTED
      setSize(c.frame_size ?? FRAMESIZE.FRAMESIZE_QVGA)
      S.cfg = c
      S.camId = cam.id
      S.count = Math.max(1, c.fb_count | 0 || 1)
      S.out = 0
      S.on = true
      publish()
      return ESP_OK
    },
    esp_camera_deinit() {
      S.on = false
      publish()
      return ESP_OK
    },
    esp_camera_fb_get() {
      if (!S.on) {
        env.warnOnce('cam-noinit', i18n.m('esp_camera_fb_get() sem esp_camera_init(): devolve NULL.', 'esp_camera_fb_get() without esp_camera_init(): returns NULL.'))
        return null
      }
      if (S.out >= S.count) {
        env.warnOnce('cam-noreturn', i18n.m(`esp_camera_fb_get(): todos os ${S.count} frame buffer(s) estão em uso — falta esp_camera_fb_return(fb) depois de usar a imagem. Devolve NULL (no real fica à espera e dá timeout).`, `esp_camera_fb_get(): all ${S.count} frame buffer(s) are in use — missing esp_camera_fb_return(fb) after using the image. Returns NULL (on real hardware it waits and times out).`))
        env.rt.t += 100000
        return null
      }
      // tempo de captura: ~25 fps em QQVGA, ~12 fps em QVGA (conversão incluída)
      env.rt.t += S.w * S.h > 40000 ? 80000 : 40000
      S.out++
      S.seq++
      publish()
      return grab()
    },
    esp_camera_fb_return(fb) {
      if (fb && !fb.__returned) {
        fb.__returned = true
        S.out = Math.max(0, S.out - 1)
      }
    },
    esp_camera_sensor_get() {
      return S.on ? sensor() : null
    },
    esp_camera_save_to_nvs: () => ESP_OK,
    esp_camera_load_from_nvs: () => ESP_OK,
  }
}

export default {
  header: 'esp_camera.h',
  globals: {
    ...PIX,
    ...FRAMESIZE,
    ESP_OK, ESP_FAIL, ESP_ERR_NOT_SUPPORTED, ESP_ERR_INVALID_STATE, ESP_ERR_CAMERA_NOT_DETECTED, ESP_ERR_CAMERA_NOT_SUPPORTED,
    CAMERA_GRAB_WHEN_EMPTY: 0, CAMERA_GRAB_LATEST: 1, CAMERA_FB_IN_PSRAM: 0, CAMERA_FB_IN_DRAM: 1,
    LEDC_TIMER_0: 0, LEDC_TIMER_1: 1, LEDC_CHANNEL_0: 0, LEDC_CHANNEL_1: 1,
    psramFound: () => true,
  },
  classes: { camera_config_t: () => CameraConfig, camera_fb_t: () => CameraFb, sensor_t: () => Object },
  env: (env) => esp32Camera(env),
}
