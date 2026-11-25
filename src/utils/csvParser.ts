import { RawSheetResponse } from '../types/sales';

/**
 * Parses an RFC-4180 CSV string (supporting \r\n, \n, UTF-8 BOM, quoted fields,
 * embedded commas/newlines, and escaped double quotes "") into RawSheetResponse.
 */
export function parseCsvToSheetResponse(
  csvText: string,
  sheetName = 'Case 1. Metro Superstore Sales'
): RawSheetResponse {
  const cleanText = csvText.charCodeAt(0) === 0xfeff ? csvText.slice(1) : csvText;
  const records: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;

  for (let i = 0; i < cleanText.length; i++) {
    const ch = cleanText[i];

    if (inQuotes) {
      if (ch === '"') {
        if (cleanText[i + 1] === '"') {
          currentField += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        currentField += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      currentRow.push(currentField);
      currentField = '';
    } else if (ch === '\r') {
      if (cleanText[i + 1] === '\n') {
        i++;
      }
      currentRow.push(currentField);
      if (currentRow.some((cell) => cell.trim() !== '')) {
        records.push(currentRow);
      }
      currentRow = [];
      currentField = '';
    } else if (ch === '\n') {
      currentRow.push(currentField);
      if (currentRow.some((cell) => cell.trim() !== '')) {
        records.push(currentRow);
      }
      currentRow = [];
      currentField = '';
    } else {
      currentField += ch;
    }
  }

  // Flush final line if there is trailing content without a final newline
  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField);
    if (currentRow.some((cell) => cell.trim() !== '')) {
      records.push(currentRow);
    }
  }

  if (records.length === 0) {
    return {
      ok: true,
      sheet: sheetName,
      updatedAt: new Date().toISOString(),
      rowCount: 0,
      headers: [],
      rows: [],
    };
  }

  const headers = records[0].map((h) => h.trim());
  const rows: Record<string, unknown>[] = [];

  for (let r = 1; r < records.length; r++) {
    const values = records[r];
    const rowObj: Record<string, unknown> = {};
    for (let c = 0; c < headers.length; c++) {
      const header = headers[c];
      if (!header) continue;
      rowObj[header] = values[c] ?? '';
    }
    rows.push(rowObj);
  }

  return {
    ok: true,
    sheet: sheetName,
    updatedAt: new Date().toISOString(),
    rowCount: rows.length,
    headers,
    rows,
  };
}
