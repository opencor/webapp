// Logger API.

export enum EIssueType {
  ERROR,
  WARNING,
  INFORMATION
}

export interface IIssue {
  type: EIssueType;
  description: string;
}

interface IWasmIssue {
  type: { value: EIssueType };
  description: string;
}

export type IWasmIssues = Iterable<IWasmIssue>;

export const wasmIssuesToIssues = (wasmIssues: IWasmIssues): IIssue[] => {
  const res: IIssue[] = [];

  for (const wasmIssue of wasmIssues) {
    res.push({
      type: wasmIssue.type.value,
      description: wasmIssue.description
    });
  }

  return res;
};
