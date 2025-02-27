#include "file.h"
#include "version.h"

Napi::Object init(Napi::Env pEnv, Napi::Object pExports)
{
    // Note: this must be in sync with src/preload/index.ts.

    // Some general methods.

    pExports.Set(Napi::String::New(pEnv, "version"), Napi::Function::New(pEnv, version));

    // File class.

    File::init(pEnv, pExports);

    return pExports;
}

NODE_API_MODULE(libOpenCOR, init)
