export type StudentDirectoryExportClass = {
  class_id: string;
  class_code: string | null;
  class_name: string;
  program_id: string | null;
  program_code: string | null;
  program_name: string | null;
  teacher_id: string | null;
  teacher_name: string;
  enrollment_status: 'active' | 'paused' | 'completed' | 'cancelled';
  joined_at: string;
};

export type StudentDirectoryExportSourceRow = {
  student_id: string;
  full_name: string | null;
  nickname: string | null;
  academic_status: 'active' | 'inactive' | 'alumni';
  account_status: 'active' | 'pending' | 'blocked';
  joined_at: string | null;
  class_history_count: number;
  active_classes: StudentDirectoryExportClass[];
};

export type StudentDirectoryExportPage = {
  rows: StudentDirectoryExportSourceRow[];
  pagination: {
    page: number;
    page_size: number;
    total_rows: number;
    total_pages: number;
  };
};

export type StudentDirectoryExportMetadata = {
  academicStatus: string;
  program: string;
  className: string;
  teacher: string;
  search: string;
  sort: string;
  exportedAt: Date;
};

type CellValue = string | number;

const ACADEMIC_STATUS_LABELS: Record<StudentDirectoryExportSourceRow['academic_status'], string> = {
  active: 'Aktif',
  inactive: 'Nonaktif',
  alumni: 'Alumni',
};

const ACCOUNT_STATUS_LABELS: Record<StudentDirectoryExportSourceRow['account_status'], string> = {
  active: 'Aktif',
  pending: 'Menunggu Approval',
  blocked: 'Diblokir',
};

const EXPORT_HEADERS = [
  'No',
  'Nama Lengkap',
  'Nama Panggilan',
  'Status Akademik',
  'Status Akun',
  'Jumlah Kelas Aktif',
  'Program Aktif',
  'Kelas Aktif',
  'Pengajar Utama',
  'Tanggal Bergabung',
  'Jumlah Riwayat Kelas',
] as const;

const COLUMN_WIDTHS = [6, 28, 22, 18, 21, 18, 32, 34, 30, 20, 22] as const;

function jakartaDateParts(date: Date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? '';
  return { year: get('year'), month: get('month'), day: get('day') };
}

function exportDateStamp(date: Date) {
  const { year, month, day } = jakartaDateParts(date);
  return `${year}-${month}-${day}`;
}

function formatDate(value: string | null | undefined) {
  if (!value) return '—';
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) return value;
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(parsed);
}

function formatExportedAt(date: Date) {
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

function uniqueOrdered(values: Array<string | null | undefined>, fallback = '—') {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const rawValue of values) {
    const value = rawValue?.trim();
    if (!value || seen.has(value)) continue;
    seen.add(value);
    result.push(value);
  }
  return result.length > 0 ? result.join('; ') : fallback;
}

export function buildStudentDirectoryExportRows(rows: StudentDirectoryExportSourceRow[]): CellValue[][] {
  return rows.map((row, index) => {
    const activeClasses = row.active_classes ?? [];
    return [
      index + 1,
      row.full_name?.trim() || row.nickname?.trim() || 'Siswa KOJAC',
      row.nickname?.trim() || '—',
      ACADEMIC_STATUS_LABELS[row.academic_status],
      ACCOUNT_STATUS_LABELS[row.account_status],
      activeClasses.length,
      uniqueOrdered(activeClasses.map((item) => item.program_name)),
      uniqueOrdered(activeClasses.map((item) => item.class_name)),
      uniqueOrdered(activeClasses.map((item) => item.teacher_name), 'Belum ditentukan'),
      formatDate(row.joined_at),
      row.class_history_count,
    ];
  });
}

function csvEscape(value: CellValue) {
  let text = String(value);
  if (typeof value === 'string' && /^[=+\-@]/.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function buildStudentDirectoryCsv(rows: StudentDirectoryExportSourceRow[]) {
  const body = [
    [...EXPORT_HEADERS],
    ...buildStudentDirectoryExportRows(rows),
  ]
    .map((row) => row.map(csvEscape).join(','))
    .join('\r\n');
  return `\uFEFF${body}`;
}

export async function collectAllFilteredStudentRows(
  fetchPage: (page: number, pageSize: 100) => Promise<StudentDirectoryExportPage>,
) {
  const pageSize = 100 as const;
  const firstPage = await fetchPage(1, pageSize);
  const expectedTotalRows = firstPage.pagination.total_rows;
  const expectedTotalPages = firstPage.pagination.total_pages;

  if (expectedTotalRows === 0) return [];

  const seen = new Set<string>();
  const result: StudentDirectoryExportSourceRow[] = [];

  const appendPage = (page: StudentDirectoryExportPage) => {
    if (
      page.pagination.total_rows !== expectedTotalRows
      || page.pagination.total_pages !== expectedTotalPages
    ) {
      throw new Error('directory_changed_during_export');
    }
    for (const row of page.rows) {
      if (seen.has(row.student_id)) continue;
      seen.add(row.student_id);
      result.push(row);
    }
  };

  appendPage(firstPage);

  for (let pageNumber = 2; pageNumber <= expectedTotalPages; pageNumber += 1) {
    const page = await fetchPage(pageNumber, pageSize);
    appendPage(page);
  }

  if (result.length !== expectedTotalRows) {
    throw new Error('directory_export_row_count_mismatch');
  }

  return result;
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function downloadStudentDirectoryCsv(rows: StudentDirectoryExportSourceRow[], exportedAt = new Date()) {
  const csv = buildStudentDirectoryCsv(rows);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  downloadBlob(blob, `KOJAC_Data_Siswa_${exportDateStamp(exportedAt)}.csv`);
}

function sanitizeXmlText(value: string) {
  return value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');
}

function escapeXml(value: string) {
  return sanitizeXmlText(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function columnName(index: number) {
  let number = index;
  let result = '';
  while (number > 0) {
    const remainder = (number - 1) % 26;
    result = String.fromCharCode(65 + remainder) + result;
    number = Math.floor((number - 1) / 26);
  }
  return result;
}

function xmlCell(value: CellValue, rowNumber: number, columnIndex: number, style = 0) {
  const ref = `${columnName(columnIndex)}${rowNumber}`;
  const styleAttribute = style > 0 ? ` s="${style}"` : '';
  if (typeof value === 'number' && Number.isFinite(value)) {
    return `<c r="${ref}"${styleAttribute}><v>${value}</v></c>`;
  }
  return `<c r="${ref}" t="inlineStr"${styleAttribute}><is><t xml:space="preserve">${escapeXml(String(value))}</t></is></c>`;
}

function buildDataSheetXml(rows: StudentDirectoryExportSourceRow[]) {
  const tableRows = buildStudentDirectoryExportRows(rows);
  const headerRowNumber = 1;
  const dataStartRow = 2;
  const finalRowNumber = Math.max(headerRowNumber, dataStartRow + tableRows.length - 1);
  const lastColumn = columnName(EXPORT_HEADERS.length);
  const sheetRows: string[] = [];

  sheetRows.push(`<row r="1" ht="22" customHeight="1">${EXPORT_HEADERS.map((header, index) => xmlCell(header, 1, index + 1, 1)).join('')}</row>`);
  tableRows.forEach((row, index) => {
    const rowNumber = dataStartRow + index;
    sheetRows.push(`<row r="${rowNumber}">${row.map((value, columnIndex) => xmlCell(value, rowNumber, columnIndex + 1)).join('')}</row>`);
  });

  const columns = COLUMN_WIDTHS.map((width, index) => `<col min="${index + 1}" max="${index + 1}" width="${width}" customWidth="1"/>`).join('');

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">\n<dimension ref="A1:${lastColumn}${finalRowNumber}"/>\n<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>\n<sheetFormatPr defaultRowHeight="15"/>\n<cols>${columns}</cols>\n<sheetData>${sheetRows.join('')}</sheetData>\n<autoFilter ref="A1:${lastColumn}${finalRowNumber}"/>\n</worksheet>`;
}

function buildInfoSheetXml(metadata: StudentDirectoryExportMetadata) {
  const infoRows: Array<[string, string]> = [
    ['Tanggal Export', formatExportedAt(metadata.exportedAt)],
    ['Status Akademik', metadata.academicStatus],
    ['Program', metadata.program],
    ['Kelas', metadata.className],
    ['Pengajar', metadata.teacher],
    ['Pencarian', metadata.search || '—'],
    ['Urutan', metadata.sort],
  ];
  const rows: string[] = [];
  rows.push(`<row r="1" ht="24" customHeight="1">${xmlCell('KOJAC — Data Siswa', 1, 1, 2)}</row>`);
  infoRows.forEach(([label, value], index) => {
    const rowNumber = index + 3;
    rows.push(`<row r="${rowNumber}">${xmlCell(label, rowNumber, 1, 1)}${xmlCell(value, rowNumber, 2)}</row>`);
  });

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">\n<dimension ref="A1:B${infoRows.length + 2}"/>\n<sheetViews><sheetView workbookViewId="0"/></sheetViews>\n<sheetFormatPr defaultRowHeight="15"/>\n<cols><col min="1" max="1" width="22" customWidth="1"/><col min="2" max="2" width="42" customWidth="1"/></cols>\n<sheetData>${rows.join('')}</sheetData>\n</worksheet>`;
}

const CONTENT_TYPES_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>`;

const ROOT_RELS_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;

const WORKBOOK_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    <sheet name="Data Siswa" sheetId="1" r:id="rId1"/>
    <sheet name="Info Export" sheetId="2" r:id="rId2"/>
  </sheets>
</workbook>`;

const WORKBOOK_RELS_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;

const STYLES_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="2">
    <font><sz val="11"/><name val="Aptos"/><family val="2"/></font>
    <font><b/><sz val="11"/><name val="Aptos"/><family val="2"/></font>
  </fonts>
  <fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>
  <borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="3">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
    <xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"><alignment vertical="center" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"><alignment vertical="center"/></xf>
  </cellXfs>
  <cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let index = 0; index < 256; index += 1) {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) {
      value = (value & 1) ? (0xedb88320 ^ (value >>> 1)) : (value >>> 1);
    }
    table[index] = value >>> 0;
  }
  return table;
})();

function crc32(bytes: Uint8Array) {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function writeUint16(view: DataView, offset: number, value: number) {
  view.setUint16(offset, value, true);
}

function writeUint32(view: DataView, offset: number, value: number) {
  view.setUint32(offset, value >>> 0, true);
}

function concatBytes(parts: Uint8Array[]) {
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const result = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    result.set(part, offset);
    offset += part.length;
  }
  return result;
}

function makeStoredZip(files: Array<{ name: string; content: string }>) {
  const encoder = new TextEncoder();
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let localOffset = 0;

  for (const file of files) {
    const nameBytes = encoder.encode(file.name);
    const dataBytes = encoder.encode(file.content);
    const checksum = crc32(dataBytes);

    const localHeader = new Uint8Array(30);
    const localView = new DataView(localHeader.buffer);
    writeUint32(localView, 0, 0x04034b50);
    writeUint16(localView, 4, 20);
    writeUint16(localView, 6, 0);
    writeUint16(localView, 8, 0);
    writeUint16(localView, 10, 0);
    writeUint16(localView, 12, 0);
    writeUint32(localView, 14, checksum);
    writeUint32(localView, 18, dataBytes.length);
    writeUint32(localView, 22, dataBytes.length);
    writeUint16(localView, 26, nameBytes.length);
    writeUint16(localView, 28, 0);
    localParts.push(localHeader, nameBytes, dataBytes);

    const centralHeader = new Uint8Array(46);
    const centralView = new DataView(centralHeader.buffer);
    writeUint32(centralView, 0, 0x02014b50);
    writeUint16(centralView, 4, 20);
    writeUint16(centralView, 6, 20);
    writeUint16(centralView, 8, 0);
    writeUint16(centralView, 10, 0);
    writeUint16(centralView, 12, 0);
    writeUint16(centralView, 14, 0);
    writeUint32(centralView, 16, checksum);
    writeUint32(centralView, 20, dataBytes.length);
    writeUint32(centralView, 24, dataBytes.length);
    writeUint16(centralView, 28, nameBytes.length);
    writeUint16(centralView, 30, 0);
    writeUint16(centralView, 32, 0);
    writeUint16(centralView, 34, 0);
    writeUint16(centralView, 36, 0);
    writeUint32(centralView, 38, 0);
    writeUint32(centralView, 42, localOffset);
    centralParts.push(centralHeader, nameBytes);

    localOffset += localHeader.length + nameBytes.length + dataBytes.length;
  }

  const centralDirectory = concatBytes(centralParts);
  const localData = concatBytes(localParts);
  const endRecord = new Uint8Array(22);
  const endView = new DataView(endRecord.buffer);
  writeUint32(endView, 0, 0x06054b50);
  writeUint16(endView, 4, 0);
  writeUint16(endView, 6, 0);
  writeUint16(endView, 8, files.length);
  writeUint16(endView, 10, files.length);
  writeUint32(endView, 12, centralDirectory.length);
  writeUint32(endView, 16, localData.length);
  writeUint16(endView, 20, 0);

  return concatBytes([localData, centralDirectory, endRecord]);
}

export function buildStudentDirectoryXlsx(
  rows: StudentDirectoryExportSourceRow[],
  metadata: StudentDirectoryExportMetadata,
) {
  return makeStoredZip([
    { name: '[Content_Types].xml', content: CONTENT_TYPES_XML },
    { name: '_rels/.rels', content: ROOT_RELS_XML },
    { name: 'xl/workbook.xml', content: WORKBOOK_XML },
    { name: 'xl/_rels/workbook.xml.rels', content: WORKBOOK_RELS_XML },
    { name: 'xl/styles.xml', content: STYLES_XML },
    { name: 'xl/worksheets/sheet1.xml', content: buildDataSheetXml(rows) },
    { name: 'xl/worksheets/sheet2.xml', content: buildInfoSheetXml(metadata) },
  ]);
}

export function downloadStudentDirectoryXlsx(
  rows: StudentDirectoryExportSourceRow[],
  metadata: StudentDirectoryExportMetadata,
) {
  const bytes = buildStudentDirectoryXlsx(rows, metadata);
  const blob = new Blob([bytes], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  downloadBlob(blob, `KOJAC_Data_Siswa_${exportDateStamp(metadata.exportedAt)}.xlsx`);
}
