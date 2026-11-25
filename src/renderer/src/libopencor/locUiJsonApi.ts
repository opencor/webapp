import * as common from '../common/common';
import * as dependencies from '../common/dependencies';

import { IssueType, type Issue } from './locLoggerApi';

export interface UiJson {
  input: UiJsonInput[];
  output: UiJsonOutput;
  parameters: UiJsonParameter[];
}

export type UiJsonInput = UiJsonDiscreteInput | UiJsonScalarInput;

export interface UiJsonDiscreteInput {
  defaultValue: number;
  id: string;
  name: string;
  possibleValues: UiJsonDiscreteInputPossibleValue[];
  visible?: string;
}

export interface UiJsonDiscreteInputPossibleValue {
  name: string;
  value: number;
}

export interface UiJsonScalarInput {
  defaultValue: number;
  id: string;
  maximumValue: number;
  minimumValue: number;
  name: string;
  stepValue?: number;
  visible?: string;
}

export interface UiJsonOutput {
  data: UiJsonOutputData[];
  externalData?: UiJsonOutputExternalData[];
  plots: UiJsonOutputPlot[];
}

export interface UiJsonOutputData {
  id: string;
  name: string;
}

export interface UiJsonOutputExternalData {
  data: UiJsonOutputData[];
  dataSeries: UiJsonOutputExternalDataSeries[];
  description?: string;
  voiExpression?: string;
  voiValues: Float64Array;
}

export interface UiJsonOutputExternalDataSeries {
  name: string;
  values: Float64Array;
}

export interface UiJsonOutputPlot {
  xAxisTitle?: string;
  xValue: string;
  yAxisTitle?: string;
  yValue: string;
  name?: string;
  additionalTraces?: UiJsonOutputPlotAdditionalTrace[];
}

export interface UiJsonOutputPlotAdditionalTrace {
  xValue: string;
  yValue: string;
  name?: string;
}

export interface UiJsonParameter {
  name: string;
  value: string;
}

export const isScalarInput = (input: UiJsonInput): input is UiJsonScalarInput => {
  return 'maximumValue' in input && 'minimumValue' in input;
};

export const isDiscreteInput = (input: UiJsonInput): input is UiJsonDiscreteInput => {
  return 'possibleValues' in input;
};

// The path of a value in a UI JSON, i.e. the keys (of objects) and indices (of arrays) that lead to it from the root of
// the UI JSON (e.g., ['input', 0, 'name'] for the name of the first input).

export type UiJsonPath = (string | number)[];

export const uiJsonPathKey = (path: UiJsonPath): string => {
  return path.join('/');
};

// An issue with a UI JSON, along with the paths of the values that it is about, if any (e.g., so that the fields that
// correspond to those values can be shown as invalid, see SimulationExperimentInteractiveViewSettingsDialog.vue).

export interface UiJsonIssue extends Issue {
  paths: UiJsonPath[];
}

const uiJsonIssue = (description: string, ...paths: UiJsonPath[]): UiJsonIssue => {
  return {
    type: IssueType.WARNING,
    description: `UI JSON: ${description}`,
    paths
  };
};

export const uiJsonReplacer = (_key: string, value: unknown): unknown => {
  return value instanceof Float64Array ? Array.from(value) : value;
};

// A helper function to return a version of the given UI JSON that has the structure that the rest of our code relies
// on, i.e. that can be safely accessed. Anything that doesn't have that structure (e.g., a missing output or a plot
// that is not an object) is replaced with an empty equivalent (or removed) while everything else is kept as is, so that
// it can still be used (e.g., in our settings dialog).
// Note: whether a UI JSON is valid is determined by validateUiJson(), which should therefore be given the original UI
//       JSON so that all of its issues get reported.

export interface UiJsonWithExpectedStructure {
  uiJson: UiJson;
  repaired: boolean;
}

export const uiJsonWithExpectedStructure = (value: unknown): UiJsonWithExpectedStructure => {
  let repaired = false;

  const object = (value: unknown): Record<string, unknown> => {
    if (common.isObject(value)) {
      return value;
    }

    repaired = true;

    return {};
  };

  const objects = (value: unknown): Record<string, unknown>[] => {
    if (!Array.isArray(value)) {
      repaired = true;

      return [];
    }

    const res = value.filter(common.isObject);

    if (res.length !== value.length) {
      repaired = true;
    }

    return res;
  };

  const uiJson = object(value);
  const output = object(uiJson.output);
  const res: Record<string, unknown> = {
    ...uiJson,
    input: objects(uiJson.input).map((input) => {
      return input.possibleValues === undefined ? input : { ...input, possibleValues: objects(input.possibleValues) };
    }),
    output: {
      ...output,
      data: objects(output.data),
      plots: objects(output.plots).map((plot) => {
        return plot.additionalTraces === undefined
          ? plot
          : { ...plot, additionalTraces: objects(plot.additionalTraces) };
      }),
      ...(output.externalData === undefined
        ? {}
        : {
            externalData: objects(output.externalData).map((externalData) => {
              return {
                ...externalData,
                data: objects(externalData.data),
                dataSeries: objects(externalData.dataSeries)
              };
            })
          })
    },
    parameters: objects(uiJson.parameters)
  };

  return {
    uiJson: res as unknown as UiJson,
    repaired
  };
};

// Some helper functions to convert values to/from a Float64Array.
// Note: we only convert arrays (to a Float64Array) and Float64Arrays (from a Float64Array), leaving other values as
//       they are so that validateUiJson() can report them as they are. This also means that we never call
//       new Float64Array(n), which would create an array of n zeros and therefore could result in a huge allocation if
//       n was some (invalid) large number.

const toFloat64Array = (values: unknown): unknown => {
  // Note: new Float64Array(values) would silently convert some non-numeric values to valid numbers (e.g., null, false,
  //       "", and [] to 0, true to 1, "3" to 3, and [5] to 5), so we convert any non-numeric value to NaN ourselves,
  //       so that validateUiJson() reports it (see fromFloat64ArrayForSchemaValidation()).

  if (!Array.isArray(values)) {
    return values;
  }

  const res = new Float64Array(values.length);

  for (let i = 0; i < values.length; ++i) {
    const value: unknown = values[i];

    res[i] = typeof value === 'number' ? value : Number.NaN;
  }

  return res;
};

const fromFloat64ArrayForSchemaValidation = (values: unknown): unknown => {
  // Note: for schema validation purposes, we only need an array that has the same "emptiness" as the given values and
  //       that contains numbers. This means that we don't have to convert (and then validate) all the values, which
  //       would be costly for large external data. Indeed, the actual length of the values and whether they are all
  //       (finite) numbers are checked separately (see validateUiJson() and nonNumericValuesIssues()), the latter so
  //       that values that are not numbers (e.g., NaN for a non-numeric value, see toFloat64Array()) get reported once
  //       per array rather than once per value (there could be thousands of them, e.g., missing values in some CSV
  //       data).

  if (!(values instanceof Float64Array) && !Array.isArray(values)) {
    return values;
  }

  return values.length ? [0] : [];
};

// A helper function to map the external data of a UI JSON, if it has any.
// Note: the UI JSON may not have the expected structure, in which case we only map what can be mapped.

const mapExternalData = (
  uiJson: UiJson,
  mapValues: (values: unknown) => unknown,
  inPlace: boolean
): UiJson | undefined => {
  const output: unknown = (uiJson as unknown as Record<string, unknown>).output;

  if (!common.isObject(output) || !Array.isArray(output.externalData) || !output.externalData.length) {
    return undefined;
  }

  const externalData = output.externalData.map((externalDataItem: unknown) => {
    if (!common.isObject(externalDataItem)) {
      return externalDataItem;
    }

    const res = inPlace ? externalDataItem : { ...externalDataItem };

    res.voiValues = mapValues(externalDataItem.voiValues);

    if (Array.isArray(externalDataItem.dataSeries)) {
      res.dataSeries = externalDataItem.dataSeries.map((dataSeries: unknown) => {
        if (!common.isObject(dataSeries)) {
          return dataSeries;
        }

        const dataSeriesRes = inPlace ? dataSeries : { ...dataSeries };

        dataSeriesRes.values = mapValues(dataSeries.values);

        return dataSeriesRes;
      });
    }

    return res;
  });

  if (inPlace) {
    output.externalData = externalData;

    return uiJson;
  }

  return { ...uiJson, output: { ...output, externalData } } as unknown as UiJson;
};

export const normaliseUiJson = (uiJson: UiJson): UiJson => {
  mapExternalData(uiJson, toFloat64Array, true);

  return uiJson;
};

const uiJsonForSchemaValidation = (uiJson: UiJson): unknown => {
  return mapExternalData(uiJson, fromFloat64ArrayForSchemaValidation, false) ?? uiJson;
};

// A helper function to report the external data values of a UI JSON that are not (finite) numbers, with one issue per
// array of values (see fromFloat64ArrayForSchemaValidation()).
// Note: the UI JSON may not have the expected structure, in which case we only check what can be checked (the rest gets
//       reported by our schema validation).

const MAX_REPORTED_NON_NUMERIC_VALUE_INDICES = 5;

const nonNumericValuesIssues = (uiJson: UiJson): UiJsonIssue[] => {
  const res: UiJsonIssue[] = [];

  const check = (values: unknown, what: string, path: UiJsonPath): void => {
    if (!(values instanceof Float64Array) && !Array.isArray(values)) {
      return;
    }

    const indices: number[] = [];
    let count = 0;

    for (let i = 0; i < values.length; ++i) {
      const value: unknown = values[i];

      if (typeof value !== 'number' || !Number.isFinite(value)) {
        if (indices.length < MAX_REPORTED_NON_NUMERIC_VALUE_INDICES) {
          indices.push(i);
        }

        ++count;
      }
    }

    if (!count) {
      return;
    }

    const otherCount = count - indices.length;
    const where =
      count === 1
        ? `the value at index ${indices[0]} is not`
        : `${count} values are not, at indices ${indices.join(', ')}${otherCount ? `, and ${otherCount} more` : ''}`;

    res.push(uiJsonIssue(`${what} must only contain numbers (${where}).`, path));
  };

  const output: unknown = (uiJson as unknown as Record<string, unknown>).output;

  if (!common.isObject(output) || !Array.isArray(output.externalData)) {
    return res;
  }

  for (const [externalDataIndex, externalDataItem] of output.externalData.entries()) {
    if (!common.isObject(externalDataItem)) {
      continue;
    }

    const externalDataPath = ['output', 'externalData', externalDataIndex];

    check(externalDataItem.voiValues, 'an output external data VOI values', [...externalDataPath, 'voiValues']);

    if (Array.isArray(externalDataItem.dataSeries)) {
      for (const [dataSeriesIndex, dataSeries] of externalDataItem.dataSeries.entries()) {
        if (common.isObject(dataSeries)) {
          check(
            dataSeries.values,
            typeof dataSeries.name === 'string' && dataSeries.name
              ? `an output external data series values ('${dataSeries.name}')`
              : 'an output external data series values',
            [...externalDataPath, 'dataSeries', dataSeriesIndex, 'values']
          );
        }
      }
    }
  }

  return res;
};

// A helper function to deep clone a UI JSON (or some settings containing a UI JSON).
// Note #1: Float64Arrays (i.e. external data values) are shared rather than copied since they are never modified in
//          place (they are only ever replaced), which avoids copying potentially large external data.
// Note #2: we use Object.fromEntries() rather than assign each key since a UI JSON may contain a "__proto__" key, which
//          would otherwise set the prototype of our copy rather than be copied (and the contents of that key would then
//          look like properties of our copy), see also cleanUiJson().

export const cloneUiJson = <T>(value: T): T => {
  if (value instanceof Float64Array) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(cloneUiJson) as T;
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, keyValue]) => {
        return [key, cloneUiJson(keyValue)];
      })
    ) as T;
  }

  return value;
};

export const cleanUiJson = (uiJson: UiJson): UiJson => {
  const cleanUiJsonRec = (value: unknown): unknown => {
    if (value === undefined || value === null || (typeof value === 'string' && value === '')) {
      return undefined;
    }

    if (value instanceof Float64Array) {
      return value;
    }

    // Note: unlike an optional value, an array element is never "not provided", so we keep an element that would
    //       otherwise be cleaned away (i.e. null, undefined, or an empty string) so that it gets reported by our schema
    //       validation. Indeed, an array element is always expected to be an object (or a number in the case of
    //       external data values), and the rest of our code relies on it.

    if (Array.isArray(value)) {
      return (value as unknown[]).map((item) => {
        const cleanedItem = cleanUiJsonRec(item);

        return cleanedItem === undefined ? item : cleanedItem;
      });
    }

    // Note: we use Object.fromEntries() for the same reason as in cloneUiJson().

    if (typeof value === 'object') {
      return Object.fromEntries(
        Object.entries(value as Record<string, unknown>)
          .map(([k, v]) => {
            return [k, cleanUiJsonRec(v)];
          })
          .filter(([, cleaned]) => {
            return cleaned !== undefined;
          })
      );
    }

    return value;
  };

  return cleanUiJsonRec(uiJson) as UiJson;
};

// A schema validation error (as reported by jsonschema), of which we only use what we need.

interface SchemaValidationError {
  path: UiJsonPath;
  name: string;
  argument: unknown;
  toString: () => string;
}

interface ValidateUiJsonOptions {
  allModelParameters?: string[];
  editableModelParameters?: string[];
}

const listOfItems = (items: Set<string>): string => {
  if (items.size === 0) {
    return '';
  }

  const list = [...items].map((item) => `'${item}'`);

  if (list.length === 1) {
    return list[0] as string;
  }

  if (list.length === 2) {
    return `${list[0]} or ${list[1]}`;
  }

  return `${list.slice(0, -1).join(', ')}, or ${list[list.length - 1]}`;
};

export const validateUiJson = (uiJson: UiJson | undefined, options?: ValidateUiJsonOptions): UiJsonIssue[] => {
  // Make sure that we have some UI JSON.

  if (!uiJson) {
    return [uiJsonIssue('no UI JSON was provided.')];
  }

  // Clean our UI JSON (in case there were optional values that were not provided and are now empty).

  uiJson = cleanUiJson(uiJson);

  // Check the UI JSON against our schema.

  const validator = new dependencies._jsonSchema.Validator();
  const schema: Record<string, unknown> = {
    additionalProperties: false,
    properties: {
      input: {
        items: {
          oneOf: [
            {
              additionalProperties: false,
              properties: {
                defaultValue: {
                  required: true,
                  type: 'number'
                },
                id: {
                  required: true,
                  type: 'string'
                },
                name: {
                  required: true,
                  type: 'string'
                },
                possibleValues: {
                  items: {
                    additionalProperties: false,
                    properties: {
                      name: {
                        required: true,
                        type: 'string'
                      },
                      value: {
                        required: true,
                        type: 'number'
                      }
                    },
                    type: 'object'
                  },
                  minItems: 1,
                  required: true,
                  type: 'array'
                },
                visible: {
                  type: 'string'
                }
              }
            },
            {
              additionalProperties: false,
              properties: {
                defaultValue: {
                  required: true,
                  type: 'number'
                },
                id: {
                  required: true,
                  type: 'string'
                },
                maximumValue: {
                  required: true,
                  type: 'number'
                },
                minimumValue: {
                  required: true,
                  type: 'number'
                },
                name: {
                  required: true,
                  type: 'string'
                },
                stepValue: {
                  type: 'number'
                },
                visible: {
                  type: 'string'
                }
              }
            }
          ],
          type: 'object'
        },
        minItems: 1,
        required: true,
        type: 'array'
      },
      output: {
        additionalProperties: false,
        minItems: 1,
        properties: {
          data: {
            items: {
              additionalProperties: false,
              properties: {
                id: {
                  required: true,
                  type: 'string'
                },
                name: {
                  required: true,
                  type: 'string'
                }
              },
              type: 'object'
            },
            minItems: 1,
            required: true,
            type: 'array'
          },
          externalData: {
            items: {
              additionalProperties: false,
              properties: {
                data: {
                  items: {
                    additionalProperties: false,
                    properties: {
                      id: {
                        required: true,
                        type: 'string'
                      },
                      name: {
                        required: true,
                        type: 'string'
                      }
                    },
                    type: 'object'
                  },
                  required: true,
                  type: 'array'
                },
                dataSeries: {
                  items: {
                    additionalProperties: false,
                    properties: {
                      name: {
                        required: true,
                        type: 'string'
                      },
                      values: {
                        items: {
                          required: true,
                          type: 'number'
                        },
                        minItems: 1,
                        required: true,
                        type: 'array'
                      }
                    },
                    type: 'object'
                  },
                  minItems: 1,
                  required: true,
                  type: 'array'
                },
                description: {
                  type: 'string'
                },
                voiExpression: {
                  type: 'string'
                },
                voiValues: {
                  items: {
                    required: true,
                    type: 'number'
                  },
                  minItems: 1,
                  required: true,
                  type: 'array'
                }
              },
              type: 'object'
            },
            type: 'array'
          },
          plots: {
            items: {
              additionalProperties: false,
              properties: {
                xAxisTitle: {
                  type: 'string'
                },
                xValue: {
                  required: true,
                  type: 'string'
                },
                yAxisTitle: {
                  type: 'string'
                },
                yValue: {
                  required: true,
                  type: 'string'
                },
                name: {
                  type: 'string'
                },
                additionalTraces: {
                  items: {
                    additionalProperties: false,
                    properties: {
                      xValue: {
                        required: true,
                        type: 'string'
                      },
                      yValue: {
                        required: true,
                        type: 'string'
                      },
                      name: {
                        type: 'string'
                      }
                    },
                    type: 'object'
                  },
                  type: 'array'
                }
              },
              type: 'object'
            },
            minItems: 1,
            required: true,
            type: 'array'
          }
        },
        required: true,
        type: 'object'
      },
      parameters: {
        items: {
          additionalProperties: false,
          properties: {
            name: {
              required: true,
              type: 'string'
            },
            value: {
              required: true,
              type: 'string'
            }
          },
          type: 'object'
        },
        minItems: 1,
        required: true,
        type: 'array'
      }
    },
    type: 'object'
  };

  const validatorRes = validator.validate(uiJsonForSchemaValidation(uiJson), schema, {
    nestedErrors: true
  });

  // Note: external data values that are not numbers are not reported by our schema validation (see
  //       fromFloat64ArrayForSchemaValidation()), but they are just as invalid, so we report them alongside.

  const nonNumericIssues = nonNumericValuesIssues(uiJson);

  if (!validatorRes.valid || nonNumericIssues.length) {
    const res: UiJsonIssue[] = [];

    // Note #1: an error is about the value at its path, except if it is about a required property of that value that
    //          is missing, in which case it is about that property.
    // Note #2: an error about an additional property (i.e. a property that is not allowed) is about the value that has
    //          that property rather than about that property. Indeed, such a property is not part of a valid UI JSON,
    //          except for an input, which can be either a discrete input or a scalar input (see our schema), in which
    //          case we get errors for both kinds of inputs, e.g., a scalar input with an issue (e.g., a missing name)
    //          also has errors about its minimum and maximum values not being allowed in a discrete input, but they
    //          are not what is wrong with it.
    // Note #3: we number our errors, like jsonschema does when converting its result to a string.

    validatorRes.errors.forEach((error: SchemaValidationError, index: number) => {
      const path: UiJsonPath = [...error.path];

      if (error.name === 'required' && typeof error.argument === 'string') {
        path.push(error.argument);
      }

      res.push(uiJsonIssue(common.formatMessage(`${index}: ${error.toString()}`), path));
    });

    res.push(...nonNumericIssues);

    return res;
  }

  const allModelParametersSet = new Set(options?.allModelParameters ?? []);
  const editableModelParametersSet = new Set(options?.editableModelParameters ?? []);

  // Make sure that the input information makes sense.

  const res: UiJsonIssue[] = [];
  const inputIdUsed = new Set<string>();

  for (const [inputIndex, input] of uiJson.input.entries()) {
    const inputPath = (...keys: UiJsonPath): UiJsonPath => ['input', inputIndex, ...keys];

    if (input.id) {
      if (inputIdUsed.has(input.id)) {
        res.push(uiJsonIssue(`an input id must be unique ('${input.id}' is used more than once).`, inputPath('id')));
      }

      inputIdUsed.add(input.id);
    } else {
      res.push(uiJsonIssue(`an input id must not be empty.`, inputPath('id')));
    }

    if (!input.name) {
      res.push(uiJsonIssue(`an input name must not be empty.`, inputPath('name')));
    }

    if ('possibleValues' in input) {
      for (const [possibleValueIndex, possibleValue] of input.possibleValues.entries()) {
        if (!possibleValue.name) {
          res.push(
            uiJsonIssue(
              `an input possible value name must not be empty.`,
              inputPath('possibleValues', possibleValueIndex, 'name')
            )
          );
        }
      }

      const possibleValues = input.possibleValues.map((possibleValue) => {
        return possibleValue.value;
      });
      const listOfPossibleValues = listOfItems(new Set(possibleValues.map((possibleValue) => String(possibleValue))));
      const usedPossibleValues = new Set<number>();

      for (const [possibleValueIndex, possibleValue] of possibleValues.entries()) {
        if (usedPossibleValues.has(possibleValue)) {
          res.push(
            uiJsonIssue(
              `an input possible value must have a unique value ('${possibleValue}' is used more than once).`,
              inputPath('possibleValues', possibleValueIndex, 'value')
            )
          );
        }

        usedPossibleValues.add(possibleValue);
      }

      if (!possibleValues.includes(input.defaultValue)) {
        res.push(
          uiJsonIssue(
            `an input default value must be one of the possible values ('${input.defaultValue}' is not one of ${listOfPossibleValues}).`,
            inputPath('defaultValue')
          )
        );
      }
    }

    if (isScalarInput(input)) {
      if (input.minimumValue >= input.maximumValue) {
        res.push(
          uiJsonIssue(
            `an input minimum value must be lower than the maximum value (${input.minimumValue} is not lower than ${input.maximumValue}).`,
            inputPath('minimumValue'),
            inputPath('maximumValue')
          )
        );
      }

      if (input.defaultValue < input.minimumValue || input.defaultValue > input.maximumValue) {
        res.push(
          uiJsonIssue(
            `an input default value must be greater or equal than the minimum value and lower or equal than the maximum value (${input.defaultValue} is not between ${input.minimumValue} and ${input.maximumValue}).`,
            inputPath('defaultValue')
          )
        );
      }

      const range = input.maximumValue - input.minimumValue;

      if (input.stepValue !== undefined && input.stepValue !== null) {
        if (input.stepValue <= 0 || input.stepValue > range) {
          res.push(
            uiJsonIssue(
              `an input step value must be greater than zero and lower or equal than the range value (${input.stepValue} is not between 0 and ${range}).`,
              inputPath('stepValue')
            )
          );
        }

        if (!common.isDivisible(range, input.stepValue)) {
          res.push(
            uiJsonIssue(
              `an input step value must be a factor of the range value (${input.stepValue} is not a factor of ${range}).`,
              inputPath('stepValue')
            )
          );
        }
      } else if (!common.isDivisible(range, 1)) {
        // Note: there is no step value, so we consider that the issue is about the step value that should be given.

        res.push(
          uiJsonIssue(
            `an input step value must be a factor of the range value (1 is not a factor of ${range}).`,
            inputPath('stepValue')
          )
        );
      }
    }

    if (input.visible !== undefined && input.visible !== null && !input.visible) {
      res.push(uiJsonIssue(`an input visible must not be empty.`, inputPath('visible')));
    }
  }

  // Make sure that the output information makes sense.

  const outputIdUsed = new Set<string>();
  const listOfAllModelParameters = listOfItems(allModelParametersSet);

  for (const [outputDataIndex, outputData] of uiJson.output.data.entries()) {
    const outputDataPath = (key: string): UiJsonPath => ['output', 'data', outputDataIndex, key];

    if (!outputData.id) {
      res.push(uiJsonIssue(`an output data id must not be empty.`, outputDataPath('id')));
    }

    if (outputIdUsed.has(outputData.id)) {
      res.push(
        uiJsonIssue(
          `an output data id must be unique ('${outputData.id}' is used more than once).`,
          outputDataPath('id')
        )
      );
    }

    outputIdUsed.add(outputData.id);

    if (!outputData.name) {
      res.push(uiJsonIssue(`an output data name must not be empty.`, outputDataPath('name')));
    } else if (allModelParametersSet.size > 0 && !allModelParametersSet.has(outputData.name)) {
      res.push(
        uiJsonIssue(
          `an output data name must match one of the available options ('${outputData.name}' is not one of ${listOfAllModelParameters}).`,
          outputDataPath('name')
        )
      );
    }
  }

  if (uiJson.output.externalData !== undefined && uiJson.output.externalData !== null) {
    for (const [outputExternalDataIndex, outputExternalData] of uiJson.output.externalData.entries()) {
      const outputExternalDataPath = (...keys: UiJsonPath): UiJsonPath => [
        'output',
        'externalData',
        outputExternalDataIndex,
        ...keys
      ];

      if (outputExternalData.voiExpression) {
        try {
          dependencies._mathJs.parse(outputExternalData.voiExpression);
        } catch (error: unknown) {
          res.push(
            uiJsonIssue(
              `an output external data VOI expression must be valid ('${outputExternalData.voiExpression}' is not: ${common.formatMessage(common.formatError(error), false)}).`,
              outputExternalDataPath('voiExpression')
            )
          );
        }
      }

      if (!outputExternalData.voiValues.length) {
        res.push(
          uiJsonIssue('an output external data VOI values must not be empty.', outputExternalDataPath('voiValues'))
        );
      }

      const outputExternalDataSeriesNames = new Set<string>();

      for (const [outputExternalDataSeriesIndex, outputExternalDataSeries] of outputExternalData.dataSeries.entries()) {
        const outputExternalDataSeriesPath = (key: string): UiJsonPath =>
          outputExternalDataPath('dataSeries', outputExternalDataSeriesIndex, key);

        if (outputExternalDataSeriesNames.has(outputExternalDataSeries.name)) {
          res.push(
            uiJsonIssue(
              `an output external data series name must be unique ('${outputExternalDataSeries.name}' is used more than once).`,
              outputExternalDataSeriesPath('name')
            )
          );
        }

        outputExternalDataSeriesNames.add(outputExternalDataSeries.name);

        if (!outputExternalDataSeries.name) {
          res.push(
            uiJsonIssue(`an output external data series name must not be empty.`, outputExternalDataSeriesPath('name'))
          );
        }

        if (!outputExternalDataSeries.values.length) {
          res.push(
            uiJsonIssue(
              'an output external data series values must not be empty.',
              outputExternalDataSeriesPath('values')
            )
          );
        }

        if (outputExternalDataSeries.values.length !== outputExternalData.voiValues.length) {
          res.push(
            uiJsonIssue(
              `an output external data series values length must match the output external data VOI values length (${outputExternalDataSeries.values.length} is not equal to ${outputExternalData.voiValues.length}).`,
              outputExternalDataSeriesPath('values')
            )
          );
        }
      }

      const outputExternalDataIds = new Set<string>();
      const listOfOutputExternalDataSeriesNames = listOfItems(outputExternalDataSeriesNames);

      for (const [outputExternalDataEntryIndex, outputExternalDataEntry] of outputExternalData.data.entries()) {
        const outputExternalDataEntryPath = (key: string): UiJsonPath =>
          outputExternalDataPath('data', outputExternalDataEntryIndex, key);

        if (!outputExternalDataEntry.id) {
          res.push(uiJsonIssue(`an output external data id must not be empty.`, outputExternalDataEntryPath('id')));
        }

        if (outputExternalDataIds.has(outputExternalDataEntry.id)) {
          res.push(
            uiJsonIssue(
              `an output external data id must be unique ('${outputExternalDataEntry.id}' is used more than once).`,
              outputExternalDataEntryPath('id')
            )
          );
        }

        outputExternalDataIds.add(outputExternalDataEntry.id);

        if (outputExternalDataEntry.id && outputIdUsed.has(outputExternalDataEntry.id)) {
          res.push(
            uiJsonIssue(
              `an output external data id must be unique across simulation and external data ('${outputExternalDataEntry.id}' is used more than once).`,
              outputExternalDataEntryPath('id')
            )
          );
        }

        if (outputExternalDataEntry.id) {
          outputIdUsed.add(outputExternalDataEntry.id);
        }

        if (!outputExternalDataEntry.name) {
          res.push(uiJsonIssue(`an output external data name must not be empty.`, outputExternalDataEntryPath('name')));
        }

        if (!outputExternalDataSeriesNames.has(outputExternalDataEntry.name)) {
          res.push(
            uiJsonIssue(
              `an output external data name must match one of the available options ('${outputExternalDataEntry.name}' is not one of ${listOfOutputExternalDataSeriesNames}).`,
              outputExternalDataEntryPath('name')
            )
          );
        }
      }

      if (!outputExternalData.dataSeries.length) {
        res.push(
          uiJsonIssue('an output external data series entries must not be empty.', outputExternalDataPath('dataSeries'))
        );
      }
    }
  }

  for (const [outputPlotIndex, outputPlot] of uiJson.output.plots.entries()) {
    const checkTraceValue = (
      value: string,
      axisLabel: 'X value' | 'Y value',
      trace: string,
      path: UiJsonPath
    ): void => {
      if (!value) {
        res.push(uiJsonIssue(`an output plot ${trace}${axisLabel} must not be empty.`, path));

        return;
      }

      try {
        dependencies._mathJs.parse(value);
      } catch (error: unknown) {
        res.push(
          uiJsonIssue(
            `an output plot ${axisLabel} must be valid ('${value}' is not: ${common.formatMessage(common.formatError(error), false)}).`,
            path
          )
        );
      }
    };
    const outputPlotPath: UiJsonPath = ['output', 'plots', outputPlotIndex];

    checkTraceValue(outputPlot.xValue, 'X value', '', [...outputPlotPath, 'xValue']);
    checkTraceValue(outputPlot.yValue, 'Y value', '', [...outputPlotPath, 'yValue']);

    if (outputPlot.additionalTraces !== undefined && outputPlot.additionalTraces !== null) {
      for (const [additionalTraceIndex, additionalTrace] of outputPlot.additionalTraces.entries()) {
        const additionalTracePath: UiJsonPath = [...outputPlotPath, 'additionalTraces', additionalTraceIndex];

        checkTraceValue(additionalTrace.xValue, 'X value', 'additional trace ', [...additionalTracePath, 'xValue']);
        checkTraceValue(additionalTrace.yValue, 'Y value', 'additional trace ', [...additionalTracePath, 'yValue']);
      }
    }
  }

  // Make sure that the parameters information makes sense.

  const listOfEditableModelParameters = listOfItems(editableModelParametersSet);

  for (const [parameterIndex, parameter] of uiJson.parameters.entries()) {
    const parameterPath = (key: string): UiJsonPath => ['parameters', parameterIndex, key];

    if (!parameter.name) {
      res.push(uiJsonIssue(`a parameter name must not be empty.`, parameterPath('name')));
    } else if (editableModelParametersSet.size > 0 && !editableModelParametersSet.has(parameter.name)) {
      res.push(
        uiJsonIssue(
          `a parameter name must match one of the available options ('${parameter.name}' is not one of ${listOfEditableModelParameters}).`,
          parameterPath('name')
        )
      );
    }

    if (!parameter.value) {
      res.push(uiJsonIssue(`a parameter value must not be empty.`, parameterPath('value')));
    } else {
      try {
        dependencies._mathJs.parse(parameter.value);
      } catch (error: unknown) {
        res.push(
          uiJsonIssue(
            `a parameter value must be valid ('${parameter.value}' is not: ${common.formatMessage(common.formatError(error), false)}).`,
            parameterPath('value')
          )
        );
      }
    }
  }

  return res;
};
