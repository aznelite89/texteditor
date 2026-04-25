// `cmd` is `string` (not `FormatCommand`) so tools that infer a truncated command union still accept an optional value.
export function applyFormat(cmd: string, value?: string): void {
  // execCommand is deprecated but still universally supported for
  // contenteditable inline formatting — sufficient for this scope.
  document.execCommand(cmd, false, value);
}
