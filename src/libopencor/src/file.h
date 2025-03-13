#pragma once

#include <napi.h>

void fileManagerUnmanage(const Napi::CallbackInfo &pInfo);

napi_value fileContents(const Napi::CallbackInfo &pInfo);
void fileCreate(const Napi::CallbackInfo &pInfo);
