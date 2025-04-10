// src/utils/rtfParser.js

/**
 * Extracts plain text content from an RTF file object.
 * NOTE: This is a basic parser and might not handle all RTF complexities.
 * @param {File} file - The RTF file object.
 * @returns {Promise<string>} A promise that resolves with the extracted plain text.
 * @throws {Error} If reading or parsing fails.
 */
export async function extractTextFromRTF(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
  
      reader.onload = (event) => {
        try {
          const rtfContent = event.target.result;
          // Basic RTF to text conversion logic
          let plainText = rtfContent;
  
          // Remove RTF header/control words (simplistic approach)
          plainText = plainText.replace(/\\([a-z]+)(-?\d+)?\s?/g, '');
  
          // Handle common character escapes
          plainText = plainText.replace(/\\par\s?/g, '\n'); // Paragraphs
          plainText = plainText.replace(/\\tab\s?/g, '\t'); // Tabs
          plainText = plainText.replace(/\\line\s?/g, '\n'); // Lines (less common)
          plainText = plainText.replace(/\\page\s?/g, '\n\n'); // Page breaks
          plainText = plainText.replace(/\\sect\s?/g, '\n\n'); // Sections
  
          // Handle escaped characters (e.g., \'{hh} hex codes) - CORRECTED REGEX
          plainText = plainText.replace(/\\'([0-9a-fA-F]{2})/g, (match, hex) => {
            try {
              return String.fromCharCode(parseInt(hex, 16));
            } catch {
              return ''; // Ignore if hex is invalid
            }
          });
  
          // Handle special escaped characters
          plainText = plainText.replace(/\\\\/g, '\\'); // Escaped backslash
          plainText = plainText.replace(/\\{/g, '{');   // Escaped open brace
          plainText = plainText.replace(/\\}/g, '}');   // Escaped close brace
          plainText = plainText.replace(/\\~/g, ' ');   // Non-breaking space
          plainText = plainText.replace(/\\-/g, '-');   // Optional hyphen
  
          // Remove remaining RTF artifacts (curly braces, potentially missed controls)
          plainText = plainText.replace(/[{}]/g, '');
          plainText = plainText.replace(/\\\*/g, ''); // Remove \* destinations
  
          // Trim whitespace and resolve
          resolve(plainText.trim());
        } catch (error) {
          console.error('Error parsing RTF content:', error);
          reject(new Error(`Failed to parse RTF (${file.name}): ${error.message}`));
        }
      };
  
      reader.onerror = (event) => {
        console.error('Error reading RTF file:', event.target.error);
        reject(new Error(`Failed to read RTF file (${file.name})`));
      };
  
      // Read the file as text
      reader.readAsText(file);
    });
  }
  
  /**
   * Checks if a given file object is likely an RTF file based on type or name.
   * @param {File} file - The file object to check.
   * @returns {boolean} True if the file is likely RTF, false otherwise.
   */
  export function isRTF(file) {
     if (!file) return false;
     return file.type === 'application/rtf' || file.type === 'text/rtf' || file.name?.toLowerCase().endsWith('.rtf');
  }