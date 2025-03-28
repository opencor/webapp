#include "common.h"

libOpenCOR::FileManager fileManager = libOpenCOR::FileManager::instance();
std::vector<libOpenCOR::FilePtr> trackedFiles;
std::map<libOpenCOR::FilePtr, libOpenCOR::SedDocumentPtr> trackedSedDocuments;

libOpenCOR::FilePtr pathToFile(const Napi::Value &pPath)
{
    return fileManager.file(pPath.ToString().Utf8Value());
}

libOpenCOR::SedDocumentPtr pathToSedDocument(const Napi::Value &pPath)
{
    return trackedSedDocuments[pathToFile(pPath)];
}

void untrackFile(libOpenCOR::FilePtr pFile)
{
    trackedFiles.erase(std::remove(trackedFiles.begin(), trackedFiles.end(), pFile), trackedFiles.end());
}

void untrackSedDocument(libOpenCOR::FilePtr pFile)
{
    trackedSedDocuments.erase(pFile);
}

napi_value issues(const Napi::CallbackInfo &pInfo, libOpenCOR::IssuePtrs pIssues)
{
    auto env = pInfo.Env();
    auto res = Napi::Array::New(env);

    for (const auto &issue : pIssues) {
        auto object = Napi::Object::New(env);

        object.Set("type", Napi::Number::New(env, static_cast<int>(issue->type())));
        object.Set("typeAsString", Napi::String::New(env, issue->typeAsString()));
        object.Set("description", Napi::String::New(env, issue->description()));

        res.Set(res.Length(), object);
    }

    return res;
}
