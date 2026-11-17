// Tipos de letra da Adafruit_GFX (Fonts/FreeSans9pt7b.h…): cada cabeçalho é uma "biblioteca"
// com o objeto do tipo de letra. O desenho aproxima-os com o 5×7 ampliado (ver _gfxG.js).
export const GFX_FAMILIES = ['FreeMono', 'FreeMonoBold', 'FreeMonoOblique', 'FreeMonoBoldOblique', 'FreeSans', 'FreeSansBold', 'FreeSansOblique', 'FreeSansBoldOblique', 'FreeSerif', 'FreeSerifBold', 'FreeSerifItalic', 'FreeSerifBoldItalic']
export const GFX_SIZES = [9, 12, 18, 24]
export const GFX_FONTS = GFX_FAMILIES.flatMap((f) => GFX_SIZES.map((pt) => ({ name: `${f}${pt}pt7b`, pt })))

export const LIBS_GFX_FONTS = GFX_FONTS.map(({ name, pt }) => ({ header: `Fonts/${name}.h`, globals: { [name]: { name, pt } } }))
