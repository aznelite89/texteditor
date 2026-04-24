import type { FormatCommand } from '../constants/formatCommands';

export function applyFormat(cmd: FormatCommand, value?: string): void {
  // execCommand is deprecated but still universally supported for
  // contenteditable inline formatting — sufficient for this scope.
  document.execCommand(cmd, false, value);
}
