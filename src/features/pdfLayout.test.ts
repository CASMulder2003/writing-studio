import { describe, expect, it } from 'vitest';
import { justificationGap, layoutParagraph, type TextRun } from './pdfLayout';
const run = (text: string): TextRun => ({
  text,
  style: 'normal',
  underline: false,
  strike: false,
});
const measure = (run: TextRun) => run.text.length;

describe('trade paperback paragraph layout', () => {
  it('justifies wrapped lines to the right edge without stretching the final line', () => {
    const lines = layoutParagraph(
      [run('These words form a justified paragraph with a short final line.')],
      measure,
      24,
      4,
    );
    expect(lines.length).toBeGreaterThan(2);
    for (const line of lines.slice(0, -1)) {
      const gaps = line.runs.filter((run) => /^\s+$/.test(run.text)).length;
      expect(
        line.width + line.indent + gaps * justificationGap(line, 24),
      ).toBeCloseTo(24, 5);
    }
    expect(lines[0].indent).toBe(4);
    expect(lines[1].indent).toBe(0);
    expect(justificationGap(lines.at(-1)!, 24)).toBe(0);
  });
  it('preserves deliberate poetry line breaks without expanding the spaces', () => {
    const lines = layoutParagraph(
      [run('A quiet bay.\nA distant light.\n')],
      measure,
      40,
      0,
    );
    expect(lines.map((line) => line.runs.map((r) => r.text).join(''))).toEqual([
      'A quiet bay.',
      'A distant light.',
      '',
    ]);
    expect(lines.every((line) => justificationGap(line, 40) === 0)).toBe(true);
  });
  it('does not justify a final line merely because it ends with spaces', () => {
    const lines = layoutParagraph([run('A full line.     ')], measure, 12, 0);
    expect(lines).toHaveLength(1);
    expect(lines[0].justify).toBe(false);
    expect(lines[0].width).toBe(12);
  });
  it('preserves italics and handles long words without overflowing the page', () => {
    const lines = layoutParagraph(
      [
        run('An '),
        { ...run('extraordinarilylongword'), style: 'italic' },
        run(' arrived.'),
      ],
      measure,
      12,
      0,
    );
    expect(lines.every((line) => line.width + line.indent <= 12)).toBe(true);
    const italic = lines
      .flatMap((line) => line.runs)
      .filter((run) => run.style === 'italic')
      .map((run) => run.text)
      .join('');
    expect(italic).toBe('extraordinarilylongword');
  });
});
