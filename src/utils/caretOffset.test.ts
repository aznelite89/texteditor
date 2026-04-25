import { describe, expect, it } from 'vitest';
import { nodeAtOffset, selectionRangeOffsets, textOffsetFromSelection } from './caretOffset';

function makeRoot(html: string): HTMLDivElement {
  const div = document.createElement('div');
  div.innerHTML = html;
  document.body.appendChild(div);
  return div;
}

describe('caretOffset — Requirement 6: caret offsets', () => {
  it('textOffsetFromSelection returns null when no selection exists', () => {
    const root = makeRoot('<p>hello</p>');
    document.getSelection()?.removeAllRanges();
    expect(textOffsetFromSelection(root)).toBeNull();
    root.remove();
  });

  it('textOffsetFromSelection reports the character offset for a caret inside the root', () => {
    const root = makeRoot('<p>hello world</p>');
    const text = root.querySelector('p')!.firstChild as Text;
    const range = document.createRange();
    range.setStart(text, 6);
    range.setEnd(text, 6);
    const sel = document.getSelection()!;
    sel.removeAllRanges();
    sel.addRange(range);

    expect(textOffsetFromSelection(root)).toBe(6);
    root.remove();
  });

  it('textOffsetFromSelection sums lengths across multiple text nodes', () => {
    const root = makeRoot('<p><strong>abc</strong>defg</p>');
    const second = root.querySelector('p')!.lastChild as Text;
    const range = document.createRange();
    range.setStart(second, 2);
    range.setEnd(second, 2);
    const sel = document.getSelection()!;
    sel.removeAllRanges();
    sel.addRange(range);

    // 'abc'.length (3) + 2 in 'defg' = 5
    expect(textOffsetFromSelection(root)).toBe(5);
    root.remove();
  });

  it('textOffsetFromSelection returns a number (not null) when endContainer is the root element itself', () => {
    const root = makeRoot('<p>abc</p><p>def</p>');
    const range = document.createRange();
    // Select to "after the first <p>" — endContainer is root, endOffset = 1.
    range.setStart(root, 1);
    range.setEnd(root, 1);
    const sel = document.getSelection()!;
    sel.removeAllRanges();
    sel.addRange(range);

    const result = textOffsetFromSelection(root);
    expect(result).not.toBeNull();
    // Should reflect the length of all text up to that boundary ('abc' = 3).
    expect(result).toBe(3);
    root.remove();
  });

  it('textOffsetFromSelection returns null when the selection is outside the root', () => {
    const root = makeRoot('<p>inside</p>');
    const outside = makeRoot('<p>outside text</p>');
    const text = outside.querySelector('p')!.firstChild as Text;
    const range = document.createRange();
    range.setStart(text, 3);
    range.setEnd(text, 3);
    const sel = document.getSelection()!;
    sel.removeAllRanges();
    sel.addRange(range);

    expect(textOffsetFromSelection(root)).toBeNull();
    root.remove();
    outside.remove();
  });

  it('nodeAtOffset returns the text node + local offset for a position inside a single text node', () => {
    const root = makeRoot('<p>abcdef</p>');
    const result = nodeAtOffset(root, 3);
    expect(result?.node.data).toBe('abcdef');
    expect(result?.offset).toBe(3);
    root.remove();
  });

  it('nodeAtOffset walks across nested text nodes', () => {
    const root = makeRoot('<p><strong>abc</strong>defg</p>');
    const result = nodeAtOffset(root, 5);
    expect(result?.node.data).toBe('defg');
    expect(result?.offset).toBe(2);
    root.remove();
  });

  it('nodeAtOffset clamps to the last text node when the offset exceeds total length', () => {
    const root = makeRoot('<p>abc</p>');
    const result = nodeAtOffset(root, 99);
    expect(result?.node.data).toBe('abc');
    expect(result?.offset).toBe(3);
    root.remove();
  });

  it('nodeAtOffset returns null for a root with no text nodes', () => {
    const root = makeRoot('');
    expect(nodeAtOffset(root, 0)).toBeNull();
    root.remove();
  });
});

describe('selectionRangeOffsets — Requirement 8: capture selected range', () => {
  it('returns null when no selection exists', () => {
    const root = makeRoot('<p>hello</p>');
    document.getSelection()?.removeAllRanges();
    expect(selectionRangeOffsets(root)).toBeNull();
    root.remove();
  });

  it('returns {start, end} for a selection that spans characters within one text node', () => {
    const root = makeRoot('<p>hello world</p>');
    const text = root.querySelector('p')!.firstChild as Text;
    const range = document.createRange();
    range.setStart(text, 0);
    range.setEnd(text, 5);
    const sel = document.getSelection()!;
    sel.removeAllRanges();
    sel.addRange(range);

    expect(selectionRangeOffsets(root)).toEqual({ start: 0, end: 5 });
    root.remove();
  });

  it('returns equal start/end for a collapsed selection (cursor)', () => {
    const root = makeRoot('<p>hello</p>');
    const text = root.querySelector('p')!.firstChild as Text;
    const range = document.createRange();
    range.setStart(text, 3);
    range.setEnd(text, 3);
    const sel = document.getSelection()!;
    sel.removeAllRanges();
    sel.addRange(range);

    expect(selectionRangeOffsets(root)).toEqual({ start: 3, end: 3 });
    root.remove();
  });

  it('sums offsets across multiple text nodes when the selection spans them', () => {
    const root = makeRoot('<p><strong>abc</strong>defg</p>');
    const startText = root.querySelector('strong')!.firstChild as Text;
    const endText = root.querySelector('p')!.lastChild as Text;
    const range = document.createRange();
    range.setStart(startText, 1);
    range.setEnd(endText, 2);
    const sel = document.getSelection()!;
    sel.removeAllRanges();
    sel.addRange(range);

    // start: 'a' before offset 1 in 'abc' → 1
    // end: 'abc' (3) + 'de' before offset 2 in 'defg' → 5
    expect(selectionRangeOffsets(root)).toEqual({ start: 1, end: 5 });
    root.remove();
  });

  it('returns null when the selection sits outside the root', () => {
    const root = makeRoot('<p>inside</p>');
    const outside = makeRoot('<p>outside text</p>');
    const text = outside.querySelector('p')!.firstChild as Text;
    const range = document.createRange();
    range.setStart(text, 1);
    range.setEnd(text, 4);
    const sel = document.getSelection()!;
    sel.removeAllRanges();
    sel.addRange(range);

    expect(selectionRangeOffsets(root)).toBeNull();
    root.remove();
    outside.remove();
  });
});
