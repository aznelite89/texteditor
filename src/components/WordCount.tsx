import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { countWords, htmlToText } from '../utils/wordCount';

type WordCountProps = {
  content: string;
};

function WordCountImpl({ content }: WordCountProps) {
  const count = useMemo(() => countWords(htmlToText(content)), [content]);
  const prevCount = useRef(count);
  const [isGlowing, setIsGlowing] = useState(false);

  useEffect(() => {
    if (prevCount.current === count) return;
    prevCount.current = count;
    setIsGlowing(true);
    const timer = setTimeout(() => setIsGlowing(false), 400);
    return () => clearTimeout(timer);
  }, [count]);

  return (
    <div
      className={`word-count ${isGlowing ? 'word-count--glow' : ''}`}
      aria-live="polite"
    >
      <span className="word-count__label">Words:</span>
      <span className="word-count__value">{count}</span>
    </div>
  );
}

export const WordCount = memo(WordCountImpl);
