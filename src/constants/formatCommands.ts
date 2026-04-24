export const FORMAT_COMMAND = {
  BOLD: 'bold',
  ITALIC: 'italic',
  FORE_COLOR: 'foreColor',
  FONT_SIZE: 'fontSize',
  INSERT_UNORDERED_LIST: 'insertUnorderedList',
  INSERT_ORDERED_LIST: 'insertOrderedList',
  FORMAT_BLOCK: 'formatBlock',
} as const;

export type FormatCommand = typeof FORMAT_COMMAND[keyof typeof FORMAT_COMMAND];

export const FONT_SIZE_VALUE = {
  SMALL: '2',
  NORMAL: '3',
  LARGE: '5',
  HUGE: '7',
} as const;

export type FontSizeValue = typeof FONT_SIZE_VALUE[keyof typeof FONT_SIZE_VALUE];

export const BLOCK_FORMAT = {
  PARAGRAPH: 'P',
  HEADING_1: 'H1',
  HEADING_2: 'H2',
  HEADING_3: 'H3',
} as const;

export type BlockFormat = typeof BLOCK_FORMAT[keyof typeof BLOCK_FORMAT];

export const DEFAULT_TEXT_COLOR = '#111827' as const;
