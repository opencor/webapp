import type { IssuePtrs as IWasmIssues } from '@opencor/libopencor-types';

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

export const wasmIssuesToIssues = (wasmIssues: IWasmIssues): IIssue[] => {
  const res: IIssue[] = [];

  for (const wasmIssue of wasmIssues) {
    if (!wasmIssue) {
      continue;
    }

    res.push({
      type: wasmIssue.type.value,
      description: wasmIssue.description
    });
  }

  return res;
};
