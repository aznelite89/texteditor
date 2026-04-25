/** Explicit map so TS/IDE do not infer a truncated spread-based type (see Toolbar, `FormatCommand`, `applyFormat` arity). */
type FormatCommandMap = {
  readonly BOLD: 'bold';
  readonly ITALIC: 'italic';
  readonly FORE_COLOR: 'foreColor';
  readonly FONT_SIZE: 'fontSize';
  readonly INSERT_UNORDERED_LIST: 'insertUnorderedList';
  readonly INSERT_ORDERED_LIST: 'insertOrderedList';
  readonly FORMAT_BLOCK: 'formatBlock';
};

export const FORMAT_COMMAND: FormatCommandMap = {
  BOLD: 'bold',
  ITALIC: 'italic',
  FORE_COLOR: 'foreColor',
  FONT_SIZE: 'fontSize',
  INSERT_UNORDERED_LIST: 'insertUnorderedList',
  INSERT_ORDERED_LIST: 'insertOrderedList',
  FORMAT_BLOCK: 'formatBlock',
};

export type FormatCommand = FormatCommandMap[keyof FormatCommandMap];

const FONT_SIZE_VALUE_A = {
  SMALL: '2',
  NORMAL: '3',
} as const;

const FONT_SIZE_VALUE_B = {
  LARGE: '5',
  HUGE: '7',
} as const;

export const FONT_SIZE_VALUE = {
  ...FONT_SIZE_VALUE_A,
  ...FONT_SIZE_VALUE_B,
} as const;

export type FontSizeValue = (typeof FONT_SIZE_VALUE)[keyof typeof FONT_SIZE_VALUE];

const BLOCK_FORMAT_A = {
  PARAGRAPH: 'P',
  HEADING_1: 'H1',
} as const;

const BLOCK_FORMAT_B = {
  HEADING_2: 'H2',
  HEADING_3: 'H3',
} as const;

export const BLOCK_FORMAT = {
  ...BLOCK_FORMAT_A,
  ...BLOCK_FORMAT_B,
} as const;

export type BlockFormat = (typeof BLOCK_FORMAT)[keyof typeof BLOCK_FORMAT];

export const DEFAULT_TEXT_COLOR = '#111827' as const;
