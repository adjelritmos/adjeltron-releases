// SerialCommand.h / OttoSerialCommand.h — comandos de texto pela porta série (a app do Otto por
// Bluetooth envia "M 1 1000", "H", …): escritos de raiz para o adjeltron, com a API da
// SerialCommand de Steven Cogswell usada pelos firmwares do Otto/Zowi.
//   SerialCommand SCmd;            // lê do Serial (ou SerialCommand SCmd(bt) com outra porta série)
//   SCmd.addCommand("M", receiveMovement);
//   SCmd.addDefaultHandler(unknown);          // ou setDefaultHandler(f(const char *comando))
//   loop: SCmd.readSerial();   no comando: char *arg = SCmd.next();  (NULL quando acabam)

function serialCommand(cls) {
  return `#pragma once
#include <Arduino.h>
#include <string.h>

#ifndef SERIALCOMMANDBUFFER
#define SERIALCOMMANDBUFFER 35
#endif
#ifndef MAXSERIALCOMMANDS
#define MAXSERIALCOMMANDS 16
#endif
#define SERIALCOMMAND_NAME 12
#define SERIALCOMMAND_TOKENS 8

typedef void (*${cls}Handler)();
typedef void (*${cls}NamedHandler)(const char *);

class ${cls} {
 public:
  ${cls}() { _setup(); }
  ${cls}(Stream &port) {
    _setup();
    _port = &port;
  }
  void addCommand(const char *command, ${cls}Handler fn) {
    if (_count >= MAXSERIALCOMMANDS) return;
    strncpy(_names[_count], command, SERIALCOMMAND_NAME - 1);
    _names[_count][SERIALCOMMAND_NAME - 1] = 0;
    _fns[_count] = fn;
    _count++;
  }
  // para comandos desconhecidos (sem argumentos, como no Otto)
  void addDefaultHandler(${cls}Handler fn) { _default = fn; }
  // variante que recebe o nome do comando
  void setDefaultHandler(${cls}NamedHandler fn) { _defaultNamed = fn; }
  // carácter que termina um comando (por omissão '\\r'; '\\n' também termina)
  void setTerminator(char term) { _term = term; }
  void clearBuffer() {
    for (int i = 0; i < SERIALCOMMANDBUFFER; i++) _buffer[i] = 0;
    _len = 0;
  }
  // lê o que chegou; com um comando completo, chama a função registada
  void readSerial() {
    while (_available() > 0) {
      char c = (char)_read();
      if (c == _term || c == '\\n' || c == '\\r') {
        if (_len > 0) _dispatch();
        clearBuffer();
      } else if (c >= ' ' && _len < SERIALCOMMANDBUFFER - 1) {
        _buffer[_len] = c;
        _len++;
        _buffer[_len] = 0;
      }
    }
  }
  // argumento seguinte do comando atual (NULL no fim)
  char *next() {
    while (_pos < _len && _isDelim(_buffer[_pos])) _pos++;
    if (_pos >= _len) return NULL;
    int k = _tok;
    _tok = (_tok + 1) % SERIALCOMMAND_TOKENS;
    int n = 0;
    while (_pos < _len && !_isDelim(_buffer[_pos]) && n < SERIALCOMMANDBUFFER - 1) {
      _tokens[k][n] = _buffer[_pos];
      n++;
      _pos++;
    }
    _tokens[k][n] = 0;
    return _tokens[k];
  }

 private:
  void _setup() {
    _port = NULL;
    _count = 0;
    _default = NULL;
    _defaultNamed = NULL;
    _term = '\\r';
    _pos = 0;
    _tok = 0;
    clearBuffer();
  }
  bool _isDelim(char c) { return c == ' ' || c == ','; }
  int _available() { return _port ? _port->available() : Serial.available(); }
  int _read() { return _port ? _port->read() : Serial.read(); }
  void _dispatch() {
    _pos = 0;
    char *command = next();
    if (command == NULL) return;
    for (int i = 0; i < _count; i++) {
      if (strcmp(_names[i], command) == 0) {
        _fns[i]();
        return;
      }
    }
    if (_defaultNamed) _defaultNamed(command);
    else if (_default) _default();
  }
  Stream *_port;
  char _buffer[SERIALCOMMANDBUFFER];
  int _len;
  int _pos;
  char _term;
  char _names[MAXSERIALCOMMANDS][SERIALCOMMAND_NAME];
  ${cls}Handler _fns[MAXSERIALCOMMANDS];
  ${cls}Handler _default;
  ${cls}NamedHandler _defaultNamed;
  int _count;
  char _tokens[SERIALCOMMAND_TOKENS][SERIALCOMMANDBUFFER];
  int _tok;
};
`
}

export const SERIALCMD_FILES = { 'SerialCommand.h': serialCommand('SerialCommand'), 'OttoSerialCommand.h': serialCommand('OttoSerialCommand') }
