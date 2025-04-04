#include "file.h"
#include "sed.h"
#include "version.h"

Napi::Object init(Napi::Env pEnv, Napi::Object pExports)
{
    // Note: this must be in sync with src/preload/index.ts.

    // Some general methods.

    pExports.Set(Napi::String::New(pEnv, "version"), Napi::Function::New(pEnv, version));

    // FileManager API.

    pExports.Set(Napi::String::New(pEnv, "fileManagerUnmanage"), Napi::Function::New(pEnv, fileManagerUnmanage));

    // File API.

    pExports.Set(Napi::String::New(pEnv, "fileContents"), Napi::Function::New(pEnv, fileContents));
    pExports.Set(Napi::String::New(pEnv, "fileCreate"), Napi::Function::New(pEnv, fileCreate));
    pExports.Set(Napi::String::New(pEnv, "fileIssues"), Napi::Function::New(pEnv, fileIssues));
    pExports.Set(Napi::String::New(pEnv, "fileType"), Napi::Function::New(pEnv, fileType));

    // SED API.

    pExports.Set(Napi::String::New(pEnv, "sedDocumentCreate"), Napi::Function::New(pEnv, sedDocumentCreate));
    pExports.Set(Napi::String::New(pEnv, "sedDocumentIssues"), Napi::Function::New(pEnv, sedDocumentIssues));

    return pExports;
}

NODE_API_MODULE(libOpenCOR, init)
