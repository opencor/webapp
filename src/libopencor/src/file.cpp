#include "file.h"

#include <libopencor>

static libOpenCOR::FileManager fileManager = libOpenCOR::FileManager::instance();
static std::vector<libOpenCOR::FilePtr> files;

libOpenCOR::FilePtr pathToFile(const Napi::Value &pPath)
{
    return fileManager.file(pPath.ToString().Utf8Value());
}

// FileManager API.

void fileManagerUnmanage(const Napi::CallbackInfo &pInfo)
{
    auto files = fileManager.files();
    auto path = pInfo[0].ToString().Utf8Value();

    for (auto file : files) {
        if (file->path() == path) {
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

    files.push_back(file);
}

napi_value fileIssues(const Napi::CallbackInfo &pInfo)
{
    auto env = pInfo.Env();
    auto res = Napi::Array::New(env);
    auto file = pathToFile(pInfo[0]);
    auto issues = file->issues();

    for (const auto &issue : issues) {
        auto object = Napi::Object::New(env);

        object.Set("type", Napi::Number::New(env, static_cast<int>(issue->type())));
        object.Set("typeAsString", Napi::String::New(env, issue->typeAsString()));
        object.Set("description", Napi::String::New(env, issue->description()));

        res.Set(res.Length(), object);
    }

    return res;
}

napi_value fileType(const Napi::CallbackInfo &pInfo)
{
    auto file = pathToFile(pInfo[0]);

    return Napi::Number::New(pInfo.Env(), static_cast<int>(file->type()));
}
