#include "file.h"

void File::init(Napi::Env pEnv, Napi::Object pExports)
{
    auto func = DefineClass(pEnv, "File", {InstanceMethod("contents", &File::contents)});

    pExports.Set("File", func);
}

File::File(const Napi::CallbackInfo &pInfo)
    : Napi::ObjectWrap<File>(pInfo)
{
    mFile = libOpenCOR::File::create(pInfo[0].ToString().Utf8Value());
}

Napi::Value File::contents(const Napi::CallbackInfo &pInfo)
{
    auto res = mFile->contents();

    return Napi::Buffer<unsigned char>::Copy(pInfo.Env(), res.data(), res.size());
}
