// src/utils/pdfParser.js
import * as pdfjs from 'pdfjs-dist';

// Manually set worker URL to a CDN version compatible with the installed package version (3.4.120)
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@3.4.120/build/pdf.worker.min.js`;

/**
 * Extracts text content from a PDF file object.
 * @param {File} file - The PDF file object.
 * @returns {Promise<string>} A promise that resolves with the extracted text content.
 * @throws {Error} If parsing fails.
 */
export async function extractTextFromPDF(file) {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    const numPages = pdf.numPages;
    const textPages = [];

    for (let i = 1; i <= numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      // Join items, handling potential undefined strings and ensuring spaces
      const pageText = textContent.items.map(item => item.str || '').join(' ');
      textPages.push(pageText);
      // Clean up page data to free memory (important for large PDFs)
      page.cleanup();
    }

    // Join pages with double newlines to preserve some structure
    return textPages.join('\n\n');
  } catch (error) {
    console.error('Error parsing PDF:', error);
    // Provide a more specific error message if possible
    const message = error.message || 'Unknown PDF parsing error';
    throw new Error(`Failed to parse PDF (${file.name}): ${message}`);
  }
}

/**
 * Checks if a given file object is likely a PDF based on type or name.
 * @param {File} file - The file object to check.
 * @returns {boolean} True if the file is likely a PDF, false otherwise.
 */
export function isPDF(file) {
  if (!file) return false;
  return file.type === 'application/pdf' || file.name?.toLowerCase().endsWith('.pdf');
}