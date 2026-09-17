export type ClassRecapExportSubstitute = {
  teacher_name: string;
  starts_on: string;
  ends_on: string;
};

export type ClassRecapExportRow = {
  program_code: string | null;
  program_name: string | null;
  class_code: string | null;
  class_name: string;
  class_status: 'planned' | 'active' | 'completed' | 'cancelled';
  primary_teacher_name: string;
  starts_on: string | null;
  ends_on: string | null;
  student_active_count: number;
  student_paused_count: number;
  report_count: number;
  last_report_date: string | null;
  last_report_teacher_name: string | null;
  active_substitutes: ClassRecapExportSubstitute[];
};

export type ClassRecapExportMetadata = {
  reportPeriod: string;
  program: string;
  className: string;
  teacher: string;
  status: string;
  search: string;
  exportedAt: Date;
};

type CellValue = string | number;

const STATUS_LABELS: Record<ClassRecapExportRow['class_status'], string> = {
  planned: 'Direncanakan',
  active: 'Aktif',
  completed: 'Selesai',
  cancelled: 'Dibatalkan',
};

const EXPORT_HEADERS = [
  'No',
  'Program',
  'Kode Program',
  'Nama Kelas',
  'Kode Kelas',
  'Status Kelas',
  'Pengajar Utama',
  'Periode Kelas',
  'Siswa Aktif',
  'Siswa Dijeda',
  'Jumlah Laporan',
  'Tanggal Laporan Terakhir',
  'Pengajar Laporan Terakhir',
  'Pengajar Pengganti Aktif',
  'Periode Pengganti',
] as const;

const COLUMN_WIDTHS = [6, 24, 15, 27, 16, 16, 24, 27, 12, 12, 15, 22, 26, 30, 34] as const;

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
  const normalized = value.includes('T') ? value : `${value}T00:00:00+07:00`;
  const parsed = new Date(normalized);
  if (!Number.isFinite(parsed.getTime())) return value;
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(parsed);
}

function formatPeriod(start: string | null | undefined, end: string | null | undefined) {
  if (!start && !end) return 'Belum ditentukan';
  if (start && end) return `${formatDate(start)} – ${formatDate(end)}`;
  if (start) return `Mulai ${formatDate(start)}`;
  return `Sampai ${formatDate(end)}`;
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

export function buildClassRecapExportRows(rows: ClassRecapExportRow[]): CellValue[][] {
  return rows.map((row, index) => {
    const substitutes = row.active_substitutes ?? [];
    const substituteNames = substitutes.length > 0
      ? substitutes.map((item) => item.teacher_name).join('; ')
      : '—';
    const substitutePeriods = substitutes.length > 0
      ? substitutes.map((item) => formatPeriod(item.starts_on, item.ends_on)).join('; ')
      : '—';

    return [
      index + 1,
      row.program_name || '—',
      row.program_code || '—',
      row.class_name,
      row.class_code || '—',
      STATUS_LABELS[row.class_status],
      row.primary_teacher_name || 'Belum ditentukan',
      formatPeriod(row.starts_on, row.ends_on),
      row.student_active_count,
      row.student_paused_count,
      row.report_count,
      row.last_report_date ? formatDate(row.last_report_date) : '—',
      row.last_report_teacher_name || '—',
      substituteNames,
      substitutePeriods,
    ];
  });
}

function csvEscape(value: CellValue) {
  let text = String(value);
  if (typeof value === 'string' && /^[=+\-@]/.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function buildClassRecapCsv(rows: ClassRecapExportRow[]) {
  const body = [
    [...EXPORT_HEADERS],
    ...buildClassRecapExportRows(rows),
  ]
    .map((row) => row.map(csvEscape).join(','))
    .join('\r\n');

  return `\uFEFF${body}`;
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

export function downloadClassRecapCsv(rows: ClassRecapExportRow[], exportedAt = new Date()) {
  const csv = buildClassRecapCsv(rows);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  downloadBlob(blob, `KOJAC_Rekap_Kelas_${exportDateStamp(exportedAt)}.csv`);
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

function buildSheetXml(rows: ClassRecapExportRow[], metadata: ClassRecapExportMetadata) {
  const tableRows = buildClassRecapExportRows(rows);
  const metaRows: Array<[string, string]> = [
    ['Periode laporan', metadata.reportPeriod],
    ['Tanggal Export', formatExportedAt(metadata.exportedAt)],
    ['Program', metadata.program],
    ['Kelas', metadata.className],
    ['Pengajar', metadata.teacher],
    ['Status', metadata.status],
    ['Pencarian', metadata.search || '—'],
  ];
  const headerRowNumber = metaRows.length + 3;
  const dataStartRow = headerRowNumber + 1;
  const finalRowNumber = Math.max(headerRowNumber, dataStartRow + tableRows.length - 1);
  const lastColumn = columnName(EXPORT_HEADERS.length);

  const sheetRows: string[] = [];
  sheetRows.push(`<row r="1" ht="24" customHeight="1">${xmlCell('KOJAC — Rekap Kelas', 1, 1, 2)}</row>`);
  metaRows.forEach(([label, value], index) => {
    const rowNumber = index + 2;
    sheetRows.push(`<row r="${rowNumber}">${xmlCell(label, rowNumber, 1, 1)}${xmlCell(value, rowNumber, 2)}</row>`);
  });
  sheetRows.push(`<row r="${headerRowNumber}">${EXPORT_HEADERS.map((header, index) => xmlCell(header, headerRowNumber, index + 1, 1)).join('')}</row>`);
  tableRows.forEach((row, index) => {
    const rowNumber = dataStartRow + index;
    sheetRows.push(`<row r="${rowNumber}">${row.map((value, columnIndex) => xmlCell(value, rowNumber, columnIndex + 1)).join('')}</row>`);
  });

  const columns = COLUMN_WIDTHS.map((width, index) => `<col min="${index + 1}" max="${index + 1}" width="${width}" customWidth="1"/>`).join('');

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">\n<dimension ref="A1:${lastColumn}${finalRowNumber}"/>\n<sheetViews><sheetView workbookViewId="0"><pane ySplit="${headerRowNumber}" topLeftCell="A${dataStartRow}" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>\n<sheetFormatPr defaultRowHeight="15"/>\n<cols>${columns}</cols>\n<sheetData>${sheetRows.join('')}</sheetData>\n<autoFilter ref="A${headerRowNumber}:${lastColumn}${finalRowNumber}"/>\n</worksheet>`;
}

const CONTENT_TYPES_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>`;

const ROOT_RELS_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;

const WORKBOOK_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets><sheet name="Rekap Kelas" sheetId="1" r:id="rId1"/></sheets>
</workbook>`;

const WORKBOOK_RELS_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
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

export function buildClassRecapXlsx(rows: ClassRecapExportRow[], metadata: ClassRecapExportMetadata) {
  const sheetXml = buildSheetXml(rows, metadata);
  return makeStoredZip([
    { name: '[Content_Types].xml', content: CONTENT_TYPES_XML },
    { name: '_rels/.rels', content: ROOT_RELS_XML },
    { name: 'xl/workbook.xml', content: WORKBOOK_XML },
    { name: 'xl/_rels/workbook.xml.rels', content: WORKBOOK_RELS_XML },
    { name: 'xl/styles.xml', content: STYLES_XML },
    { name: 'xl/worksheets/sheet1.xml', content: sheetXml },
  ]);
}

export function downloadClassRecapXlsx(
  rows: ClassRecapExportRow[],
  metadata: ClassRecapExportMetadata,
) {
  const bytes = buildClassRecapXlsx(rows, metadata);
  const blob = new Blob([bytes], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  downloadBlob(blob, `KOJAC_Rekap_Kelas_${exportDateStamp(metadata.exportedAt)}.xlsx`);
}
