#include "common.h"
#include "sed.h"

#include <libopencor>

// SedDocument API.

void sedDocumentCreate(const Napi::CallbackInfo &pInfo)
{
    auto file = pathToFile(pInfo[0]);
    auto sedDocument = libOpenCOR::SedDocument::create(file);

    fileData[file].sedDocument = sedDocument;
}

napi_value sedDocumentIssues(const Napi::CallbackInfo &pInfo)
{
    return issues(pInfo, pathToSedDocument(pInfo[0])->issues());
}

napi_value sedDocumentSimulationCount(const Napi::CallbackInfo &pInfo)
{
    return Napi::Number::New(pInfo.Env(), pathToSedDocument(pInfo[0])->simulationCount());
}
