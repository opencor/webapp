// Logger API.

export enum IssueType {
  Error,
  Warning
}

export interface IIssue {
  type: IssueType
  description: string
}

interface IWasmIssue {
  type: { value: IssueType }
  description: string
}

export interface IWasmIssues {
  size(): number
  get(index: number): IWasmIssue
}

export function wasmIssuesToIssues(issues: IWasmIssues): IIssue[] {
  const res = []

  for (let i = 0; i < issues.size(); ++i) {
    const issue = issues.get(i)

    res.push({
      type: issue.type.value,
      description: issue.description
    })
  }

  return res
}
