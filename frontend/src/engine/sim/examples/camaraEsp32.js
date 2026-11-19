// Câmara no ESP32 (esp_camera.h, como na ESP32-CAM): mesa pequena sobre a linha da pista oval
// com um ESP32 em cima e o módulo de câmara na borda, a olhar ao longo da linha, 45° para baixo. O programa lê um frame em tons
// de cinzento (160×120) e escreve na porta série o brilho médio e a coluna mais escura da metade
// de baixo da imagem (onde está a linha preta da pista) — o ponto de partida de um seguidor de
// linha por câmara (ponha a câmara num robô e use o "erro" para virar). Para ver a vista a
// seguir um robô em movimento, abra o cão robô (caoRoboAlu), que tem a câmara na cabeça.
// A imagem vem da vista 3D (o botão "Câmara" na Montagem 3D mostra-a); sem vista 3D
// (verificação sem browser) o simulador gera uma imagem sintética de céu e chão.
import { H } from '../examples.js'

const { part } = H

function buildCamara() {
  const parts = [
    // mesa pequena por cima da linha da pista oval (no lado direito, x ≈ 85 cm, onde a linha corre
    // ao longo de z); a câmara na borda olha ao longo da linha, como num robô seguidor
    part('mesa', 'mesa', { pos: [85, 0, -16], config: { l: 12, w: 8, h: 7 } }),
    part('esp', 'esp32', { parent: ['mesa', 'topo'], pos: [-2.5, 0, -0.5], config: { usb: true }, sch: [0, 0] }),
    // objetiva (+y da peça) para +z e 45° para baixo; o "cima" da imagem (−x da peça) fica para cima
    part('cam', 'cameraModule', { parent: ['mesa', 'topo'], pos: [0, 1.3, 3.2], rot: [135, -90, 0], sch: [420, 0] }),
  ]
  return { parts, wires: [] }
}

const CODE = `// ==========================================
//  Câmara no ESP32 (esp_camera.h, como na ESP32-CAM)
//  Lê um frame em tons de cinzento (160×120) e mostra:
//   - o brilho médio da imagem (0 = preto, 255 = branco)
//   - a coluna mais escura da metade de baixo (a linha preta)
//  Abra a vista da câmara com o botão "Câmara" (Montagem 3D).
// ==========================================
#include "esp_camera.h"

void setup() {
  Serial.begin(115200);

  camera_config_t config;
  // (numa ESP32-CAM real preencha também os pinos: pin_d0..pin_d7, pin_xclk, pin_pclk,
  //  pin_vsync, pin_href, pin_sccb_sda, pin_sccb_scl, pin_pwdn, pin_reset)
  config.xclk_freq_hz = 20000000;
  config.pixel_format = PIXFORMAT_GRAYSCALE;  // 1 byte por píxel
  config.frame_size = FRAMESIZE_QQVGA;        // 160 x 120
  config.fb_count = 1;

  esp_err_t err = esp_camera_init(&config);
  if (err != ESP_OK) {
    Serial.printf("Falha na camara: 0x%x\\n", err);
    while (true) delay(1000);
  }
  Serial.println("Camara pronta (160x120, tons de cinzento)");
}

void loop() {
  camera_fb_t *fb = esp_camera_fb_get();
  if (!fb) {
    Serial.println("Sem imagem");
    delay(200);
    return;
  }
  int w = fb->width;
  int h = fb->height;

  // brilho médio de toda a imagem
  uint32_t soma = 0;
  for (size_t i = 0; i < fb->len; i++) soma += fb->buf[i];
  int brilho = soma / fb->len;

  // coluna mais escura na metade de baixo (o chão perto do robô)
  int colunaEscura = 0;
  uint32_t menor = 0xFFFFFFFF;
  for (int x = 0; x < w; x++) {
    uint32_t col = 0;
    for (int y = h / 2; y < h; y++) col += fb->buf[y * w + x];
    if (col < menor) {
      menor = col;
      colunaEscura = x;
    }
  }
  esp_camera_fb_return(fb);  // devolve o buffer para a próxima captura

  // posição da linha: -100 (toda à esquerda) .. 0 (ao centro) .. +100 (toda à direita)
  int erro = map(colunaEscura, 0, w - 1, -100, 100);
  Serial.printf("brilho medio: %d   coluna mais escura: %d de %d   (erro %d)\\n", brilho, colunaEscura, w, erro);
  delay(500);
}
`

export const PRESETS = {
  camaraEsp32: {
    name: 'Câmara no ESP32: brilho e linha mais escura (esp_camera.h)',
    cat: 'ESP32',
    track: 'oval',
    build: buildCamara,
    code: CODE,
  },
}
