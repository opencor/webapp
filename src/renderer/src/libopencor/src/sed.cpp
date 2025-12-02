#include "common.h"
#include "sed.h"

#include <libopencor>

// SedDocument API.

napi_value sedDocumentCreate(const Napi::CallbackInfo &pInfo)
{
    static size_t documentId {std::numeric_limits<std::size_t>::max()};

    auto id = ++documentId;
    auto file = toFile(pInfo[0]);
    auto sedDocument = libOpenCOR::SedDocument::create(file);

    sedDocuments[id] = sedDocument;

    return Napi::Number::New(pInfo.Env(), static_cast<double>(id));
}

napi_value sedDocumentInstantiate(const Napi::CallbackInfo &pInfo)
{
    static size_t instanceId {std::numeric_limits<std::size_t>::max()};

    auto id = ++instanceId;
    auto sedDocument = toSedDocument(toSizeT(pInfo[0]));
    auto sedInstance = sedDocument->instantiate();

    sedInstances[id] = sedInstance;

    return Napi::Number::New(pInfo.Env(), static_cast<double>(id));
}

napi_value sedDocumentIssues(const Napi::CallbackInfo &pInfo)
{
    return issues(pInfo, toSedDocument(toSizeT(pInfo[0]))->issues());
}

napi_value sedDocumentModelCount(const Napi::CallbackInfo &pInfo)
{
    return Napi::Number::New(pInfo.Env(), toSedDocument(toSizeT(pInfo[0]))->modelCount());
}

void sedDocumentModelAddChange(const Napi::CallbackInfo &pInfo)
{
    auto sedDocument = toSedDocument(toSizeT(pInfo[0]));
    auto model = sedDocument->model(toInt32(pInfo[1]));
    auto changeAttribute = libOpenCOR::SedChangeAttribute::create(toString(pInfo[2]),
                                                                  toString(pInfo[3]),
                                                                  toString(pInfo[4]));

    model->addChange(changeAttribute);
}

void sedDocumentModelRemoveAllChanges(const Napi::CallbackInfo &pInfo)
{
    auto sedDocument = toSedDocument(toSizeT(pInfo[0]));
    auto model = sedDocument->model(toInt32(pInfo[1]));

    model->removeAllChanges();
}

napi_value sedDocumentSimulationCount(const Napi::CallbackInfo &pInfo)
{
    return Napi::Number::New(pInfo.Env(), toSedDocument(toSizeT(pInfo[0]))->simulationCount());
}

napi_value sedDocumentSimulationType(const Napi::CallbackInfo &pInfo)
{
    auto sedDocument = toSedDocument(toSizeT(pInfo[0]));
    auto simulation = sedDocument->simulation(toInt32(pInfo[1]));

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

napi_value sedDocumentSimulationOneStepStep(const Napi::CallbackInfo &pInfo)
{
    auto sedDocument = toSedDocument(toSizeT(pInfo[0]));
    auto simulation = sedDocument->simulation(toInt32(pInfo[1]));
    auto oneStep = std::dynamic_pointer_cast<libOpenCOR::SedOneStep>(simulation);

    return Napi::Number::New(pInfo.Env(), oneStep->step());
}

napi_value sedDocumentSimulationUniformTimeCourseInitialTime(const Napi::CallbackInfo &pInfo)
{
    auto sedDocument = toSedDocument(toSizeT(pInfo[0]));
    auto simulation = sedDocument->simulation(toInt32(pInfo[1]));
    auto uniformTimeCourse = std::dynamic_pointer_cast<libOpenCOR::SedUniformTimeCourse>(simulation);

    return Napi::Number::New(pInfo.Env(), uniformTimeCourse->initialTime());
}

napi_value sedDocumentSimulationUniformTimeCourseOutputStartTime(const Napi::CallbackInfo &pInfo)
{
    auto sedDocument = toSedDocument(toSizeT(pInfo[0]));
    auto simulation = sedDocument->simulation(toInt32(pInfo[1]));
    auto uniformTimeCourse = std::dynamic_pointer_cast<libOpenCOR::SedUniformTimeCourse>(simulation);

    return Napi::Number::New(pInfo.Env(), uniformTimeCourse->outputStartTime());
}

void sedDocumentSimulationUniformTimeCourseSetOutputStartTime(const Napi::CallbackInfo &pInfo)
{
    auto sedDocument = toSedDocument(toSizeT(pInfo[0]));
    auto simulation = sedDocument->simulation(toInt32(pInfo[1]));
    auto uniformTimeCourse = std::dynamic_pointer_cast<libOpenCOR::SedUniformTimeCourse>(simulation);

    uniformTimeCourse->setOutputStartTime(toDouble(pInfo[2]));
}

napi_value sedDocumentSimulationUniformTimeCourseOutputEndTime(const Napi::CallbackInfo &pInfo)
{
    auto sedDocument = toSedDocument(toSizeT(pInfo[0]));
    auto simulation = sedDocument->simulation(toInt32(pInfo[1]));
    auto uniformTimeCourse = std::dynamic_pointer_cast<libOpenCOR::SedUniformTimeCourse>(simulation);

    return Napi::Number::New(pInfo.Env(), uniformTimeCourse->outputEndTime());
}

void sedDocumentSimulationUniformTimeCourseSetOutputEndTime(const Napi::CallbackInfo &pInfo)
{
    auto sedDocument = toSedDocument(toSizeT(pInfo[0]));
    auto simulation = sedDocument->simulation(toInt32(pInfo[1]));
    auto uniformTimeCourse = std::dynamic_pointer_cast<libOpenCOR::SedUniformTimeCourse>(simulation);

    uniformTimeCourse->setOutputEndTime(toDouble(pInfo[2]));
}

napi_value sedDocumentSimulationUniformTimeCourseNumberOfSteps(const Napi::CallbackInfo &pInfo)
{
    auto sedDocument = toSedDocument(toSizeT(pInfo[0]));
    auto simulation = sedDocument->simulation(toInt32(pInfo[1]));
    auto uniformTimeCourse = std::dynamic_pointer_cast<libOpenCOR::SedUniformTimeCourse>(simulation);

    return Napi::Number::New(pInfo.Env(), uniformTimeCourse->numberOfSteps());
}

void sedDocumentSimulationUniformTimeCourseSetNumberOfSteps(const Napi::CallbackInfo &pInfo)
{
    auto sedDocument = toSedDocument(toSizeT(pInfo[0]));
    auto simulation = sedDocument->simulation(toInt32(pInfo[1]));
    auto uniformTimeCourse = std::dynamic_pointer_cast<libOpenCOR::SedUniformTimeCourse>(simulation);

    uniformTimeCourse->setNumberOfSteps(toInt32(pInfo[2]));
}

// SedInstance API.

napi_value sedInstanceHasIssues(const Napi::CallbackInfo &pInfo)
{
    auto sedInstance = toSedInstance(toSizeT(pInfo[0]));

    return Napi::Boolean::New(pInfo.Env(), sedInstance->hasIssues());
}

napi_value sedInstanceIssues(const Napi::CallbackInfo &pInfo)
{
    auto sedInstance = toSedInstance(toSizeT(pInfo[0]));

    return issues(pInfo, sedInstance->issues());
}

napi_value sedInstanceRun(const Napi::CallbackInfo &pInfo)
{
    auto sedInstance = toSedInstance(toSizeT(pInfo[0]));

    return Napi::Number::New(pInfo.Env(), sedInstance->run());
}

// SedInstanceTask API.

napi_value sedInstanceTaskVoiName(const Napi::CallbackInfo &pInfo)
{
    auto sedInstance = toSedInstance(toSizeT(pInfo[0]));
    auto task = sedInstance->task(toInt32(pInfo[1]));

    return Napi::String::New(pInfo.Env(), task->voiName());
}

napi_value sedInstanceTaskVoiUnit(const Napi::CallbackInfo &pInfo)
{
    auto sedInstance = toSedInstance(toSizeT(pInfo[0]));
    auto task = sedInstance->task(toInt32(pInfo[1]));

    return Napi::String::New(pInfo.Env(), task->voiUnit());
}

napi_value sedInstanceTaskVoi(const Napi::CallbackInfo &pInfo)
{
    auto sedInstance = toSedInstance(toSizeT(pInfo[0]));
    auto task = sedInstance->task(toInt32(pInfo[1]));

    return doublesToNapiArray(pInfo.Env(), task->voi());
}

napi_value sedInstanceTaskStateCount(const Napi::CallbackInfo &pInfo)
{
    auto sedInstance = toSedInstance(toSizeT(pInfo[0]));
    auto task = sedInstance->task(toInt32(pInfo[1]));

    return Napi::Number::New(pInfo.Env(), task->stateCount());
}

napi_value sedInstanceTaskStateName(const Napi::CallbackInfo &pInfo)
{
    auto sedInstance = toSedInstance(toSizeT(pInfo[0]));
    auto task = sedInstance->task(toInt32(pInfo[1]));

    return Napi::String::New(pInfo.Env(), task->stateName(toInt32(pInfo[2])));
}

napi_value sedInstanceTaskStateUnit(const Napi::CallbackInfo &pInfo)
{
    auto sedInstance = toSedInstance(toSizeT(pInfo[0]));
    auto task = sedInstance->task(toInt32(pInfo[1]));

    return Napi::String::New(pInfo.Env(), task->stateUnit(toInt32(pInfo[2])));
}

napi_value sedInstanceTaskState(const Napi::CallbackInfo &pInfo)
{
    auto sedInstance = toSedInstance(toSizeT(pInfo[0]));
    auto task = sedInstance->task(toInt32(pInfo[1]));

    return doublesToNapiArray(pInfo.Env(), task->state(toInt32(pInfo[2])));
}

napi_value sedInstanceTaskRateCount(const Napi::CallbackInfo &pInfo)
{
    auto sedInstance = toSedInstance(toSizeT(pInfo[0]));
    auto task = sedInstance->task(toInt32(pInfo[1]));

    return Napi::Number::New(pInfo.Env(), task->rateCount());
}

napi_value sedInstanceTaskRateName(const Napi::CallbackInfo &pInfo)
{
    auto sedInstance = toSedInstance(toSizeT(pInfo[0]));
    auto task = sedInstance->task(toInt32(pInfo[1]));

    return Napi::String::New(pInfo.Env(), task->rateName(toInt32(pInfo[2])));
}

napi_value sedInstanceTaskRateUnit(const Napi::CallbackInfo &pInfo)
{
    auto sedInstance = toSedInstance(toSizeT(pInfo[0]));
    auto task = sedInstance->task(toInt32(pInfo[1]));

    return Napi::String::New(pInfo.Env(), task->rateUnit(toInt32(pInfo[2])));
}

napi_value sedInstanceTaskRate(const Napi::CallbackInfo &pInfo)
{
    auto sedInstance = toSedInstance(toSizeT(pInfo[0]));
    auto task = sedInstance->task(toInt32(pInfo[1]));

    return doublesToNapiArray(pInfo.Env(), task->rate(toInt32(pInfo[2])));
}

napi_value sedInstanceTaskConstantCount(const Napi::CallbackInfo &pInfo)
{
    auto sedInstance = toSedInstance(toSizeT(pInfo[0]));
    auto task = sedInstance->task(toInt32(pInfo[1]));

    return Napi::Number::New(pInfo.Env(), task->constantCount());
}

napi_value sedInstanceTaskConstantName(const Napi::CallbackInfo &pInfo)
{
    auto sedInstance = toSedInstance(toSizeT(pInfo[0]));
    auto task = sedInstance->task(toInt32(pInfo[1]));

    return Napi::String::New(pInfo.Env(), task->constantName(toInt32(pInfo[2])));
}

napi_value sedInstanceTaskConstantUnit(const Napi::CallbackInfo &pInfo)
{
    auto sedInstance = toSedInstance(toSizeT(pInfo[0]));
    auto task = sedInstance->task(toInt32(pInfo[1]));

    return Napi::String::New(pInfo.Env(), task->constantUnit(toInt32(pInfo[2])));
}

napi_value sedInstanceTaskConstant(const Napi::CallbackInfo &pInfo)
{
    auto sedInstance = toSedInstance(toSizeT(pInfo[0]));
    auto task = sedInstance->task(toInt32(pInfo[1]));

    return doublesToNapiArray(pInfo.Env(), task->constant(toInt32(pInfo[2])));
}

napi_value sedInstanceTaskComputedConstantCount(const Napi::CallbackInfo &pInfo)
{
    auto sedInstance = toSedInstance(toSizeT(pInfo[0]));
    auto task = sedInstance->task(toInt32(pInfo[1]));

    return Napi::Number::New(pInfo.Env(), task->computedConstantCount());
}

napi_value sedInstanceTaskComputedConstantName(const Napi::CallbackInfo &pInfo)
{
    auto sedInstance = toSedInstance(toSizeT(pInfo[0]));
    auto task = sedInstance->task(toInt32(pInfo[1]));

    return Napi::String::New(pInfo.Env(), task->computedConstantName(toInt32(pInfo[2])));
}

napi_value sedInstanceTaskComputedConstantUnit(const Napi::CallbackInfo &pInfo)
{
    auto sedInstance = toSedInstance(toSizeT(pInfo[0]));
    auto task = sedInstance->task(toInt32(pInfo[1]));

    return Napi::String::New(pInfo.Env(), task->computedConstantUnit(toInt32(pInfo[2])));
}

napi_value sedInstanceTaskComputedConstant(const Napi::CallbackInfo &pInfo)
{
    auto sedInstance = toSedInstance(toSizeT(pInfo[0]));
    auto task = sedInstance->task(toInt32(pInfo[1]));

    return doublesToNapiArray(pInfo.Env(), task->computedConstant(toInt32(pInfo[2])));
}

napi_value sedInstanceTaskAlgebraicCount(const Napi::CallbackInfo &pInfo)
{
    auto sedInstance = toSedInstance(toSizeT(pInfo[0]));
    auto task = sedInstance->task(toInt32(pInfo[1]));

    return Napi::Number::New(pInfo.Env(), task->algebraicCount());
}

napi_value sedInstanceTaskAlgebraicName(const Napi::CallbackInfo &pInfo)
{
    auto sedInstance = toSedInstance(toSizeT(pInfo[0]));
    auto task = sedInstance->task(toInt32(pInfo[1]));

    return Napi::String::New(pInfo.Env(), task->algebraicName(toInt32(pInfo[2])));
}

napi_value sedInstanceTaskAlgebraicUnit(const Napi::CallbackInfo &pInfo)
{
    auto sedInstance = toSedInstance(toSizeT(pInfo[0]));
    auto task = sedInstance->task(toInt32(pInfo[1]));

    return Napi::String::New(pInfo.Env(), task->algebraicUnit(toInt32(pInfo[2])));
}

napi_value sedInstanceTaskAlgebraic(const Napi::CallbackInfo &pInfo)
{
    auto sedInstance = toSedInstance(toSizeT(pInfo[0]));
    auto task = sedInstance->task(toInt32(pInfo[1]));

    return doublesToNapiArray(pInfo.Env(), task->algebraic(toInt32(pInfo[2])));
}
