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

napi_value sedDocumentSimulationType(const Napi::CallbackInfo &pInfo)
{
    auto sedDocument = pathToSedDocument(pInfo[0]);
    auto simulation = sedDocument->simulation(pInfo[1].As<Napi::Number>().Int32Value());

    if (std::dynamic_pointer_cast<libOpenCOR::SedAnalysis>(simulation) != nullptr) {
        return Napi::Number::New(pInfo.Env(), 0);
    }

    if (std::dynamic_pointer_cast<libOpenCOR::SedSteadyState>(simulation) != nullptr) {
        return Napi::Number::New(pInfo.Env(), 1);
    }

    if (std::dynamic_pointer_cast<libOpenCOR::SedOneStep>(simulation) != nullptr) {
        return Napi::Number::New(pInfo.Env(), 2);
    }

    return Napi::Number::New(pInfo.Env(), 3); // libOpenCOR::SedUniformTimeCourse.
}
