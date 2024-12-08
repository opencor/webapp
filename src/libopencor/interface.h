#include <napi.h>

namespace libOpenCOR::interface
{
    Napi::Object init(Napi::Env pEnv, Napi::Object pExports);

    NODE_API_MODULE(addon, init)
} // namespace libOpenCOR::interface
