import * as pdfjsLib from 'pdfjs-dist';
// Vite-friendly worker import
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

// Extract plain text from a PDF File/Blob in the browser
export async function extractPdfText(file) {
  const buf = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
  let text = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items.map(it => it.str).join(' ');
    text += `\n===PAGE ${i}===\n${pageText}`;
  }
  return text;
}
