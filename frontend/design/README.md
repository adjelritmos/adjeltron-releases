# Originais das imagens do site

`logo.png` e `splash.png` em resolução completa. O site usa versões WebP leves em `public/`
(`logo.webp` 128 px de altura, `splash.webp` 840 px, `favicon.png` 64 px), geradas com:

```bash
cwebp -q 82 -m 6 -resize 840 840 design/splash.png -o public/splash.webp
cwebp -q 90 -alpha_q 90 -m 6 -resize 0 128 design/logo.png -o public/logo.webp
sips -Z 64 design/logo.png --out public/favicon.png
```
