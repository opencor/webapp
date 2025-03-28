#include "common.h"
#include "file.h"

#include <libopencor>

// FileManager API.

void fileManagerUnmanage(const Napi::CallbackInfo &pInfo)
{
    auto files = fileManager.files();
    auto path = pInfo[0].ToString().Utf8Value();

    for (auto file : files) {
        if (file->path() == path) {
            untrackFile(file);
            untrackSedDocument(file);

            fileManager.unmanage(file);

            break;
        }
    }
}

// File API.

napi_value fileContents(const Napi::CallbackInfo &pInfo)
{
    auto file = pathToFile(pInfo[0]);
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

    trackedFiles.push_back(file);
}

napi_value fileIssues(const Napi::CallbackInfo &pInfo)
{
    return issues(pInfo, pathToFile(pInfo[0])->issues());
}

napi_value fileType(const Napi::CallbackInfo &pInfo)
{
    auto file = pathToFile(pInfo[0]);

    return Napi::Number::New(pInfo.Env(), static_cast<int>(file->type()));
}
