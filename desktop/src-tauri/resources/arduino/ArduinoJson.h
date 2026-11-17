#pragma once
// ArduinoJson (v6/v7) — declarações mínimas para a verificação do sketch.
#include "Arduino.h"
class Stream;
class JsonVariant;
class JsonObject;
class JsonArray;
class JsonString {
 public:
  const char *c_str() const;
  operator const char *() const;
  bool operator==(const char *s) const;
  size_t size() const;
};
class JsonVariant : public Printable {
 public:
  JsonVariant();
  template <typename T> T as() const;
  template <typename T> bool is() const;
  template <typename T> operator T() const;
  template <typename T> JsonVariant &operator=(const T &v);
  JsonVariant &operator=(const JsonVariant &v);
  template <typename T> T operator|(const T &def) const;
  const char *operator|(const char *def) const;
  template <typename T> bool operator==(const T &v) const;
  template <typename T> bool operator!=(const T &v) const;
  JsonVariant operator[](const char *key) const;
  JsonVariant operator[](const String &key) const;
  JsonVariant operator[](int index) const;
  template <typename T> bool set(const T &v);
  template <typename T> JsonVariant add(const T &v);
  template <typename T> T add();
  JsonVariant add();
  template <typename T> T to();
  JsonObject createNestedObject();
  JsonObject createNestedObject(const char *key);
  JsonArray createNestedArray();
  JsonArray createNestedArray(const char *key);
  bool isNull() const;
  size_t size() const;
  bool containsKey(const char *key) const;
  void remove(const char *key);
  void remove(int index);
  void clear();
  size_t printTo(Print &p) const;
};
class JsonPair {
 public:
  JsonString key() const;
  JsonVariant value() const;
};
class JsonObjectIterator {
 public:
  JsonPair operator*() const;
  JsonObjectIterator &operator++();
  bool operator!=(const JsonObjectIterator &o) const;
};
class JsonArrayIterator {
 public:
  JsonVariant operator*() const;
  JsonArrayIterator &operator++();
  bool operator!=(const JsonArrayIterator &o) const;
};
class JsonObject : public JsonVariant {
 public:
  JsonObject();
  JsonObject(const JsonVariant &v);
  JsonObjectIterator begin() const;
  JsonObjectIterator end() const;
  using JsonVariant::operator=;
};
class JsonArray : public JsonVariant {
 public:
  JsonArray();
  JsonArray(const JsonVariant &v);
  JsonArrayIterator begin() const;
  JsonArrayIterator end() const;
  using JsonVariant::operator=;
};
typedef JsonVariant JsonVariantConst;
typedef JsonObject JsonObjectConst;
typedef JsonArray JsonArrayConst;
class JsonDocument : public JsonVariant {
 public:
  JsonDocument();
  explicit JsonDocument(size_t capacity);
  size_t capacity() const;
  size_t memoryUsage() const;
  bool overflowed() const;
  void shrinkToFit();
  bool garbageCollect();
  using JsonVariant::operator=;
};
template <size_t N> class StaticJsonDocument : public JsonDocument {
 public:
  using JsonDocument::operator=;
};
class DynamicJsonDocument : public JsonDocument {
 public:
  explicit DynamicJsonDocument(size_t capacity);
  using JsonDocument::operator=;
};
class DeserializationError {
 public:
  enum Code { Ok, EmptyInput, IncompleteInput, InvalidInput, NoMemory, TooDeep };
  DeserializationError(Code c = Ok);
  explicit operator bool() const;
  bool operator==(Code c) const;
  bool operator!=(Code c) const;
  Code code() const;
  const char *c_str() const;
  const char *f_str() const;
};
DeserializationError deserializeJson(JsonDocument &doc, const char *input);
DeserializationError deserializeJson(JsonDocument &doc, const char *input, size_t len);
DeserializationError deserializeJson(JsonDocument &doc, char *input);
DeserializationError deserializeJson(JsonDocument &doc, char *input, size_t len);
DeserializationError deserializeJson(JsonDocument &doc, const uint8_t *input, size_t len);
DeserializationError deserializeJson(JsonDocument &doc, uint8_t *input, size_t len);
DeserializationError deserializeJson(JsonDocument &doc, const String &input);
DeserializationError deserializeJson(JsonDocument &doc, Stream &input);
size_t serializeJson(const JsonVariant &doc, Print &out);
size_t serializeJson(const JsonVariant &doc, String &out);
size_t serializeJson(const JsonVariant &doc, char *out, size_t size);
template <size_t N> size_t serializeJson(const JsonVariant &doc, char (&out)[N]);
size_t serializeJsonPretty(const JsonVariant &doc, Print &out);
size_t serializeJsonPretty(const JsonVariant &doc, String &out);
size_t serializeJsonPretty(const JsonVariant &doc, char *out, size_t size);
size_t measureJson(const JsonVariant &doc);
size_t measureJsonPretty(const JsonVariant &doc);
