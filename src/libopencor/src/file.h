#pragma once

#include <napi.h>

#include <libopencor>

class File: public Napi::ObjectWrap<File>
{
public:
    static void init(Napi::Env pEnv, Napi::Object pExports);

    explicit File(const Napi::CallbackInfo &pInfo);

private:
    libOpenCOR::FilePtr mFile;

    Napi::Value contents(const Napi::CallbackInfo &pInfo);
};
