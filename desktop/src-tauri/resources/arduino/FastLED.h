#pragma once
// FastLED (subconjunto simulado): declarações para a verificação com o clang.
#include "Arduino.h"

typedef uint8_t fract8;
typedef uint16_t fract16;
typedef uint16_t accum88;

typedef enum { HUE_RED = 0, HUE_ORANGE = 32, HUE_YELLOW = 64, HUE_GREEN = 96, HUE_AQUA = 128, HUE_BLUE = 160, HUE_PURPLE = 192, HUE_PINK = 224 } HSVHue;
typedef enum { NOBLEND = 0, LINEARBLEND = 1, LINEARBLEND_NOWRAP = 2, BLEND = 1 } TBlendType;
typedef enum { RGB = 0012, RBG = 0021, GRB = 0102, GBR = 0120, BRG = 0201, BGR = 0210 } EOrder;
typedef enum { LPD6803, LPD8806, WS2801, WS2803, SM16716, P9813, APA102, SK9822, DOTSTAR } ESPIChipsets;
typedef enum {
  TypicalSMD5050 = 0xFFB0F0, TypicalLEDStrip = 0xFFB0F0, Typical8mmPixel = 0xFFE08C, TypicalPixelString = 0xFFE08C, UncorrectedColor = 0xFFFFFF
} LEDColorCorrection;
typedef enum {
  Candle = 0xFF9329, Tungsten40W = 0xFFC58F, Tungsten100W = 0xFFD6AA, Halogen = 0xFFF1E0, CarbonArc = 0xFFFAF4, HighNoonSun = 0xFFFFFB,
  DirectSunlight = 0xFFFFFF, OvercastSky = 0xC9E2FF, ClearBlueSky = 0x409CFF, WarmFluorescent = 0xFFF4E5, StandardFluorescent = 0xF4FFFA,
  CoolWhiteFluorescent = 0xD4EBFF, FullSpectrumFluorescent = 0xFFF4F2, GrowLightFluorescent = 0xFFEFF7, BlackLightFluorescent = 0xA700FF,
  MercuryVapor = 0xD8F7FF, SodiumVapor = 0xFFD1B2, MetalHalide = 0xF2FCFF, HighPressureSodium = 0xFFB74C, UncorrectedTemperature = 0xFFFFFF
} ColorTemperature;
#define DISABLE_DITHER 0x00
#define BINARY_DITHER 0x01

struct CHSV {
  union {
    struct {
      union { uint8_t hue; uint8_t h; };
      union { uint8_t saturation; uint8_t sat; uint8_t s; };
      union { uint8_t value; uint8_t val; uint8_t v; };
    };
    uint8_t raw[3];
  };
  CHSV() {}
  CHSV(uint8_t ih, uint8_t is, uint8_t iv) : h(ih), s(is), v(iv) {}
  uint8_t &operator[](uint8_t x) { return raw[x]; }
  CHSV &setHSV(uint8_t ih, uint8_t is, uint8_t iv);
};

struct CRGB {
  union {
    struct {
      union { uint8_t r; uint8_t red; };
      union { uint8_t g; uint8_t green; };
      union { uint8_t b; uint8_t blue; };
    };
    uint8_t raw[3];
  };
  typedef enum {
    AliceBlue = 0xF0F8FF, Amethyst = 0x9966CC, AntiqueWhite = 0xFAEBD7, Aqua = 0x00FFFF, Aquamarine = 0x7FFFD4, Azure = 0xF0FFFF, Beige = 0xF5F5DC,
    Bisque = 0xFFE4C4, Black = 0x000000, BlanchedAlmond = 0xFFEBCD, Blue = 0x0000FF, BlueViolet = 0x8A2BE2, Brown = 0xA52A2A, BurlyWood = 0xDEB887,
    CadetBlue = 0x5F9EA0, Chartreuse = 0x7FFF00, Chocolate = 0xD2691E, Coral = 0xFF7F50, CornflowerBlue = 0x6495ED, Cornsilk = 0xFFF8DC,
    Crimson = 0xDC143C, Cyan = 0x00FFFF, DarkBlue = 0x00008B, DarkCyan = 0x008B8B, DarkGoldenrod = 0xB8860B, DarkGray = 0xA9A9A9,
    DarkGreen = 0x006400, DarkKhaki = 0xBDB76B, DarkMagenta = 0x8B008B, DarkOliveGreen = 0x556B2F, DarkOrange = 0xFF8C00, DarkOrchid = 0x9932CC,
    DarkRed = 0x8B0000, DarkSalmon = 0xE9967A, DarkSeaGreen = 0x8FBC8F, DarkSlateBlue = 0x483D8B, DarkSlateGray = 0x2F4F4F, DarkTurquoise = 0x00CED1,
    DarkViolet = 0x9400D3, DeepPink = 0xFF1493, DeepSkyBlue = 0x00BFFF, DimGray = 0x696969, DodgerBlue = 0x1E90FF, FireBrick = 0xB22222,
    FloralWhite = 0xFFFAF0, ForestGreen = 0x228B22, Fuchsia = 0xFF00FF, Gainsboro = 0xDCDCDC, GhostWhite = 0xF8F8FF, Gold = 0xFFD700,
    Goldenrod = 0xDAA520, Gray = 0x808080, Grey = 0x808080, Green = 0x008000, GreenYellow = 0xADFF2F, Honeydew = 0xF0FFF0, HotPink = 0xFF69B4,
    IndianRed = 0xCD5C5C, Indigo = 0x4B0082, Ivory = 0xFFFFF0, Khaki = 0xF0E68C, Lavender = 0xE6E6FA, LavenderBlush = 0xFFF0F5, LawnGreen = 0x7CFC00,
    LemonChiffon = 0xFFFACD, LightBlue = 0xADD8E6, LightCoral = 0xF08080, LightCyan = 0xE0FFFF, LightGoldenrodYellow = 0xFAFAD2, LightGreen = 0x90EE90,
    LightGrey = 0xD3D3D3, LightPink = 0xFFB6C1, LightSalmon = 0xFFA07A, LightSeaGreen = 0x20B2AA, LightSkyBlue = 0x87CEFA, LightSlateGray = 0x778899,
    LightSteelBlue = 0xB0C4DE, LightYellow = 0xFFFFE0, Lime = 0x00FF00, LimeGreen = 0x32CD32, Linen = 0xFAF0E6, Magenta = 0xFF00FF, Maroon = 0x800000,
    MediumAquamarine = 0x66CDAA, MediumBlue = 0x0000CD, MediumOrchid = 0xBA55D3, MediumPurple = 0x9370DB, MediumSeaGreen = 0x3CB371,
    MediumSlateBlue = 0x7B68EE, MediumSpringGreen = 0x00FA9A, MediumTurquoise = 0x48D1CC, MediumVioletRed = 0xC71585, MidnightBlue = 0x191970,
    MintCream = 0xF5FFFA, MistyRose = 0xFFE4E1, Moccasin = 0xFFE4B5, NavajoWhite = 0xFFDEAD, Navy = 0x000080, OldLace = 0xFDF5E6, Olive = 0x808000,
    OliveDrab = 0x6B8E23, Orange = 0xFFA500, OrangeRed = 0xFF4500, Orchid = 0xDA70D6, PaleGoldenrod = 0xEEE8AA, PaleGreen = 0x98FB98,
    PaleTurquoise = 0xAFEEEE, PaleVioletRed = 0xDB7093, PapayaWhip = 0xFFEFD5, PeachPuff = 0xFFDAB9, Peru = 0xCD853F, Pink = 0xFFC0CB, Plaid = 0xCC5533,
    Plum = 0xDDA0DD, PowderBlue = 0xB0E0E6, Purple = 0x800080, Red = 0xFF0000, RosyBrown = 0xBC8F8F, RoyalBlue = 0x4169E1, SaddleBrown = 0x8B4513,
    Salmon = 0xFA8072, SandyBrown = 0xF4A460, SeaGreen = 0x2E8B57, Seashell = 0xFFF5EE, Sienna = 0xA0522D, Silver = 0xC0C0C0, SkyBlue = 0x87CEEB,
    SlateBlue = 0x6A5ACD, SlateGray = 0x708090, Snow = 0xFFFAFA, SpringGreen = 0x00FF7F, SteelBlue = 0x4682B4, Tan = 0xD2B48C, Teal = 0x008080,
    Thistle = 0xD8BFD8, Tomato = 0xFF6347, Turquoise = 0x40E0D0, Violet = 0xEE82EE, Wheat = 0xF5DEB3, White = 0xFFFFFF, WhiteSmoke = 0xF5F5F5,
    Yellow = 0xFFFF00, YellowGreen = 0x9ACD32, FairyLight = 0xFFE42D, FairyLightNCC = 0xFF9D2A
  } HTMLColorCode;
  CRGB() {}
  CRGB(uint8_t ir, uint8_t ig, uint8_t ib) : r(ir), g(ig), b(ib) {}
  CRGB(uint32_t colorcode);
  CRGB(LEDColorCorrection colorcode);
  CRGB(ColorTemperature colorcode);
  CRGB(HTMLColorCode colorcode);
  CRGB(const CHSV &rhs);
  CRGB &operator=(const CHSV &rhs);
  CRGB &operator=(const uint32_t colorcode);
  uint8_t &operator[](uint8_t x) { return raw[x]; }
  CRGB &setRGB(uint8_t nr, uint8_t ng, uint8_t nb);
  CRGB &setHSV(uint8_t hue, uint8_t sat, uint8_t val);
  CRGB &setHue(uint8_t hue);
  CRGB &setColorCode(uint32_t colorcode);
  CRGB &operator+=(const CRGB &rhs);
  CRGB &addToRGB(uint8_t d);
  CRGB &operator-=(const CRGB &rhs);
  CRGB &subtractFromRGB(uint8_t d);
  CRGB &operator--();
  CRGB operator--(int);
  CRGB &operator++();
  CRGB operator++(int);
  CRGB &operator/=(uint8_t d);
  CRGB &operator>>=(uint8_t d);
  CRGB &operator*=(uint8_t d);
  CRGB &nscale8_video(uint8_t scaledown);
  CRGB &operator%=(uint8_t scaledown);
  CRGB &fadeLightBy(uint8_t fadefactor);
  CRGB &nscale8(uint8_t scaledown);
  CRGB &nscale8(const CRGB &scaledown);
  CRGB scale8(uint8_t scaledown) const;
  CRGB &fadeToBlackBy(uint8_t fadefactor);
  CRGB &operator|=(const CRGB &rhs);
  CRGB &operator|=(uint8_t d);
  CRGB &operator&=(const CRGB &rhs);
  CRGB &operator&=(uint8_t d);
  explicit operator bool() const { return r || g || b; }
  CRGB operator-() const;
  uint8_t getLuminance() const;
  uint8_t getAverageLight() const;
  void maximizeBrightness(uint8_t limit = 255);
  CRGB lerp8(const CRGB &other, fract8 frac) const;
};
bool operator==(const CRGB &lhs, const CRGB &rhs);
bool operator!=(const CRGB &lhs, const CRGB &rhs);
CRGB operator+(const CRGB &p1, const CRGB &p2);
CRGB operator-(const CRGB &p1, const CRGB &p2);
CRGB operator*(const CRGB &p1, uint8_t d);
CRGB operator/(const CRGB &p1, uint8_t d);
CRGB operator&(const CRGB &p1, const CRGB &p2);
CRGB operator|(const CRGB &p1, const CRGB &p2);
CRGB operator%(const CRGB &p1, uint8_t d);

typedef uint32_t TProgmemRGBPalette16[16];
class CRGBPalette16 {
 public:
  CRGB entries[16];
  CRGBPalette16() {}
  CRGBPalette16(const CRGB &c1);
  CRGBPalette16(const CRGB &c1, const CRGB &c2);
  CRGBPalette16(const CRGB &c1, const CRGB &c2, const CRGB &c3);
  CRGBPalette16(const CRGB &c1, const CRGB &c2, const CRGB &c3, const CRGB &c4);
  CRGBPalette16(const CRGB &c00, const CRGB &c01, const CRGB &c02, const CRGB &c03, const CRGB &c04, const CRGB &c05, const CRGB &c06, const CRGB &c07,
                const CRGB &c08, const CRGB &c09, const CRGB &c10, const CRGB &c11, const CRGB &c12, const CRGB &c13, const CRGB &c14, const CRGB &c15);
  CRGBPalette16(const TProgmemRGBPalette16 &rhs);
  CRGBPalette16 &operator=(const TProgmemRGBPalette16 &rhs);
  CRGB &operator[](uint8_t x) { return entries[x]; }
};
class CHSVPalette16 {
 public:
  CHSV entries[16];
  CHSVPalette16() {}
  CHSVPalette16(const CHSV &c1, const CHSV &c2);
  CHSV &operator[](uint8_t x) { return entries[x]; }
};
extern const TProgmemRGBPalette16 CloudColors_p, LavaColors_p, OceanColors_p, ForestColors_p, RainbowColors_p, RainbowStripeColors_p, PartyColors_p, HeatColors_p;

template <int SIZE>
class CRGBArray {
 public:
  CRGB leds[SIZE];
  CRGB &operator[](int x) { return leds[x]; }
  operator CRGB *() { return leds; }
};

class CLEDController {
 public:
  CLEDController &setCorrection(CRGB correction);
  CLEDController &setCorrection(LEDColorCorrection correction);
  CLEDController &setTemperature(CRGB temperature);
  CLEDController &setTemperature(ColorTemperature temperature);
  CLEDController &setDither(uint8_t ditherMode = BINARY_DITHER);
  CLEDController &setLeds(CRGB *data, int nLeds);
  void showLeds(uint8_t brightness = 255);
  void clearLedData();
  CRGB *leds();
  int size();
};

// tipos de LED (o pino e a ordem são argumentos do template, como na biblioteca)
#define FL_CLOCKLESS(NAME) template <uint8_t DATA_PIN, EOrder RGB_ORDER = RGB> class NAME {};
FL_CLOCKLESS(WS2812B) FL_CLOCKLESS(WS2812) FL_CLOCKLESS(WS2811) FL_CLOCKLESS(WS2811_400) FL_CLOCKLESS(WS2813) FL_CLOCKLESS(WS2815) FL_CLOCKLESS(SK6812)
FL_CLOCKLESS(SK6822) FL_CLOCKLESS(TM1803) FL_CLOCKLESS(TM1804) FL_CLOCKLESS(TM1809) FL_CLOCKLESS(TM1829) FL_CLOCKLESS(UCS1903) FL_CLOCKLESS(UCS1903B)
FL_CLOCKLESS(UCS1904) FL_CLOCKLESS(GW6205) FL_CLOCKLESS(APA104) FL_CLOCKLESS(APA106) FL_CLOCKLESS(PL9823) FL_CLOCKLESS(WS2852) FL_CLOCKLESS(GE8822)
FL_CLOCKLESS(LPD1886) FL_CLOCKLESS(SM16703)
#undef FL_CLOCKLESS
template <uint8_t DATA_PIN> class NEOPIXEL {};

class CFastLED {
 public:
  template <ESPIChipsets CHIPSET, uint8_t DATA_PIN, uint8_t CLOCK_PIN, EOrder RGB_ORDER>
  static CLEDController &addLeds(CRGB *data, int nLedsOrOffset, int nLedsIfOffset = 0);
  template <ESPIChipsets CHIPSET, uint8_t DATA_PIN, uint8_t CLOCK_PIN>
  static CLEDController &addLeds(CRGB *data, int nLedsOrOffset, int nLedsIfOffset = 0);
  template <template <uint8_t DATA_PIN> class CHIPSET, uint8_t DATA_PIN>
  static CLEDController &addLeds(CRGB *data, int nLedsOrOffset, int nLedsIfOffset = 0);
  template <template <uint8_t DATA_PIN, EOrder RGB_ORDER> class CHIPSET, uint8_t DATA_PIN, EOrder RGB_ORDER>
  static CLEDController &addLeds(CRGB *data, int nLedsOrOffset, int nLedsIfOffset = 0);
  template <template <uint8_t DATA_PIN, EOrder RGB_ORDER> class CHIPSET, uint8_t DATA_PIN>
  static CLEDController &addLeds(CRGB *data, int nLedsOrOffset, int nLedsIfOffset = 0);
  void setBrightness(uint8_t scale);
  uint8_t getBrightness();
  void setMaxPowerInVoltsAndMilliamps(uint8_t volts, uint32_t milliamps);
  void setMaxPowerInMilliWatts(uint32_t milliwatts);
  void show(uint8_t scale);
  void show();
  void clear(bool writeData = false);
  void clearData();
  void showColor(const CRGB &color, uint8_t scale);
  void showColor(const CRGB &color);
  void setTemperature(const CRGB &temp);
  void setCorrection(const CRGB &correction);
  void setDither(uint8_t ditherMode = BINARY_DITHER);
  void setMaxRefreshRate(uint16_t refresh, bool constrain = false);
  void delay(unsigned long ms);
  void countFPS(int nFrames = 25);
  uint16_t getFPS();
  int count();
  int size();
  CRGB *leds();
};
extern CFastLED FastLED;

// funções de cor
void fill_solid(CRGB *leds, int numToFill, const CRGB &color);
void fill_solid(CHSV *targetArray, int numToFill, const CHSV &hsvColor);
void fill_rainbow(CRGB *targetArray, int numToFill, uint8_t initialhue, uint8_t deltahue = 5);
void fill_rainbow_circular(CRGB *targetArray, int numToFill, uint8_t initialhue, bool reversed = false);
void fill_gradient_RGB(CRGB *leds, uint16_t numLeds, const CRGB &c1, const CRGB &c2);
void fill_gradient_RGB(CRGB *leds, uint16_t numLeds, const CRGB &c1, const CRGB &c2, const CRGB &c3);
void fill_gradient_RGB(CRGB *leds, uint16_t numLeds, const CRGB &c1, const CRGB &c2, const CRGB &c3, const CRGB &c4);
void fill_gradient_RGB(CRGB *leds, uint16_t startpos, CRGB startcolor, uint16_t endpos, CRGB endcolor);
void fill_palette(CRGB *L, uint16_t N, uint8_t startIndex, uint8_t incIndex, const CRGBPalette16 &pal, uint8_t brightness = 255, TBlendType blendType = LINEARBLEND);
void fadeToBlackBy(CRGB *leds, uint16_t num_leds, uint8_t fadeBy);
void fade_raw(CRGB *leds, uint16_t num_leds, uint8_t fadeBy);
void fadeLightBy(CRGB *leds, uint16_t num_leds, uint8_t fadeBy);
void fade_video(CRGB *leds, uint16_t num_leds, uint8_t fadeBy);
void nscale8(CRGB *leds, uint16_t num_leds, uint8_t scale);
void nscale8_video(CRGB *leds, uint16_t num_leds, uint8_t scale);
void blur1d(CRGB *leds, uint16_t numLeds, fract8 blur_amount);
CRGB ColorFromPalette(const CRGBPalette16 &pal, uint8_t index, uint8_t brightness = 255, TBlendType blendType = LINEARBLEND);
CRGB ColorFromPalette(const TProgmemRGBPalette16 &pal, uint8_t index, uint8_t brightness = 255, TBlendType blendType = LINEARBLEND);
CRGB HeatColor(uint8_t temperature);
CRGB blend(const CRGB &p1, const CRGB &p2, fract8 amountOfP2);
CRGB &nblend(CRGB &existing, const CRGB &overlay, fract8 amountOfOverlay);
void hsv2rgb_rainbow(const CHSV &hsv, CRGB &rgb);
void hsv2rgb_spectrum(const CHSV &hsv, CRGB &rgb);
void hsv2rgb_raw(const CHSV &hsv, CRGB &rgb);

// lib8tion
uint8_t scale8(uint8_t i, fract8 scale);
uint8_t scale8_video(uint8_t i, fract8 scale);
uint8_t qadd8(uint8_t i, uint8_t j);
uint8_t qsub8(uint8_t i, uint8_t j);
uint8_t qmul8(uint8_t i, uint8_t j);
uint8_t abs8(int8_t i);
uint8_t avg8(uint8_t i, uint8_t j);
uint8_t sin8(uint8_t theta);
uint8_t cos8(uint8_t theta);
int16_t sin16(uint16_t theta);
int16_t cos16(uint16_t theta);
uint8_t triwave8(uint8_t in);
uint8_t quadwave8(uint8_t in);
uint8_t cubicwave8(uint8_t in);
uint8_t ease8InOutQuad(uint8_t i);
uint8_t ease8InOutCubic(fract8 i);
uint8_t lerp8by8(uint8_t a, uint8_t b, fract8 frac);
uint16_t lerp16by16(uint16_t a, uint16_t b, fract16 frac);
uint8_t map8(uint8_t in, uint8_t rangeStart, uint8_t rangeEnd);
uint8_t blend8(uint8_t a, uint8_t b, uint8_t amountOfB);
uint8_t dim8_raw(uint8_t x);
uint8_t dim8_video(uint8_t x);
uint8_t brighten8_raw(uint8_t x);
uint16_t sqrt16(uint16_t x);
uint8_t random8();
uint8_t random8(uint8_t lim);
uint8_t random8(uint8_t min, uint8_t lim);
uint16_t random16();
uint16_t random16(uint16_t lim);
uint16_t random16(uint16_t min, uint16_t lim);
void random16_add_entropy(uint16_t entropy);
void random16_set_seed(uint16_t seed);
uint16_t random16_get_seed();
uint8_t beat8(accum88 beats_per_minute, uint32_t timebase = 0);
uint16_t beat16(accum88 beats_per_minute, uint32_t timebase = 0);
uint8_t beatsin8(accum88 beats_per_minute, uint8_t lowest = 0, uint8_t highest = 255, uint32_t timebase = 0, uint8_t phase_offset = 0);
uint16_t beatsin16(accum88 beats_per_minute, uint16_t lowest = 0, uint16_t highest = 65535, uint32_t timebase = 0, uint16_t phase_offset = 0);
uint16_t beatsin88(accum88 beats_per_minute_88, uint16_t lowest = 0, uint16_t highest = 65535, uint32_t timebase = 0, uint16_t phase_offset = 0);
uint8_t inoise8(uint16_t x, uint16_t y, uint16_t z);
uint8_t inoise8(uint16_t x, uint16_t y);
uint8_t inoise8(uint16_t x);
uint16_t inoise16(uint32_t x, uint32_t y, uint32_t z);
uint16_t inoise16(uint32_t x, uint32_t y);
uint16_t inoise16(uint32_t x);

// EVERY_N_MILLISECONDS(n) { … }
bool __everyN(int id, uint32_t ms);
#define EVERY_N_MILLISECONDS(N) if (__everyN(__COUNTER__, (N)))
#define EVERY_N_MILLIS(N) EVERY_N_MILLISECONDS(N)
#define EVERY_N_SECONDS(N) if (__everyN(__COUNTER__, (N) * 1000UL))
#define EVERY_N_MINUTES(N) if (__everyN(__COUNTER__, (N) * 60000UL))
