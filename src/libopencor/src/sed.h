#pragma once

#include <napi.h>

void sedDocumentCreate(const Napi::CallbackInfo &pInfo);
napi_value sedDocumentIssues(const Napi::CallbackInfo &pInfo);
napi_value sedDocumentSimulationCount(const Napi::CallbackInfo &pInfo);
