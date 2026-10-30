import { jsPDF } from 'jspdf';
import {
  bookDimensions,
  bookFormat,
  ptToMm,
  type BookSize,
} from './bookFormat';
import {
  type Book,
  type DocNode,
  fileName,
  chapterOpening,
  chapterNumber,
} from '../domain/book';
import {
  layoutParagraph,
  justificationGap,
  type FontStyle,
  type TextRun as Run,
  type TextLine,
} from './pdfLayout';

export type PdfFonts = Record<FontStyle, string>;
const bodySize = bookFormat.bodySize;
const bodyLeading = ptToMm(bookFormat.leading);
export type PageElement =
  | {
      kind: 'text';
      text: string;
      x: number;
      y: number;
      size: number;
      style: FontStyle;
      color: string;
      align: 'left' | 'center';
    }
  | {
      kind: 'line';
      x: number;
      y: number;
      x2: number;
      y2: number;
      width: number;
    }
  | {
      kind: 'image';
      src: string;
      x: number;
      y: number;
      width: number;
      height: number;
    };
export type BookPage = {
  chapterId?: string;
  number?: number;
  elements: PageElement[];
};
export type BookPreview = { width: number; height: number; pages: BookPage[] };
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
async function buildBook(
  book: Book,
  selectedIds: Set<string>,
  size: BookSize = 'large',
  providedFonts?: PdfFonts,
) {
  const selected = book.chapters.filter((c) => selectedIds.has(c.id));
  if (!selected.length) throw new Error('Select at least one chapter.');
  const fonts = providedFonts || (await loadFonts());
  const { width, height } = bookDimensions(size);
  const doc = new jsPDF({
    unit: 'mm',
    format: [width, height],
    compress: true,
    putOnlyUsedFonts: true,
  });
  const pages: BookPage[] = [{ elements: [] }];
  let currentChapter: string | undefined;
  const page = () => pages[doc.getCurrentPageInfo().pageNumber - 1];
  const addPage = () => {
    doc.addPage([width, height]);
    pages.push({ chapterId: currentChapter, elements: [] });
  };
  const text = (
    value: string,
    x: number,
    y: number,
    options?: { align: 'center' },
  ) => {
    page().elements.push({
      kind: 'text',
      text: value,
      x,
      y,
      size: doc.getFontSize(),
      style: doc.getFont().fontStyle as FontStyle,
      color: doc.getTextColor(),
      align: options?.align || 'left',
    });
    doc.text(value, x, y, options);
  };
  const drawLine = (x: number, y: number, x2: number, y2: number) => {
    page().elements.push({
      kind: 'line',
      x,
      y,
      x2,
      y2,
      width: doc.getLineWidth(),
    });
    doc.line(x, y, x2, y2);
  };
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
  doc.setTextColor(20);
  doc.setFontSize(25);
  const titleLines = doc.splitTextToSize(
    book.title || 'Untitled book',
    width - 36,
  ) as string[];
  let titleY = 62;
  for (const line of titleLines) {
    text(line, width / 2, titleY, { align: 'center' });
    titleY += 10;
  }
  if (book.author) {
    doc.setFontSize(12);
    for (const line of doc.splitTextToSize(
      book.author,
      width - 36,
    ) as string[]) {
      text(line, width / 2, titleY + 22, { align: 'center' });
      titleY += 7;
    }
  }
  doc.setFontSize(8);
  doc.setTextColor(125);
  text('DRAFT', width / 2, height - 26, { align: 'center' });
  // A blank verso places body page 1 on the right in a printed spread.
  addPage();
  let y = 0;
  let fontSize = bodySize;
  const left = () =>
    doc.getNumberOfPages() % 2 === 1
      ? bookFormat.innerMargin
      : bookFormat.outerMargin;
  const textWidth = width - bookFormat.innerMargin - bookFormat.outerMargin;
  const startPage = () => {
    addPage();
    y = bookFormat.top;
  };
  const measure = (run: Run) => {
    doc.setFont('BookSerif', run.style);
    doc.setFontSize(fontSize);
    return doc.getTextWidth(run.text);
  };
  const renderLine = (line: TextLine, leading: number) => {
    if (y > height - bookFormat.bottom) {
      startPage();
    }
    let x = left() + line.indent;
    const extraSpace = justificationGap(line, textWidth);
    doc.setTextColor(0);
    for (const run of line.runs) {
      doc.setFont('BookSerif', run.style);
      doc.setFontSize(fontSize);
      text(run.text, x, y);
      const span =
        doc.getTextWidth(run.text) + (/^\s+$/u.test(run.text) ? extraSpace : 0);
      if (run.underline) {
        doc.setLineWidth(0.16);
        drawLine(x, y + 0.8, x + span, y + 0.8);
      }
      if (run.strike) {
        doc.setLineWidth(0.16);
        drawLine(x, y - 1.1, x + span, y - 1.1);
      }
      x += span;
    }
    y += leading;
  };
  const openingPages = new Set<number>();
  for (const chapter of selected) {
    const opening = chapterOpening(
      chapter,
      chapterNumber(book.chapters, chapter.id),
    );
    currentChapter = chapter.id;
    startPage();
    openingPages.add(doc.getNumberOfPages());
    doc.setFont('BookSerif', 'normal');
    doc.setTextColor(105);
    doc.setFontSize(9);
    if (opening.label) text(opening.label, width / 2, 35, { align: 'center' });
    doc.setTextColor(20);
    doc.setFontSize(18);
    const titles = doc.splitTextToSize(opening.title, textWidth) as string[];
    y = 46;
    for (const title of titles) {
      text(title, width / 2, y, { align: 'center' });
      y += 7.5;
    }
    y += 9;
    const content = chapter.scenes.flatMap((s) => blocks(s.content));
    let firstParagraph = true;
    for (const block of content) {
      if (block.kind === 'rule') {
        if (y > height - 34) startPage();
        doc.setFont('BookSerif', 'normal');
        doc.setFontSize(11);
        doc.setTextColor(100);
        text('* * *', width / 2, y + 5, { align: 'center' });
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
        page().elements.push({
          kind: 'image',
          src: block.src,
          x: left() + (textWidth - iw) / 2,
          y,
          width: iw,
          height: ih,
        });
        doc.addImage(block.src, left() + (textWidth - iw) / 2, y, iw, ih);
        y += ih + 9;
        firstParagraph = true;
        continue;
      }
      fontSize = block.kind === 'heading' ? 13 : bodySize;
      const leading = block.kind === 'heading' ? (17 * 25.4) / 72 : bodyLeading;
      if (block.kind === 'heading') {
        if (y > height - 45) startPage();
        y += 4;
      }
      const lines = layoutParagraph(
        block.runs || [],
        measure,
        textWidth,
        block.kind === 'heading' || firstParagraph || block.list
          ? 0
          : bookFormat.paragraphIndent,
      );
      for (let index = 0; index < lines.length; index++) {
        // Keep at least two paragraph lines together at either side of a page break.
        const remaining =
          Math.floor((height - bookFormat.bottom - y) / leading) + 1;
        if (
          remaining < 1 ||
          (index === 0 && remaining === 2 && lines.length === 3) ||
          (remaining === 1 &&
            lines.length - index >= 2 &&
            (index === 0 || lines.length - index === 2))
        )
          startPage();
        renderLine(
          block.kind === 'heading'
            ? { ...lines[index], justify: false }
            : lines[index],
          leading,
        );
      }
      if (block.kind === 'heading') y += 4;
      firstParagraph = block.kind === 'heading';
    }
  }
  const totalPages = doc.getNumberOfPages();
  for (let page = 3; page <= totalPages; page++) {
    doc.setPage(page);
    pages[page - 1].number = page - 2;
    doc.setFont('BookSerif', 'normal');
    doc.setTextColor(105);
    doc.setFontSize(8.5);
    text(String(page - 2), width / 2, height - 12, { align: 'center' });
    if (!openingPages.has(page)) {
      doc.setFontSize(8);
      const runningTitle = doc.splitTextToSize(book.title, textWidth)[0];
      text(runningTitle, width / 2, 13, { align: 'center' });
    }
  }
  return { pdf: doc, preview: { width, height, pages } satisfies BookPreview };
}
export async function createBookPdf(
  book: Book,
  selectedIds: Set<string>,
  size: BookSize = 'large',
  fonts?: PdfFonts,
) {
  return (await buildBook(book, selectedIds, size, fonts)).pdf;
}
export async function createBookPreview(
  book: Book,
  selectedIds: Set<string>,
  size: BookSize = 'large',
  fonts?: PdfFonts,
) {
  return (await buildBook(book, selectedIds, size, fonts)).preview;
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
