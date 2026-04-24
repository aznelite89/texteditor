import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { WordCount } from './WordCount';

describe('WordCount component — Requirement 5', () => {
  it('renders 0 when content is empty', () => {
    render(<WordCount content="" />);
    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('renders the correct count for plain HTML content', () => {
    render(<WordCount content="<p>the quick brown fox</p>" />);
    expect(screen.getByText('4')).toBeInTheDocument();
  });

  it('strips formatting tags before counting', () => {
    render(<WordCount content="<p><strong>one</strong> <em>two</em> three</p>" />);
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('updates the count live when content changes', () => {
    const { rerender } = render(<WordCount content="<p>one two</p>" />);
    expect(screen.getByText('2')).toBeInTheDocument();

    rerender(<WordCount content="<p>one two three four five</p>" />);
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('exposes the live region with aria-live="polite" for assistive tech', () => {
    const { container } = render(<WordCount content="<p>hello world</p>" />);
    const live = container.querySelector('[aria-live="polite"]');
    expect(live).not.toBeNull();
    expect(live).toHaveTextContent('2');
  });

  it('renders a Words label alongside the count', () => {
    render(<WordCount content="<p>hi</p>" />);
    expect(screen.getByText(/words:/i)).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
  });
});
