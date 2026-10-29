import { jsPDF } from 'jspdf';
import { type Book, type DocNode, fileName } from '../domain/book';

type FontStyle = 'normal' | 'italic' | 'bold' | 'bolditalic';
export type PdfFonts = Record<FontStyle, string>;
type Run = {
  text: string;
  style: FontStyle;
  underline: boolean;
  strike: boolean;
};
type Block = {
  kind: 'text' | 'heading' | 'image' | 'rule';
  runs?: Run[];
  src?: string;
  list?: boolean;
};
const fontFiles: Record<FontStyle, string> = {
  normal: 'CrimsonText-Regular.ttf',
  italic: 'CrimsonText-Italic.ttf',
  bold: 'CrimsonText-Bold.ttf',
  bolditalic: 'CrimsonText-BoldItalic.ttf',
};
let fontPromise: Promise<PdfFonts> | undefined;
async function loadFonts(): Promise<PdfFonts> {
  if (!fontPromise)
    fontPromise = Promise.all(
      Object.entries(fontFiles).map(async ([style, file]) => {
        const response = await fetch(
          import.meta.env.BASE_URL + 'fonts/' + file,
        );
        if (!response.ok)
          throw new Error(
            'The book fonts could not be loaded. Please try again.',
          );
        const bytes = new Uint8Array(await response.arrayBuffer());
        let binary = '';
        for (const value of bytes) binary += String.fromCharCode(value);
        return [style, btoa(binary)];
      }),
    )
      .then((values) => Object.fromEntries(values) as PdfFonts)
      .catch((error) => {
        fontPromise = undefined;
        throw error;
      });
  return fontPromise;
}
function runs(node: DocNode): Run[] {
  if (node.type === 'hardBreak')
    return [{ text: '\n', style: 'normal', underline: false, strike: false }];
  if (node.type === 'text') {
    const marks = node.marks || [];
    const bold = marks.some((m) => m.type === 'bold'),
      italic = marks.some((m) => m.type === 'italic');
    return [
      {
        text: node.text || '',
        style:
          bold && italic
            ? 'bolditalic'
            : bold
              ? 'bold'
              : italic
                ? 'italic'
                : 'normal',
        underline: marks.some((m) => m.type === 'underline'),
        strike: marks.some((m) => m.type === 'strike'),
      },
    ];
  }
  return (node.content || []).flatMap(runs);
}
function blocks(node: DocNode): Block[] {
  if (node.type === 'image')
    return [{ kind: 'image', src: String(node.attrs?.src || '') }];
  if (node.type === 'horizontalRule') return [{ kind: 'rule' }];
  if (node.type === 'paragraph' || node.type === 'codeBlock')
    return [{ kind: 'text', runs: runs(node) }];
  if (node.type === 'heading') return [{ kind: 'heading', runs: runs(node) }];
  if (node.type === 'bulletList' || node.type === 'orderedList')
    return (node.content || []).flatMap((child, index) => {
      const result = blocks(child);
      const first = result.find((b) => b.runs);
      if (first)
        first.runs = [
          {
            text: node.type === 'bulletList' ? '• ' : `${index + 1}. `,
            style: 'normal',
            underline: false,
            strike: false,
          },
          ...first.runs!,
        ];
      return result.map((b) => ({ ...b, list: true }));
    });
  if (node.type === 'blockquote')
    return (node.content || []).flatMap(blocks).map((b) => ({
      ...b,
      runs: b.runs?.map((r) => ({
        ...r,
        style: r.style === 'bold' ? 'bolditalic' : 'italic',
      })),
    }));
  return (node.content || []).flatMap(blocks);
}
export async function createBookPdf(
  book: Book,
  selectedIds: Set<string>,
  size: 'compact' | 'large' = 'compact',
  providedFonts?: PdfFonts,
) {
  const selected = book.chapters.filter((c) => selectedIds.has(c.id));
  if (!selected.length) throw new Error('Select at least one chapter.');
  const fonts = providedFonts || (await loadFonts());
  const width = size === 'compact' ? 139.7 : 152.4,
    height = size === 'compact' ? 215.9 : 228.6;
  const doc = new jsPDF({
    unit: 'mm',
    format: [width, height],
    compress: true,
    putOnlyUsedFonts: true,
  });
  for (const style of Object.keys(fontFiles) as FontStyle[]) {
    doc.addFileToVFS(fontFiles[style], fonts[style]);
    doc.addFont(fontFiles[style], 'BookSerif', style);
  }
  doc.setProperties({
    title: book.title,
    author: book.author,
    subject: 'Draft manuscript',
    creator: 'Writing Studio',
  });
  doc.setFont('BookSerif', 'normal');
  doc.setTextColor(35, 39, 35);
  doc.setFontSize(29);
  const titleLines = doc.splitTextToSize(
    book.title || 'Untitled book',
    width - 36,
  ) as string[];
  let titleY = 62;
  for (const line of titleLines) {
    doc.text(line, width / 2, titleY, { align: 'center' });
    titleY += 12;
  }
  if (book.author) {
    doc.setFontSize(14);
    for (const line of doc.splitTextToSize(
      book.author,
      width - 36,
    ) as string[]) {
      doc.text(line, width / 2, titleY + 22, { align: 'center' });
      titleY += 7;
    }
  }
  doc.setFontSize(9);
  doc.setTextColor(125);
  doc.text('DRAFT', width / 2, height - 26, { align: 'center' });
  let y = 0;
  let fontSize = 11.5;
  const lineHeight = 5.7;
  let line: Run[] = [];
  let lineWidth = 0;
  let indent = 0;
  const left = () => (doc.getNumberOfPages() % 2 === 0 ? 19 : 17);
  const textWidth = width - 36;
  const startPage = () => {
    doc.addPage([width, height]);
    y = 25;
  };
  const measure = (run: Run) => {
    doc.setFont('BookSerif', run.style);
    doc.setFontSize(fontSize);
    return doc.getTextWidth(run.text);
  };
  const flushLine = () => {
    if (y > height - 22) {
      startPage();
    }
    let x = left() + indent;
    doc.setTextColor(35, 39, 35);
    for (const run of line) {
      doc.setFont('BookSerif', run.style);
      doc.setFontSize(fontSize);
      doc.text(run.text, x, y);
      const span = doc.getTextWidth(run.text);
      if (run.underline) {
        doc.setLineWidth(0.16);
        doc.line(x, y + 0.8, x + span, y + 0.8);
      }
      if (run.strike) {
        doc.setLineWidth(0.16);
        doc.line(x, y - 1.1, x + span, y - 1.1);
      }
      x += span;
    }
    line = [];
    lineWidth = 0;
    indent = 0;
    y += fontSize > 12 ? 7.2 : lineHeight;
  };
  const addRun = (run: Run) => {
    for (const token of run.text.match(/\n|[^\S\n]+|[^\s]+/gu) || []) {
      if (token === '\n') {
        flushLine();
        continue;
      }
      let piece = { ...run, text: token };
      let span = measure(piece);
      if (lineWidth + span > textWidth - indent && line.length) {
        flushLine();
        if (/^\s+$/.test(token)) continue;
      }
      if (span > textWidth - indent) {
        for (const character of token) {
          piece = { ...run, text: character };
          span = measure(piece);
          if (lineWidth + span > textWidth - indent && line.length) flushLine();
          line.push(piece);
          lineWidth += span;
        }
      } else {
        line.push(piece);
        lineWidth += span;
      }
    }
  };
  const openingPages = new Set<number>();
  for (const chapter of selected) {
    startPage();
    openingPages.add(doc.getNumberOfPages());
    doc.setFont('BookSerif', 'normal');
    doc.setTextColor(105);
    doc.setFontSize(10);
    doc.text(
      `CHAPTER ${book.chapters.findIndex((c) => c.id === chapter.id) + 1}`,
      width / 2,
      35,
      { align: 'center' },
    );
    doc.setTextColor(35, 39, 35);
    doc.setFontSize(23);
    const titles = doc.splitTextToSize(
      chapter.title || 'Untitled chapter',
      textWidth,
    ) as string[];
    y = 47;
    for (const title of titles) {
      doc.text(title, width / 2, y, { align: 'center' });
      y += 9;
    }
    y += 10;
    const content = chapter.scenes.flatMap((s) => blocks(s.content));
    let firstParagraph = true;
    for (const block of content) {
      if (block.kind === 'rule') {
        if (y > height - 34) startPage();
        doc.setFont('BookSerif', 'normal');
        doc.setFontSize(11);
        doc.setTextColor(100);
        doc.text('* * *', width / 2, y + 5, { align: 'center' });
        y += 15;
        firstParagraph = true;
        continue;
      }
      if (block.kind === 'image') {
        if (
          !block.src ||
          !/^data:image\/(png|jpeg|webp);base64,/.test(block.src)
        )
          throw new Error(
            'A manuscript image could not be included. Use a locally attached PNG, JPEG, or WebP image.',
          );
        const image = doc.getImageProperties(block.src);
        const scale = Math.min(
          textWidth / image.width,
          (height - 54) / image.height,
        );
        const iw = image.width * scale,
          ih = image.height * scale;
        if (y + ih > height - 23) startPage();
        doc.addImage(block.src, left() + (textWidth - iw) / 2, y, iw, ih);
        y += ih + 9;
        firstParagraph = true;
        continue;
      }
      fontSize = block.kind === 'heading' ? 16 : 11.5;
      if (block.kind === 'heading') {
        if (y > height - 45) startPage();
        y += 4;
        indent = 0;
      } else indent = firstParagraph || block.list ? 0 : 4;
      for (const run of block.runs || []) addRun(run);
      flushLine();
      if (block.kind === 'heading') y += 4;
      firstParagraph = block.kind === 'heading';
    }
  }
  const totalPages = doc.getNumberOfPages();
  for (let page = 2; page <= totalPages; page++) {
    doc.setPage(page);
    doc.setFont('BookSerif', 'normal');
    doc.setTextColor(105);
    doc.setFontSize(9);
    doc.text(String(page - 1), width / 2, height - 12, { align: 'center' });
    if (!openingPages.has(page)) {
      doc.setFontSize(8);
      const runningTitle = doc.splitTextToSize(book.title, textWidth)[0];
      doc.text(runningTitle, width / 2, 13, { align: 'center' });
    }
  }
  return doc;
}
export async function downloadBookPdf(
  book: Book,
  selectedIds: Set<string>,
  size: 'compact' | 'large',
) {
  const pdf = await createBookPdf(book, selectedIds, size);
  pdf.save(fileName(book.title) + '.pdf');
  return pdf.getNumberOfPages();
}
