#pragma once

#include <libopencor>

#include <napi.h>

extern libOpenCOR::FileManager fileManager;
extern std::vector<libOpenCOR::FilePtr> trackedFiles;
extern std::map<libOpenCOR::FilePtr, libOpenCOR::SedDocumentPtr> trackedSedDocuments;

libOpenCOR::FilePtr pathToFile(const Napi::Value &pPath);
libOpenCOR::SedDocumentPtr pathToSedDocument(const Napi::Value &pPath);

void untrackFile(libOpenCOR::FilePtr pFile);
void untrackSedDocument(libOpenCOR::FilePtr pFile);

napi_value issues(const Napi::CallbackInfo &pInfo, libOpenCOR::IssuePtrs pIssues);
