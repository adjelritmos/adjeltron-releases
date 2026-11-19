// Módulo de câmara (tipo Raspberry Pi Camera v2 / OV2640 da ESP32-CAM, 25 × 24 mm). PCB deitada no
// plano xz, objetiva para cima (+y), fita para −x; o "cima" da imagem é −x da peça (o lado da fita), a direita é +z.
// Vista ao vivo: frontend/src/components/three/CameraFeeds.jsx renderiza a cena a partir da
// objetiva (janela "Câmara", panels/CameraPanel.jsx) e envia a imagem ao programa do ESP32
// (esp_camera.h, engine/sim/libs/esp_camera.js). Sem pinos: a ligação da câmara à placa
// (barramento DVP + SCCB) não é desenhada, como no ESP32-CAM, onde vem já soldada.
export default {
  type: 'cameraModule',
  name: 'Módulo de câmara',
  short: 'Câmara',
  cat: 'robot',
  description:
    'Câmara do tamanho de uma moeda (tipo Raspberry Pi Camera v2 / OV2640 da ESP32-CAM) com fita plana de 15 vias. Mostra o que a objetiva vê: na Montagem 3D, o botão "Câmara" abre a vista ao vivo, que acompanha o robô enquanto se mexe. Num ESP32 o programa lê as imagens com a biblioteca esp_camera.h (como na ESP32-CAM): camera_config_t com pixel_format = PIXFORMAT_GRAYSCALE ou PIXFORMAT_RGB565 e frame_size = FRAMESIZE_QQVGA (160×120) ou FRAMESIZE_QVGA (320×240), esp_camera_init(&config), depois camera_fb_t *fb = esp_camera_fb_get() — os píxeis em fb->buf[i] (fb->len bytes, fb->width × fb->height) — e esp_camera_fb_return(fb). Não precisa de fios (a ligação à placa é a da ESP32-CAM); encaixa no ponto "câmara" da cabeça do cão robô. Para medir distâncias use o HC-SR04 ou o VL53L0X.',
  size: [2.5, 0.65, 2.4],
  pins: [],
  mech: true,
  mass: 3,
  // placa e a objetiva (o cabo plano é flexível: não colide)
  collider: [
    { size: [2.5, 0.2, 2.4], pos: [0, 0.1, 0] },
    { size: [0.86, 0.62, 0.86], pos: [0.35, 0.42, 0] },
  ],
}
