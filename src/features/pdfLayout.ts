export type FontStyle = 'normal' | 'italic' | 'bold' | 'bolditalic';
export type TextRun = {
  text: string;
  style: FontStyle;
  underline: boolean;
  strike: boolean;
};
export type TextLine = {
  runs: TextRun[];
  width: number;
  indent: number;
  justify: boolean;
};

/** Wrap first, then paginate. Explicit line breaks and paragraph endings stay unstretched. */
export function layoutParagraph(
  runs: TextRun[],
  measure: (run: TextRun) => number,
  width: number,
  firstIndent: number,
): TextLine[] {
  const lines: TextLine[] = [];
  let line: TextRun[] = [];
  let used = 0;
  let indent = firstIndent;
  const flush = (justify: boolean) => {
    while (line.length && /^\s+$/u.test(line[line.length - 1].text)) {
      used -= measure(line.pop()!);
    }
    lines.push({ runs: line, width: used, indent, justify });
    line = [];
    used = 0;
    indent = 0;
  };
  for (const run of runs) {
    for (const text of run.text.match(/\n|[^\S\n]+|[^\s]+/gu) || []) {
      if (text === '\n') {
        flush(false);
        continue;
      }
      const token = { ...run, text };
      const span = measure(token);
      // Defer wrapping whitespace until the next word so trailing spaces never
      // turn the end of a paragraph into a stretched line plus an empty line.
      if (/^\s+$/u.test(text)) {
        line.push(token);
        used += span;
        continue;
      }
      if (used + span > width - indent && line.length) {
        flush(true);
      }
      if (span > width - indent) {
        for (const character of text) {
          const fragment = { ...run, text: character };
          const characterWidth = measure(fragment);
          if (used + characterWidth > width - indent && line.length)
            flush(true);
          line.push(fragment);
          used += characterWidth;
        }
      } else {
        line.push(token);
        used += span;
      }
    }
  }
  flush(false);
  return lines;
}

export function justificationGap(line: TextLine, width: number): number {
  const gaps = line.runs.filter((run) => /^\s+$/u.test(run.text)).length;
  return line.justify && gaps
    ? Math.max(0, width - line.indent - line.width) / gaps
    : 0;
}
