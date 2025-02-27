#pragma once

#include <napi.h>

napi_value fileContents(const Napi::CallbackInfo &pInfo);
void fileCreate(const Napi::CallbackInfo &pInfo);
