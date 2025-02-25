#include "file.h"
#include "version.h"

Napi::Object init(Napi::Env pEnv, Napi::Object pExports)
{
    // Note: this must be in sync with src/preload/index.ts.

    // File API.

    pExports.Set(Napi::String::New(pEnv, "fileCreate"), Napi::Function::New(pEnv, fileCreate));

    // Version API.

    pExports.Set(Napi::String::New(pEnv, "version"), Napi::Function::New(pEnv, version));

    return pExports;
}

NODE_API_MODULE(libOpenCOR, init)
