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
  BorderStyle
} from 'docx';
import { saveAs } from 'file-saver';

function parseToTextRuns(node: Node): TextRun[] {
  const runs: TextRun[] = [];
  
  node.childNodes.forEach(child => {
    if (child.nodeType === Node.TEXT_NODE) {
      if (child.textContent) {
        runs.push(new TextRun({ text: child.textContent }));
      }
    } else if (child.nodeType === Node.ELEMENT_NODE) {
      const el = child as HTMLElement;
      const tag = el.tagName.toLowerCase();
      const bold = tag === 'strong' || tag === 'b';
      const italics = tag === 'em' || tag === 'i';
      
      const subRuns = parseToTextRuns(el);
      subRuns.forEach(run => {
        if (bold) (run as any).bold = true;
        if (italics) (run as any).italics = true;
        runs.push(run);
      });
      
      if (subRuns.length === 0 && el.textContent) {
        runs.push(new TextRun({ 
          text: el.textContent, 
          bold: bold || undefined, 
          italics: italics || undefined 
        }));
      }
    }
  });
  
  return runs.length > 0 ? runs : [new TextRun('')];
}

export async function exportToDocx(htmlContent: string, fileName: string = 'converted-document.docx') {
  const parser = new DOMParser();
  const docHtml = parser.parseFromString(htmlContent, 'text/html');
  const elements = docHtml.body.childNodes;
  
  const children: (Paragraph | Table)[] = [];

  elements.forEach((node) => {
    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as HTMLElement;
      const tagName = el.tagName.toLowerCase();
      
      if (tagName === 'h1' || tagName === 'h2' || tagName === 'h3' || tagName === 'h4') {
        const level = tagName === 'h1' ? HeadingLevel.HEADING_1 : 
                     tagName === 'h2' ? HeadingLevel.HEADING_2 : 
                     HeadingLevel.HEADING_3;

        children.push(new Paragraph({
          text: el.textContent || '',
          heading: level,
          spacing: { before: 400, after: 200 }
        }));
      } else if (tagName === 'p') {
        children.push(new Paragraph({
          children: parseToTextRuns(el),
          spacing: { line: 360, after: 200 }
        }));
      } else if (tagName === 'ul' || tagName === 'ol') {
        Array.from(el.children).forEach(li => {
          children.push(new Paragraph({
            children: parseToTextRuns(li),
            bullet: tagName === 'ul' ? { level: 0 } : undefined,
            numbering: tagName === 'ol' ? { reference: 'my-numbering-ref', level: 0 } : undefined,
            spacing: { after: 100 }
          }));
        });
      } else if (tagName === 'table') {
        const rows = Array.from(el.querySelectorAll('tr')).map(tr => {
          const cells = Array.from(tr.querySelectorAll('td, th')).map(td => {
            return new TableCell({
              children: [new Paragraph({ children: parseToTextRuns(td) })],
              width: { size: 100 / (tr.children.length || 1), type: WidthType.PERCENTAGE },
              borders: {
                top: { style: BorderStyle.SINGLE, size: 1, color: "E2E8F0" },
                bottom: { style: BorderStyle.SINGLE, size: 1, color: "E2E8F0" },
                left: { style: BorderStyle.SINGLE, size: 1, color: "E2E8F0" },
                right: { style: BorderStyle.SINGLE, size: 1, color: "E2E8F0" },
              }
            });
          });
          return new TableRow({ children: cells });
        });

        children.push(new Table({
          rows: rows,
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: {
            top: { style: BorderStyle.SINGLE, size: 2, color: "CBD5E1" },
            bottom: { style: BorderStyle.SINGLE, size: 2, color: "CBD5E1" },
            left: { style: BorderStyle.SINGLE, size: 2, color: "CBD5E1" },
            right: { style: BorderStyle.SINGLE, size: 2, color: "CBD5E1" },
          }
        }));
      } else if (tagName === 'img') {
        children.push(new Paragraph({
          children: [
            new TextRun({ 
              text: `[IMAGE: ${el.getAttribute('alt') || 'No description'}]`, 
              color: "94A3B8",
              italics: true
            })
          ],
          spacing: { before: 200, after: 200 }
        }));
      }
    }
  });

  const docFile = new Document({
    sections: [{
      properties: {},
      children: children,
    }],
  });

  const blob = await Packer.toBlob(docFile);
  saveAs(blob, fileName);
}
