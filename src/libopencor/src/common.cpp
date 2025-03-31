#include "common.h"

libOpenCOR::FileManager fileManager = libOpenCOR::FileManager::instance();
std::map<libOpenCOR::FilePtr, FileData> fileData;

libOpenCOR::FilePtr pathToFile(const Napi::Value &pPath)
{
    return fileManager.file(pPath.ToString().Utf8Value());
}

libOpenCOR::SedDocumentPtr pathToSedDocument(const Napi::Value &pPath)
{
    return fileData[pathToFile(pPath)].sedDocument;
}

void untrackFileData(libOpenCOR::FilePtr pFile)
{
    fileData.erase(pFile);
}

napi_value issues(const Napi::CallbackInfo &pInfo, libOpenCOR::IssuePtrs pIssues)
{
    auto env = pInfo.Env();
    auto res = Napi::Array::New(env);

    for (const auto &issue : pIssues) {
        auto object = Napi::Object::New(env);

        object.Set("type", Napi::Number::New(env, static_cast<int>(issue->type())));
        object.Set("description", Napi::String::New(env, issue->description()));

        res.Set(res.Length(), object);
    }

    return res;
}
