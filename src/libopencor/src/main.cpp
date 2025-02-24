#include "version.h"

Napi::Object init(Napi::Env pEnv, Napi::Object pExports)
{
    pExports.Set(Napi::String::New(pEnv, "version"), Napi::Function::New(pEnv, version));

    return pExports;
}

NODE_API_MODULE(libOpenCOR, init)
