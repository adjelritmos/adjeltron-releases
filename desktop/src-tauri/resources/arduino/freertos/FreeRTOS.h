// FreeRTOS (subconjunto) do ESP32 — só para VERIFICAR o sketch; o simulador implementa
// tarefas cooperativas, filas, semáforos e mutexes (backend/sim/rtos.js).
#pragma once
#include <stdint.h>
#ifndef ESP32
#error "FreeRTOS (xTaskCreate, filas, semáforos) só está disponível no simulador com a placa ESP32 DevKit"
#endif
typedef void *TaskHandle_t;
typedef void *QueueHandle_t;
typedef void *SemaphoreHandle_t;
typedef void *TimerHandle_t;
typedef int BaseType_t;
typedef unsigned int UBaseType_t;
typedef uint32_t TickType_t;
typedef void (*TaskFunction_t)(void *);
typedef struct {
  uint32_t owner;
  uint32_t count;
} portMUX_TYPE;
#define portMUX_INITIALIZER_UNLOCKED {0, 0}

#define pdTRUE 1
#define pdFALSE 0
#define pdPASS 1
#define pdFAIL 0
#define errQUEUE_FULL 0
#define portMAX_DELAY ((TickType_t)0xffffffffUL)
#define portTICK_PERIOD_MS ((TickType_t)1)
#define portTICK_RATE_MS ((TickType_t)1)
#define configTICK_RATE_HZ 1000
#define configMAX_PRIORITIES 25
#define tskIDLE_PRIORITY 0
#define tskNO_AFFINITY 0x7FFFFFFF
#define ARDUINO_RUNNING_CORE 1
#define CONFIG_ARDUINO_RUNNING_CORE 1
#define pdMS_TO_TICKS(ms) ((TickType_t)(ms))
#define pdTICKS_TO_MS(t) ((uint32_t)(t))

// tarefas
BaseType_t xTaskCreate(TaskFunction_t fn, const char *name, uint32_t stackDepth, void *param, UBaseType_t prio, TaskHandle_t *handle);
BaseType_t xTaskCreatePinnedToCore(TaskFunction_t fn, const char *name, uint32_t stackDepth, void *param, UBaseType_t prio, TaskHandle_t *handle, BaseType_t core);
void vTaskDelay(const TickType_t ticks);
void vTaskDelayUntil(TickType_t *previousWake, const TickType_t period);
BaseType_t xTaskDelayUntil(TickType_t *previousWake, const TickType_t period);
void vTaskDelete(TaskHandle_t task);
void vTaskSuspend(TaskHandle_t task);
void vTaskResume(TaskHandle_t task);
TickType_t xTaskGetTickCount(void);
TickType_t xTaskGetTickCountFromISR(void);
BaseType_t xPortGetCoreID(void);
TaskHandle_t xTaskGetCurrentTaskHandle(void);
char *pcTaskGetName(TaskHandle_t task);
char *pcTaskGetTaskName(TaskHandle_t task);
UBaseType_t uxTaskGetStackHighWaterMark(TaskHandle_t task);
UBaseType_t uxTaskPriorityGet(TaskHandle_t task);
void vTaskPrioritySet(TaskHandle_t task, UBaseType_t prio);
UBaseType_t uxTaskGetNumberOfTasks(void);
void taskYIELD(void);
void portENTER_CRITICAL(portMUX_TYPE *mux);
void portEXIT_CRITICAL(portMUX_TYPE *mux);
void portENTER_CRITICAL_ISR(portMUX_TYPE *mux);
void portEXIT_CRITICAL_ISR(portMUX_TYPE *mux);
void portYIELD_FROM_ISR(BaseType_t woken = 0);

// filas
QueueHandle_t xQueueCreate(UBaseType_t length, UBaseType_t itemSize);
BaseType_t xQueueSend(QueueHandle_t q, const void *item, TickType_t wait);
BaseType_t xQueueSendToBack(QueueHandle_t q, const void *item, TickType_t wait);
BaseType_t xQueueSendToFront(QueueHandle_t q, const void *item, TickType_t wait);
BaseType_t xQueueSendFromISR(QueueHandle_t q, const void *item, BaseType_t *woken);
BaseType_t xQueueOverwrite(QueueHandle_t q, const void *item);
BaseType_t xQueueReceive(QueueHandle_t q, void *buffer, TickType_t wait);
BaseType_t xQueuePeek(QueueHandle_t q, void *buffer, TickType_t wait);
BaseType_t xQueueReceiveFromISR(QueueHandle_t q, void *buffer, BaseType_t *woken);
UBaseType_t uxQueueMessagesWaiting(QueueHandle_t q);
UBaseType_t uxQueueSpacesAvailable(QueueHandle_t q);
BaseType_t xQueueReset(QueueHandle_t q);
void vQueueDelete(QueueHandle_t q);

// semáforos e mutexes
SemaphoreHandle_t xSemaphoreCreateMutex(void);
SemaphoreHandle_t xSemaphoreCreateRecursiveMutex(void);
SemaphoreHandle_t xSemaphoreCreateBinary(void);
SemaphoreHandle_t xSemaphoreCreateCounting(UBaseType_t max, UBaseType_t initial);
BaseType_t xSemaphoreTake(SemaphoreHandle_t s, TickType_t wait);
BaseType_t xSemaphoreTakeRecursive(SemaphoreHandle_t s, TickType_t wait);
BaseType_t xSemaphoreGive(SemaphoreHandle_t s);
BaseType_t xSemaphoreGiveRecursive(SemaphoreHandle_t s);
BaseType_t xSemaphoreGiveFromISR(SemaphoreHandle_t s, BaseType_t *woken);
BaseType_t xSemaphoreTakeFromISR(SemaphoreHandle_t s, BaseType_t *woken);
UBaseType_t uxSemaphoreGetCount(SemaphoreHandle_t s);
void vSemaphoreDelete(SemaphoreHandle_t s);
