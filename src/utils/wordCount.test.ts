import { describe, expect, it } from 'vitest';
import { countWords, htmlToText } from './wordCount';

describe('htmlToText — Requirement 5: HTML → plain text for counting', () => {
  it('returns an empty string for empty input', () => {
    expect(htmlToText('')).toBe('');
  });

  it('strips simple tags and returns the textContent', () => {
    expect(htmlToText('<p>hello world</p>')).toBe('hello world');
  });

  it('strips nested tags and concatenates inner text', () => {
    expect(htmlToText('<p><strong>bold</strong> and <em>italic</em></p>')).toBe(
      'bold and italic',
    );
  });

  it('decodes HTML entities (e.g., &nbsp;, &amp;)', () => {
    // textContent decodes entities. &nbsp; becomes a non-breaking space (U+00A0).
    const result = htmlToText('hello&nbsp;world &amp; friends');
    expect(result).toContain('hello');
    expect(result).toContain('world');
    expect(result).toContain('& friends');
  });

  it('returns empty string for tag-only HTML with no text', () => {
    expect(htmlToText('<p></p><br/>')).toBe('');
  });
});

describe('countWords — Requirement 5: word counter', () => {
  it('returns 0 for an empty string', () => {
    expect(countWords('')).toBe(0);
  });

  it('returns 0 for whitespace-only input', () => {
    expect(countWords('   \n\t  ')).toBe(0);
  });

  it('counts a single word', () => {
    expect(countWords('hello')).toBe(1);
  });

  it('counts multiple words separated by single spaces', () => {
    expect(countWords('the quick brown fox')).toBe(4);
  });

  it('collapses multiple whitespace characters between words', () => {
    expect(countWords('hello    world\n\nfoo\tbar')).toBe(4);
  });

  it('treats trailing/leading whitespace as not contributing to count', () => {
    expect(countWords('   hello world   ')).toBe(2);
  });

  it('counts punctuation-attached tokens as a single word', () => {
    expect(countWords('hello, world!')).toBe(2);
  });

  it('counts numbers as words', () => {
    expect(countWords('the year 2026 begins')).toBe(4);
  });
});
