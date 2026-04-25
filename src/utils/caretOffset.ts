export function textOffsetFromSelection(root: HTMLElement): number | null {
  const sel = document.getSelection();
  if (!sel || sel.rangeCount === 0) return null;
  const range = sel.getRangeAt(0);
  const endContainer = range.endContainer;
  // Reject only if the endContainer is genuinely outside the root.
  // Note: Node.contains(self) === true, so root-as-anchor passes.
  if (endContainer !== root && !root.contains(endContainer)) return null;
  const pre = range.cloneRange();
  pre.selectNodeContents(root);
  try {
    pre.setEnd(endContainer, range.endOffset);
  } catch {
    // setEnd can throw if endOffset is out of bounds for the container —
    // fall back to the full preselection length.
  }
  return pre.toString().length;
}

export function selectionRangeOffsets(
  root: HTMLElement,
): { start: number; end: number } | null {
  const sel = document.getSelection();
  if (!sel || sel.rangeCount === 0) return null;
  const range = sel.getRangeAt(0);
  const startContainer = range.startContainer;
  const endContainer = range.endContainer;
  if (startContainer !== root && !root.contains(startContainer)) return null;
  if (endContainer !== root && !root.contains(endContainer)) return null;

  const preStart = document.createRange();
  preStart.selectNodeContents(root);
  try {
    preStart.setEnd(startContainer, range.startOffset);
  } catch {
    // ignore — fall back to full preselection length
  }
  const start = preStart.toString().length;

  const preEnd = document.createRange();
  preEnd.selectNodeContents(root);
  try {
    preEnd.setEnd(endContainer, range.endOffset);
  } catch {
    // ignore
  }
  const end = preEnd.toString().length;

  return { start, end };
}

export function nodeAtOffset(
  root: HTMLElement,
  offset: number,
): { node: Text; offset: number } | null {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let remaining = offset;
  let lastText: Text | null = null;
  let node = walker.nextNode() as Text | null;
  while (node) {
    const len = node.data.length;
    if (remaining <= len) {
      return { node, offset: remaining };
    }
    remaining -= len;
    lastText = node;
    node = walker.nextNode() as Text | null;
  }
  if (lastText) {
    return { node: lastText, offset: lastText.data.length };
  }
  return null;
}
