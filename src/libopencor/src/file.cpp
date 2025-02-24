#include "file.h"

#include <libopencor>

void fileCreate(const Napi::CallbackInfo &pInfo)
{
    libOpenCOR::File::create(pInfo[0].ToString().Utf8Value());
}
