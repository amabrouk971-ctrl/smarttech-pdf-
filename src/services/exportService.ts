import { jsPDF } from 'jspdf';
import pptxgen from 'pptxgenjs';
import { 
  Document, 
  Packer, 
  Paragraph, 
  TextRun, 
  HeadingLevel, 
  Table, 
  TableRow, 
  TableCell, 
  WidthType,
  BorderStyle,
  ImageRun
} from 'docx';
import { saveAs } from 'file-saver';
import { toPng, toJpeg } from 'html-to-image';
import JSZip from 'jszip';

export type ExportFormat = 'pdf' | 'docx' | 'pptx' | 'png' | 'jpeg' | 'zip';

export interface ExportOptions {
  fileName: string;
  format: ExportFormat;
  quality?: number; // 0-1
  resolution?: number; // scale factor
  includeImages?: boolean;
}

export async function exportContent(
  content: string, 
  options: ExportOptions, 
  elementRef?: HTMLElement
) {
  const { fileName, format, quality = 0.95, resolution = 2 } = options;
  const fullFileName = `${fileName}.${format}`;

  switch (format) {
    case 'pdf':
      await exportToPdf(content, fullFileName, elementRef, resolution);
      break;
    case 'docx':
      await exportToDocx(content, fullFileName);
      break;
    case 'pptx':
      await exportToPptx(content, fullFileName);
      break;
    case 'png':
    case 'jpeg':
      if (elementRef) {
        await exportToImage(elementRef, fullFileName, format, quality, resolution);
      }
      break;
    default:
      throw new Error(`Unsupported format: ${format}`);
  }
}

async function exportToPdf(html: string, fileName: string, element?: HTMLElement, scale: number = 2) {
  const pdf = new jsPDF('p', 'mm', 'a4');
  
  if (element) {
    const dataUrl = await toPng(element, { quality: 1, pixelRatio: scale });
    const imgProps = pdf.getImageProperties(dataUrl);
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
    pdf.addImage(dataUrl, 'PNG', 0, 0, pdfWidth, pdfHeight);
  } else {
    // Basic text fallback if no element provided
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    pdf.text(doc.body.innerText, 10, 10);
  }
  
  pdf.save(fileName);
}

async function exportToImage(element: HTMLElement, fileName: string, format: 'png' | 'jpeg', quality: number, scale: number) {
  const options = { quality, pixelRatio: scale, backgroundColor: '#ffffff' };
  const dataUrl = format === 'png' ? await toPng(element, options) : await toJpeg(element, options);
  saveAs(dataUrl, fileName);
}

async function exportToPptx(html: string, fileName: string) {
  const pres = new pptxgen();
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  
  // Create an intro slide
  let slide = pres.addSlide();
  slide.addText(fileName.replace('.pptx', ''), { x: 1, y: 2, w: '80%', h: 1, fontSize: 36, bold: true, align: 'center' });

  // Add slides for each section (heading followed by text)
  const elements = doc.body.childNodes;
  let currentTitle = "Content";
  let currentContent = "";

  elements.forEach((node) => {
    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as HTMLElement;
      const tag = el.tagName.toLowerCase();

      if (tag === 'h1' || tag === 'h2') {
        if (currentContent) {
           addContentSlide(pres, currentTitle, currentContent);
        }
        currentTitle = el.textContent || "Section";
        currentContent = "";
      } else {
        currentContent += (el.textContent || "") + "\n\n";
      }
    }
  });

  if (currentContent || currentTitle) {
    addContentSlide(pres, currentTitle, currentContent);
  }

  pres.writeFile({ fileName });
}

function addContentSlide(pres: pptxgen, title: string, content: string) {
  const slide = pres.addSlide();
  slide.addText(title, { x: 0.5, y: 0.5, w: '90%', h: 0.5, fontSize: 24, bold: true, color: '363636' });
  slide.addText(content.substring(0, 1000), { x: 0.5, y: 1.2, w: '90%', h: 4, fontSize: 14, color: '666666' });
}

async function exportToDocx(html: string, fileName: string) {
  const parser = new DOMParser();
  const docHtml = parser.parseFromString(html, 'text/html');
  const elements = docHtml.body.childNodes;
  
  const children: (Paragraph | Table)[] = [];

  for (const node of Array.from(elements)) {
    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as HTMLElement;
      const tagName = el.tagName.toLowerCase();
      
      if (tagName === 'h1' || tagName === 'h2' || tagName === 'h3') {
        children.push(new Paragraph({
          text: el.textContent || '',
          heading: tagName === 'h1' ? HeadingLevel.HEADING_1 : HeadingLevel.HEADING_2,
          spacing: { before: 400, after: 200 }
        }));
      } else if (tagName === 'p') {
        children.push(new Paragraph({
          children: await parseToDocxRuns(el),
          spacing: { line: 360, after: 200 }
        }));
      } else if (tagName === 'table') {
        // Table logic here (similar to existing)
      }
    }
  }

  const docFile = new Document({
    sections: [{ children }],
  });

  const blob = await Packer.toBlob(docFile);
  saveAs(blob, fileName);
}

async function parseToDocxRuns(node: HTMLElement): Promise<TextRun[]> {
  // Simplification for the example, can be more complex to handle all tags
  return [new TextRun({ text: node.textContent || '' })];
}

export async function batchExport(records: { fileName: string, content: string }[], options: ExportOptions) {
  const zip = new JSZip();
  const folder = zip.folder("exports");
  
  if (!folder) return;

  // Since we are in a web env, we can only easily batch export as HTML or text inside the zip 
  // unless we generate each file separately and add to zip.
  for (const record of records) {
    folder.file(`${record.fileName}.html`, record.content);
  }
  
  const blob = await zip.generateAsync({ type: "blob" });
  saveAs(blob, `${options.fileName}.zip`);
}
