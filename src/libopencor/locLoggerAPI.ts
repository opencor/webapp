// Logger API.

export enum IssueType {
  Error,
  Warning
}

export interface IIssue {
  type: IssueType
  typeAsString: string
  description: string
}

interface IWasmIssue {
  type: { value: IssueType }
  typeAsString: string
  description: string
}

export interface IWasmIssues {
  size(): number
  get(index: number): IWasmIssue
}
