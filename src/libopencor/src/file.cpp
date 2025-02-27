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
    auto file = libOpenCOR::File::create(pInfo[0].ToString().Utf8Value());

    // Keep track of the file so that it doesn't get garbage collected.

    files.push_back(file);
}
