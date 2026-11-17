#pragma once
// Otto_mouths.h — bocas para a matriz de LEDs (putMouth): 6 colunas × 5 linhas em 30 bits
// (bit 29 = canto de cima à esquerda). putMouth(nome) usa a tabela; putMouth(valor, false) usa
// diretamente os 30 bits.
#include <Arduino.h>
#define zero 0
#define one 1
#define two 2
#define three 3
#define four 4
#define five 5
#define six 6
#define seven 7
#define eight 8
#define nine 9
#define smile 10
#define happyOpen 11
#define happyClosed 12
#define heart 13
#define bigSurprise 14
#define smallSurprise 15
#define tongueOut 16
#define vamp1 17
#define vamp2 18
#define lineMouth 19
#define confused 20
#define diagonal 21
#define sad 22
#define sadOpen 23
#define sadClosed 24
#define okMouth 25
#define xMouth 26
#define interrogation 27
#define thunder 28
#define culito 29
#define angry 30
#define OTTO_MOUTHS 31

static const unsigned long OttoMouthTable[31] PROGMEM = {
  0x0C49248CUL, // zero
  0x0430410EUL, // one
  0x0C48421EUL, // two
  0x1C08C09CUL, // three
  0x1249E082UL, // four
  0x1E41C09CUL, // five
  0x0C41C48CUL, // six
  0x1E084208UL, // seven
  0x0C48C48CUL, // eight
  0x0C48E08CUL, // nine
  0x00852300UL, // smile
  0x00FE148CUL, // happyOpen
  0x00FD2300UL, // happyClosed
  0x12FFF78CUL, // heart
  0x0C4A148CUL, // bigSurprise
  0x00312300UL, // smallSurprise
  0x3F249180UL, // tongueOut
  0x3FB52300UL, // vamp1
  0x3FCD2000UL, // vamp2
  0x0003F000UL, // lineMouth
  0x0046A100UL, // confused
  0x20606040UL, // diagonal
  0x00312840UL, // sad
  0x0C4A1FC0UL, // sadOpen
  0x00312FC0UL, // sadClosed
  0x00042A10UL, // okMouth
  0x2148C4A1UL, // xMouth
  0x1C884208UL, // interrogation
  0x0421E108UL, // thunder
  0x0086D480UL, // culito
  0x007A1840UL, // angry
};

#define OTTO_ANIMS 4
#define OTTO_ANIM_FRAMES 10
static const unsigned long OttoAnimTable[4][10] PROGMEM = {
  {0x00312300UL, 0x00189180UL, 0x000C40C0UL, 0x00189180UL, 0x00312300UL, 0x00624600UL, 0x00C08C00UL, 0x00624600UL, 0x00000000UL, 0x00000000UL}, // littleUuh
  {0x0003F000UL, 0x00312300UL, 0x0C4A148CUL, 0x00312300UL, 0x00000000UL, 0x00000000UL, 0x00000000UL, 0x00000000UL, 0x00000000UL, 0x00000000UL}, // dreamMouth
  {0x0000C000UL, 0x00312000UL, 0x007A1000UL, 0x0085E000UL, 0x0048C000UL, 0x0000C000UL, 0x00000000UL, 0x00000000UL, 0x00000000UL, 0x00000000UL}, // adivinawi
  {0x000E4600UL, 0x00189C00UL, 0x00312840UL, 0x006240C0UL, 0x00C09180UL, 0x00852300UL, 0x000E4600UL, 0x00189C00UL, 0x00312840UL, 0x006240C0UL}, // wave
};
static const byte OttoAnimLength[4] = {8, 4, 6, 10};

static unsigned long OttoMouthShape(int number) {
  if (number < 0 || number >= OTTO_MOUTHS) return 0;
  return pgm_read_dword(&OttoMouthTable[number]);
}
static unsigned long OttoAnimShape(int anim, int index) {
  if (anim < 0 || anim >= OTTO_ANIMS) return 0;
  return pgm_read_dword(&OttoAnimTable[anim][index % OttoAnimLength[anim]]);
}
