#pragma once
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

typedef void (*SerialCommandHandler)();
typedef void (*SerialCommandNamedHandler)(const char *);

class SerialCommand {
 public:
  SerialCommand() { _setup(); }
  SerialCommand(Stream &port) {
    _setup();
    _port = &port;
  }
  void addCommand(const char *command, SerialCommandHandler fn) {
    if (_count >= MAXSERIALCOMMANDS) return;
    strncpy(_names[_count], command, SERIALCOMMAND_NAME - 1);
    _names[_count][SERIALCOMMAND_NAME - 1] = 0;
    _fns[_count] = fn;
    _count++;
  }
  // para comandos desconhecidos (sem argumentos, como no Otto)
  void addDefaultHandler(SerialCommandHandler fn) { _default = fn; }
  // variante que recebe o nome do comando
  void setDefaultHandler(SerialCommandNamedHandler fn) { _defaultNamed = fn; }
  // carácter que termina um comando (por omissão '\r'; '\n' também termina)
  void setTerminator(char term) { _term = term; }
  void clearBuffer() {
    for (int i = 0; i < SERIALCOMMANDBUFFER; i++) _buffer[i] = 0;
    _len = 0;
  }
  // lê o que chegou; com um comando completo, chama a função registada
  void readSerial() {
    while (_available() > 0) {
      char c = (char)_read();
      if (c == _term || c == '\n' || c == '\r') {
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
    _term = '\r';
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
  SerialCommandHandler _fns[MAXSERIALCOMMANDS];
  SerialCommandHandler _default;
  SerialCommandNamedHandler _defaultNamed;
  int _count;
  char _tokens[SERIALCOMMAND_TOKENS][SERIALCOMMANDBUFFER];
  int _tok;
};
