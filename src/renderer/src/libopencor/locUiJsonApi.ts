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
  //       "", and [] to 0, true to 1, "3" to 3, and [5] to 5), so we convert any non-numeric value to NaN ourselves, so
  //       that validateUiJson() reports it (see fromFloat64ArrayForSchemaValidation()).

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

    check(externalDataItem.voiValues, 'the VOI values of an external data file', [...externalDataPath, 'voiValues']);

    if (Array.isArray(externalDataItem.dataSeries)) {
      for (const [dataSeriesIndex, dataSeries] of externalDataItem.dataSeries.entries()) {
        if (common.isObject(dataSeries)) {
          check(
            dataSeries.values,
            typeof dataSeries.name === 'string' && dataSeries.name
              ? `the values of a data series ('${dataSeries.name}')`
              : 'the values of a data series',
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
  message: string;
  toString: () => string;
}

// The names of the values of a UI JSON, as used in our issues, indexed by the key of their path with their indices
// replaced with '*' (e.g., 'input/*/name' for the name of an input).
// Note: those names are those used in the settings of the Interactive view (see
//       SimulationExperimentInteractiveViewSettingsDialog.vue), so that our issues can be related to its fields (e.g.,
//       "simulation input" rather than "input", "simulation data" rather than "output data", "model parameter" rather
//       than "parameter", and "trace" rather than "plot" for the X/Y values and name of a plot).

const UI_JSON_VALUE_NAMES: Record<string, string> = {
  '': 'the UI JSON',
  input: 'the simulation inputs',
  'input/*': 'a simulation input',
  'input/*/id': 'a simulation input ID',
  'input/*/name': 'a simulation input name',
  'input/*/defaultValue': 'a simulation input default value',
  'input/*/visible': 'a simulation input visible condition',
  'input/*/minimumValue': 'a simulation input minimum value',
  'input/*/maximumValue': 'a simulation input maximum value',
  'input/*/stepValue': 'a simulation input step value',
  'input/*/possibleValues': 'the possible values of a simulation input',
  'input/*/possibleValues/*': 'a possible value',
  'input/*/possibleValues/*/name': 'a possible value name',
  'input/*/possibleValues/*/value': 'the value of a possible value',
  output: 'the output',
  'output/data': 'the simulation data',
  'output/data/*': 'a simulation data entry',
  'output/data/*/id': 'a simulation data ID',
  'output/data/*/name': 'a simulation data model parameter',
  'output/externalData': 'the external data',
  'output/externalData/*': 'an external data file',
  'output/externalData/*/description': 'an external data file description',
  'output/externalData/*/voiExpression': 'an external data file VOI expression',
  'output/externalData/*/voiValues': 'the VOI values of an external data file',
  'output/externalData/*/voiValues/*': 'a VOI value of an external data file',
  'output/externalData/*/dataSeries': 'the data series of an external data file',
  'output/externalData/*/dataSeries/*': 'a data series',
  'output/externalData/*/dataSeries/*/name': 'a data series name',
  'output/externalData/*/dataSeries/*/values': 'the values of a data series',
  'output/externalData/*/dataSeries/*/values/*': 'a value of a data series',
  'output/externalData/*/data': 'the external data of an external data file',
  'output/externalData/*/data/*': 'an external data entry',
  'output/externalData/*/data/*/id': 'an external data ID',
  'output/externalData/*/data/*/name': 'an external data series',
  'output/plots': 'the plots',
  'output/plots/*': 'a plot',
  'output/plots/*/xAxisTitle': 'a plot X axis title',
  'output/plots/*/yAxisTitle': 'a plot Y axis title',
  'output/plots/*/xValue': 'a trace X value',
  'output/plots/*/yValue': 'a trace Y value',
  'output/plots/*/name': 'a trace name',
  'output/plots/*/additionalTraces': 'the additional traces of a plot',
  'output/plots/*/additionalTraces/*': 'a trace',
  'output/plots/*/additionalTraces/*/xValue': 'a trace X value',
  'output/plots/*/additionalTraces/*/yValue': 'a trace Y value',
  'output/plots/*/additionalTraces/*/name': 'a trace name',
  parameters: 'the model parameters',
  'parameters/*': 'a model parameter',
  'parameters/*/name': 'a model parameter name',
  'parameters/*/value': 'a model parameter value'
};

const TYPE_NAMES: Record<string, string> = {
  array: 'an array',
  number: 'a number',
  object: 'an object',
  string: 'a string'
};

const uiJsonValueAt = (value: unknown, path: UiJsonPath): unknown => {
  // Return the value at the given path in the given value, if any.

  for (const key of path) {
    if (!value || typeof value !== 'object') {
      return undefined;
    }

    value = (value as Record<string | number, unknown>)[key];
  }

  return value;
};

const schemaErrorDescription = (error: SchemaValidationError, path: UiJsonPath, originalUiJson: UiJson): string => {
  // Return a description of the given schema error, which is about the value at the given path, using the same terms as
  // our other issues (e.g., "a simulation input name must not be empty.").
  // Note: a value that is required may be missing (e.g., in a UI JSON file) or empty (e.g., if it was cleared in our
  //       settings dialog, in which case it got removed when our UI JSON was cleaned, see cleanUiJson()), hence we
  //       check the original UI JSON to tell which.

  const name = UI_JSON_VALUE_NAMES[uiJsonPathKey(path.map((key) => (typeof key === 'number' ? '*' : key)))];

  if (!name) {
    return common.formatMessage(error.toString(), false);
  }

  switch (error.name) {
    case 'required':
      return `${name} must ${uiJsonValueAt(originalUiJson, path) === undefined ? 'be provided' : 'not be empty'}.`;
    case 'minItems':
      return `${name} must not be empty.`;
    case 'type': {
      const types = (Array.isArray(error.argument) ? error.argument : [error.argument]).map(
        (type: unknown) => TYPE_NAMES[String(type)] ?? String(type)
      );

      return `${name} must be ${types.join(' or ')}.`;
    }
    case 'additionalProperties':
      return `${name} must not have a '${String(error.argument)}' property.`;
    default:
      return `${name} ${common.formatMessage(error.message, false)}.`;
  }
};

interface ValidateUiJsonOptions {
  allModelParameters?: string[];
  editableModelParameters?: string[];
}

// Note: there may be many items (e.g., hundreds of model parameters), in which case we only list the first ones, so
//       that our issues remain readable.

const MAX_LISTED_ITEMS = 10;

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

  if (list.length > MAX_LISTED_ITEMS) {
    return `${list.slice(0, MAX_LISTED_ITEMS).join(', ')}, or ${common.formatCount(list.length - MAX_LISTED_ITEMS)} others`;
  }

  return `${list.slice(0, -1).join(', ')}, or ${list[list.length - 1]}`;
};

export const validateUiJson = (uiJson: UiJson | undefined, options?: ValidateUiJsonOptions): UiJsonIssue[] => {
  // Make sure that we have some UI JSON.

  if (!uiJson) {
    return [uiJsonIssue('no UI JSON was provided.')];
  }

  // Clean our UI JSON (in case there were optional values that were not provided and are now empty).

  const originalUiJson = uiJson;

  uiJson = cleanUiJson(uiJson);

  // Check the UI JSON against our schema.

  const validator = new dependencies._jsonSchema.Validator();

  // Note: an input can be either a discrete input or a scalar input, depending on whether it has possible values, so we
  //       check each input against the schema of its kind (rather than against either of them, which would result in
  //       errors for both kinds of inputs whenever an input has an issue).

  const discreteInputSchema: Record<string, unknown> = {
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
    },
    type: 'object'
  };

  const scalarInputSchema: Record<string, unknown> = {
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
    },
    type: 'object'
  };

  const inputSchemas: Record<string, unknown>[] = (Array.isArray(uiJson.input) ? uiJson.input : []).map(
    (input: unknown) => (common.isObject(input) && 'possibleValues' in input ? discreteInputSchema : scalarInputSchema)
  );
  const schema: Record<string, unknown> = {
    additionalProperties: false,
    properties: {
      input: {
        items: inputSchemas,
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

  // Report our schema errors and keep track of the values that they are about.
  // Note #1: an error is about the value at its path, except if it is about a required property of that value that is
  //          missing, in which case it is about that property. An error about an additional property (i.e. a property
  //          that is not allowed) is about the value that has that property since such a property has no place in a UI
  //          JSON (and therefore no field in our settings dialog). However, that property is the only value that is
  //          invalid, not the value that has it (whose other properties can still be checked).
  // Note #2: external data values that are not numbers are not reported by our schema validation (see
  //          fromFloat64ArrayForSchemaValidation()), but they are just as invalid, so we report them alongside. They
  //          don't prevent our other checks from being made though since those checks don't depend on them (they only
  //          depend on how many values there are).

  const res: UiJsonIssue[] = [];
  const invalidPathKeys: string[] = [];

  for (const error of validatorRes.errors as SchemaValidationError[]) {
    const path: UiJsonPath = [...error.path];

    if (error.name === 'required' && typeof error.argument === 'string') {
      path.push(error.argument);
    }

    res.push(uiJsonIssue(schemaErrorDescription(error, path, originalUiJson), path));

    invalidPathKeys.push(
      uiJsonPathKey(
        error.name === 'additionalProperties' && typeof error.argument === 'string' ? [...path, error.argument] : path
      )
    );
  }

  res.push(...nonNumericValuesIssues(uiJson));

  // Make sure that our UI JSON makes sense, but only check the values that passed our schema validation, i.e. the
  // values that have the expected type (and are present, if required) and so have the contents that our checks expect.
  // Note #1: valid() tells whether the value at the given path passed our schema validation, i.e. whether there is no
  //          schema error about it or about any of its descendants, while objectEntries() returns the entries of the
  //          given value that are objects if it is an array (or no entries otherwise), so that we only check the items
  //          of an array that are objects (i.e. those that have the expected type), while keeping track of their index.
  // Note #2: we don't check whether a value is empty since an empty value (e.g., a field that was cleared in our
  //          settings dialog) gets removed when our UI JSON is cleaned (see cleanUiJson()), and is then reported by our
  //          schema validation as not being provided (or as being empty, see schemaErrorDescription()), which also
  //          reports the arrays that are empty while they shouldn't.

  const valid = (...path: UiJsonPath): boolean => {
    const pathKey = uiJsonPathKey(path);

    return !invalidPathKeys.some(
      (invalidPathKey: string) => invalidPathKey === pathKey || invalidPathKey.startsWith(`${pathKey}/`)
    );
  };
  const objectEntries = <T>(value: T[] | null | undefined): [number, T][] => {
    return Array.isArray(value) ? [...value.entries()].filter(([, item]) => common.isObject(item)) : [];
  };

  const allModelParametersSet = new Set(options?.allModelParameters ?? []);
  const editableModelParametersSet = new Set(options?.editableModelParameters ?? []);

  // Make sure that the input information makes sense.
  // Note: like for our schema validation, an input is a discrete input if it has possible values and a scalar input
  //       otherwise.

  const inputIdUsed = new Set<string>();

  for (const [inputIndex, input] of objectEntries(uiJson.input)) {
    const inputPath = (...keys: UiJsonPath): UiJsonPath => ['input', inputIndex, ...keys];
    const inputValid = (...keys: UiJsonPath): boolean => valid(...inputPath(...keys));

    if (inputValid('id')) {
      if (inputIdUsed.has(input.id)) {
        res.push(
          uiJsonIssue(`a simulation input ID must be unique ('${input.id}' is used more than once).`, inputPath('id'))
        );
      }

      inputIdUsed.add(input.id);
    }

    if ('possibleValues' in input) {
      // Note: we can only check the values of our possible values if they are all valid.

      if (inputValid('possibleValues')) {
        const possibleValues = input.possibleValues.map((possibleValue) => {
          return possibleValue.value;
        });
        const listOfPossibleValues = listOfItems(new Set(possibleValues.map((possibleValue) => String(possibleValue))));
        const usedPossibleValues = new Set<number>();

        for (const [possibleValueIndex, possibleValue] of possibleValues.entries()) {
          if (usedPossibleValues.has(possibleValue)) {
            res.push(
              uiJsonIssue(
                `a possible value must have a unique value ('${possibleValue}' is used more than once).`,
                inputPath('possibleValues', possibleValueIndex, 'value')
              )
            );
          }

          usedPossibleValues.add(possibleValue);
        }

        if (inputValid('defaultValue') && !possibleValues.includes(input.defaultValue)) {
          res.push(
            uiJsonIssue(
              `a simulation input default value must be one of the possible values ('${input.defaultValue}' is not one of ${listOfPossibleValues}).`,
              inputPath('defaultValue')
            )
          );
        }
      }
    } else if (inputValid('minimumValue') && inputValid('maximumValue')) {
      const scalarInput = input as UiJsonScalarInput;

      if (scalarInput.minimumValue >= scalarInput.maximumValue) {
        res.push(
          uiJsonIssue(
            `a simulation input minimum value must be less than the maximum value (${scalarInput.minimumValue} is not less than ${scalarInput.maximumValue}).`,
            inputPath('minimumValue'),
            inputPath('maximumValue')
          )
        );
      }

      if (
        inputValid('defaultValue') &&
        (scalarInput.defaultValue < scalarInput.minimumValue || scalarInput.defaultValue > scalarInput.maximumValue)
      ) {
        res.push(
          uiJsonIssue(
            `a simulation input default value must be greater than or equal to the minimum value and less than or equal to the maximum value (${scalarInput.defaultValue} is not between ${scalarInput.minimumValue} and ${scalarInput.maximumValue}).`,
            inputPath('defaultValue')
          )
        );
      }

      const range = scalarInput.maximumValue - scalarInput.minimumValue;

      if (scalarInput.stepValue !== undefined && scalarInput.stepValue !== null) {
        if (inputValid('stepValue')) {
          if (scalarInput.stepValue <= 0 || scalarInput.stepValue > range) {
            res.push(
              uiJsonIssue(
                `a simulation input step value must be greater than zero and less than or equal to the range value (${scalarInput.stepValue} is not between 0 and ${range}).`,
                inputPath('stepValue')
              )
            );
          }

          if (!common.isDivisible(range, scalarInput.stepValue)) {
            res.push(
              uiJsonIssue(
                `a simulation input step value must be a factor of the range value (${scalarInput.stepValue} is not a factor of ${range}).`,
                inputPath('stepValue')
              )
            );
          }
        }
      } else if (!common.isDivisible(range, 1)) {
        // Note: there is no step value, so we consider that the issue is about the step value that should be given.

        res.push(
          uiJsonIssue(
            `a simulation input step value must be a factor of the range value (1 is not a factor of ${range}).`,
            inputPath('stepValue')
          )
        );
      }
    }
  }

  // Make sure that the output information makes sense.

  const output: Partial<UiJsonOutput> = common.isObject(uiJson.output) ? uiJson.output : {};
  const outputIdUsed = new Set<string>();
  const listOfAllModelParameters = listOfItems(allModelParametersSet);

  for (const [outputDataIndex, outputData] of objectEntries(output.data)) {
    const outputDataPath = (key: string): UiJsonPath => ['output', 'data', outputDataIndex, key];

    if (valid(...outputDataPath('id'))) {
      if (outputIdUsed.has(outputData.id)) {
        res.push(
          uiJsonIssue(
            `a simulation data ID must be unique ('${outputData.id}' is used more than once).`,
            outputDataPath('id')
          )
        );
      }

      outputIdUsed.add(outputData.id);
    }

    if (
      valid(...outputDataPath('name')) &&
      allModelParametersSet.size > 0 &&
      !allModelParametersSet.has(outputData.name)
    ) {
      res.push(
        uiJsonIssue(
          `a simulation data model parameter must match one of the available options ('${outputData.name}' is not one of ${listOfAllModelParameters}).`,
          outputDataPath('name')
        )
      );
    }
  }

  for (const [outputExternalDataIndex, outputExternalData] of objectEntries(output.externalData)) {
    const outputExternalDataPath = (...keys: UiJsonPath): UiJsonPath => [
      'output',
      'externalData',
      outputExternalDataIndex,
      ...keys
    ];
    const outputExternalDataValid = (...keys: UiJsonPath): boolean => valid(...outputExternalDataPath(...keys));

    if (outputExternalDataValid('voiExpression') && outputExternalData.voiExpression) {
      try {
        dependencies._mathJs.parse(outputExternalData.voiExpression);
      } catch (error: unknown) {
        res.push(
          uiJsonIssue(
            `an external data file VOI expression must be valid ('${outputExternalData.voiExpression}' is not: ${common.formatMessage(common.formatError(error), false)}).`,
            outputExternalDataPath('voiExpression')
          )
        );
      }
    }

    const voiValuesValid = outputExternalDataValid('voiValues');

    const outputExternalDataSeriesNames = new Set<string>();

    for (const [outputExternalDataSeriesIndex, outputExternalDataSeries] of objectEntries(
      outputExternalData.dataSeries
    )) {
      const outputExternalDataSeriesPath = (key: string): UiJsonPath =>
        outputExternalDataPath('dataSeries', outputExternalDataSeriesIndex, key);

      if (valid(...outputExternalDataSeriesPath('name'))) {
        if (outputExternalDataSeriesNames.has(outputExternalDataSeries.name)) {
          res.push(
            uiJsonIssue(
              `a data series name must be unique ('${outputExternalDataSeries.name}' is used more than once).`,
              outputExternalDataSeriesPath('name')
            )
          );
        }

        outputExternalDataSeriesNames.add(outputExternalDataSeries.name);
      }

      if (
        valid(...outputExternalDataSeriesPath('values')) &&
        voiValuesValid &&
        outputExternalDataSeries.values.length !== outputExternalData.voiValues.length
      ) {
        res.push(
          uiJsonIssue(
            `the number of values of a data series must match the number of VOI values of its external data file (${outputExternalDataSeries.values.length} is not equal to ${outputExternalData.voiValues.length}).`,
            outputExternalDataSeriesPath('values')
          )
        );
      }
    }

    // Note: we can only check the name of an external data entry against the names of our external data series if they
    //       are all valid.

    const outputExternalDataIds = new Set<string>();
    const dataSeriesValid = outputExternalDataValid('dataSeries');
    const listOfOutputExternalDataSeriesNames = listOfItems(outputExternalDataSeriesNames);

    for (const [outputExternalDataEntryIndex, outputExternalDataEntry] of objectEntries(outputExternalData.data)) {
      const outputExternalDataEntryPath = (key: string): UiJsonPath =>
        outputExternalDataPath('data', outputExternalDataEntryIndex, key);

      if (valid(...outputExternalDataEntryPath('id'))) {
        if (outputExternalDataIds.has(outputExternalDataEntry.id)) {
          res.push(
            uiJsonIssue(
              `an external data ID must be unique ('${outputExternalDataEntry.id}' is used more than once).`,
              outputExternalDataEntryPath('id')
            )
          );
        }

        outputExternalDataIds.add(outputExternalDataEntry.id);

        if (outputIdUsed.has(outputExternalDataEntry.id)) {
          res.push(
            uiJsonIssue(
              `an external data ID must be unique across simulation and external data ('${outputExternalDataEntry.id}' is used more than once).`,
              outputExternalDataEntryPath('id')
            )
          );
        }

        outputIdUsed.add(outputExternalDataEntry.id);
      }

      if (
        valid(...outputExternalDataEntryPath('name')) &&
        dataSeriesValid &&
        !outputExternalDataSeriesNames.has(outputExternalDataEntry.name)
      ) {
        res.push(
          uiJsonIssue(
            `an external data series must match one of the available options ('${outputExternalDataEntry.name}' is not one of ${listOfOutputExternalDataSeriesNames}).`,
            outputExternalDataEntryPath('name')
          )
        );
      }
    }
  }

  for (const [outputPlotIndex, outputPlot] of objectEntries(output.plots)) {
    const checkTraceValue = (value: string, axisLabel: 'X value' | 'Y value', path: UiJsonPath): void => {
      if (!valid(...path)) {
        return;
      }

      try {
        dependencies._mathJs.parse(value);
      } catch (error: unknown) {
        res.push(
          uiJsonIssue(
            `a trace ${axisLabel} must be valid ('${value}' is not: ${common.formatMessage(common.formatError(error), false)}).`,
            path
          )
        );
      }
    };
    const outputPlotPath: UiJsonPath = ['output', 'plots', outputPlotIndex];

    checkTraceValue(outputPlot.xValue, 'X value', [...outputPlotPath, 'xValue']);
    checkTraceValue(outputPlot.yValue, 'Y value', [...outputPlotPath, 'yValue']);

    for (const [additionalTraceIndex, additionalTrace] of objectEntries(outputPlot.additionalTraces)) {
      const additionalTracePath: UiJsonPath = [...outputPlotPath, 'additionalTraces', additionalTraceIndex];

      checkTraceValue(additionalTrace.xValue, 'X value', [...additionalTracePath, 'xValue']);
      checkTraceValue(additionalTrace.yValue, 'Y value', [...additionalTracePath, 'yValue']);
    }
  }

  // Make sure that the parameters information makes sense.

  const listOfEditableModelParameters = listOfItems(editableModelParametersSet);

  for (const [parameterIndex, parameter] of objectEntries(uiJson.parameters)) {
    const parameterPath = (key: string): UiJsonPath => ['parameters', parameterIndex, key];

    if (
      valid(...parameterPath('name')) &&
      editableModelParametersSet.size > 0 &&
      !editableModelParametersSet.has(parameter.name)
    ) {
      res.push(
        uiJsonIssue(
          `a model parameter name must match one of the available options ('${parameter.name}' is not one of ${listOfEditableModelParameters}).`,
          parameterPath('name')
        )
      );
    }

    if (valid(...parameterPath('value'))) {
      try {
        dependencies._mathJs.parse(parameter.value);
      } catch (error: unknown) {
        res.push(
          uiJsonIssue(
            `a model parameter value must be valid ('${parameter.value}' is not: ${common.formatMessage(common.formatError(error), false)}).`,
            parameterPath('value')
          )
        );
      }
    }
  }

  return res;
};
