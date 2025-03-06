#include "file.h"

#include <libopencor>

static std::vector<libOpenCOR::FilePtr> files;

napi_value fileContents(const Napi::CallbackInfo &pInfo)
{
    auto fileManager = libOpenCOR::FileManager::instance();
    auto file = fileManager.file(pInfo[0].ToString().Utf8Value());
    auto res = file->contents();

    return Napi::Buffer<unsigned char>::Copy(pInfo.Env(), res.data(), res.size());
}

void fileCreate(const Napi::CallbackInfo &pInfo)
{
    auto contents = (pInfo[1].Type() == napi_object) ? pInfo[1].As<Napi::Buffer<unsigned char>>() : Napi::Buffer<unsigned char>();
    auto file = libOpenCOR::File::create(pInfo[0].ToString().Utf8Value(), contents.IsEmpty());

    if (!contents.IsEmpty()) {
        file->setContents(std::vector<unsigned char>(contents.Data(), contents.Data() + contents.Length()));
    }

    // Keep track of the file so that it doesn't get garbage collected.

    files.push_back(file);
}
