#pragma once

#include <libopencor>

#include <napi.h>

struct FileData
{
    libOpenCOR::SedDocumentPtr sedDocument;
};

extern libOpenCOR::FileManager fileManager;
extern std::map<libOpenCOR::FilePtr, FileData> fileData;

libOpenCOR::FilePtr valueToFile(const Napi::Value &pValue);
libOpenCOR::SedDocumentPtr valueToSedDocument(const Napi::Value &pValue);

void untrackFileData(libOpenCOR::FilePtr pFile);

napi_value issues(const Napi::CallbackInfo &pInfo, libOpenCOR::IssuePtrs pIssues);
