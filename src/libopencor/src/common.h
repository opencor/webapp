#pragma once

#include <libopencor>

#include <napi.h>

struct FileData
{
    libOpenCOR::SedDocumentPtr sedDocument;
};

extern libOpenCOR::FileManager fileManager;
extern std::map<libOpenCOR::FilePtr, FileData> fileData;

libOpenCOR::FilePtr pathToFile(const Napi::Value &pPath);
libOpenCOR::SedDocumentPtr pathToSedDocument(const Napi::Value &pPath);

void untrackFileData(libOpenCOR::FilePtr pFile);

napi_value issues(const Napi::CallbackInfo &pInfo, libOpenCOR::IssuePtrs pIssues);
