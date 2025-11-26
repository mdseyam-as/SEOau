
import * as XLSX from 'xlsx';
import { KeywordRow } from '../types';

export const parseExcelFile = async (file: File): Promise<KeywordRow[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        if (!data) {
          reject(new Error("File is empty"));
          return;
        }

        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Convert to JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

        // Simple heuristic to find columns. Expecting "keyword" and "frequency" roughly.
        
        const rows: KeywordRow[] = [];
        
        const startIndex = 1; // Skip header

        for (let i = startIndex; i < jsonData.length; i++) {
          const row = jsonData[i];
          if (row && row.length >= 2) {
            const keyword = String(row[0] || '').trim();
            const frequency = Number(row[1] || 0);

            if (keyword) {
              rows.push({ keyword, frequency });
            }
          }
        }

        // Sort by frequency descending (High priority first)
        rows.sort((a, b) => b.frequency - a.frequency);

        resolve(rows);
      } catch (err) {
        reject(err);
      }
    };

    reader.onerror = (err) => reject(err);
    reader.readAsArrayBuffer(file);
  });
};

export const parseExcelToRawText = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        if (!data) {
          reject(new Error("File is empty"));
          return;
        }

        const workbook = XLSX.read(data, { type: 'array' });
        let fullText = '';

        workbook.SheetNames.forEach(sheetName => {
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
          
          if (jsonData.length > 0) {
            fullText += `--- Sheet: ${sheetName} ---\n`;
            jsonData.forEach(row => {
               fullText += row.join(' ') + '\n';
            });
            fullText += '\n';
          }
        });

        resolve(fullText);
      } catch (err) {
        reject(err);
      }
    };

    reader.onerror = (err) => reject(err);
    reader.readAsArrayBuffer(file);
  });
};
