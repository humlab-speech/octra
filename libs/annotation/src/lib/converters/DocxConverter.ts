import { OAudiofile } from '@octra/media';
import { OAnnotJSON, OSegment } from '../annotjson';
import { ExportCategory } from './Converter';
import { Converter, ExportResult, IFile, ImportResult, OctraAnnotationFormatType } from './Converter';
import { WordApplication } from './SupportedApplications';

export class DocxConverter extends Converter {
  override _name: OctraAnnotationFormatType = 'DOCX';
  override _category: ExportCategory = 'general';

  public override options: {
    mode: 'separate' | 'continuous';
    addTimestamps: boolean;
  } = {
    mode: 'separate',
    addTimestamps: false,
  };

  public constructor() {
    super();
    this._applications = [{ application: new WordApplication(), recommended: true }];
    this._extensions = ['.docx'];
    this._conversion = { export: true, import: false };
    this._encoding = 'binary';
    this._multitiers = false;
  }

  export(annotation: OAnnotJSON, audiofile: OAudiofile, levelnum = 0): ExportResult {
    const level = annotation.levels[levelnum];
    if (!level) {
      return { error: `Level ${levelnum} not found` };
    }

    const segments = level.items as OSegment[];
    const paragraphs: string[] = [];

    if (this.options.mode === 'separate') {
      for (const seg of segments) {
        const text = seg.labels?.[0]?.value ?? '';
        if (!text.trim()) continue;
        const prefix = this.options.addTimestamps
          ? `[${this.msToTimeString(Math.round((seg.sampleStart / audiofile.sampleRate) * 1000))}] `
          : '';
        paragraphs.push(prefix + text.trim());
      }
    } else {
      // continuous
      const parts: string[] = [];
      for (const seg of segments) {
        const text = seg.labels?.[0]?.value ?? '';
        if (!text.trim()) continue;
        if (this.options.addTimestamps) {
          parts.push(
            `[${this.msToTimeString(Math.round((seg.sampleStart / audiofile.sampleRate) * 1000))}] ${text.trim()}`,
          );
        } else {
          parts.push(text.trim());
        }
      }
      if (parts.length > 0) {
        paragraphs.push(parts.join(' '));
      }
    }

    const docxBytes = this.buildDocx(paragraphs);
    const baseName = audiofile.name.replace(/\.[^.]+$/, '');

    const file: IFile = {
      name: `${baseName}.docx`,
      content: docxBytes as unknown as string, // binary Uint8Array
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      encoding: 'binary',
    };
    return { file };
  }

  import(_file: IFile, _audiofile: OAudiofile): ImportResult {
    return { error: 'DOCX import not supported' };
  }

  needsOptionsForImport(_file: IFile, _audiofile: OAudiofile): undefined {
    return undefined;
  }

  private msToTimeString(ms: number): string {
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    return `${this.pad(h)}:${this.pad(m)}:${this.pad(s)}`;
  }

  private pad(n: number): string {
    return n.toString().padStart(2, '0');
  }

  private escapeXml(s: string): string {
    return s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  private buildDocx(paragraphs: string[]): Uint8Array {
    const enc = new TextEncoder();

    const contentTypes = enc.encode(
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
        '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
        '<Default Extension="xml" ContentType="application/xml"/>' +
        '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>' +
        '</Types>',
    );

    const rels = enc.encode(
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>' +
        '</Relationships>',
    );

    const wordRels = enc.encode(
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        '</Relationships>',
    );

    const wordSettings = enc.encode(
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<w:settings xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
        '<w:defaultTabStop w:val="720"/>' +
        '</w:settings>',
    );

    const paras = paragraphs
      .map(
        (p) =>
          `<w:p><w:r><w:t xml:space="preserve">${this.escapeXml(p)}</w:t></w:r></w:p>`,
      )
      .join('');

    const document = enc.encode(
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
        '<w:body>' +
        paras +
        '<w:sectPr/>' +
        '</w:body>' +
        '</w:document>',
    );

    return buildZip([
      { name: '[Content_Types].xml', data: contentTypes },
      { name: '_rels/.rels', data: rels },
      { name: 'word/_rels/document.xml.rels', data: wordRels },
      { name: 'word/settings.xml', data: wordSettings },
      { name: 'word/document.xml', data: document },
    ]);
  }
}

// --- Minimal STORED ZIP builder (no external deps) ---

function buildZip(files: { name: string; data: Uint8Array }[]): Uint8Array {
  const enc = new TextEncoder();
  const localParts: Uint8Array[] = [];
  const cdParts: Uint8Array[] = [];
  let offset = 0;

  for (const file of files) {
    const nameBytes = enc.encode(file.name);
    const crc = crc32bytes(file.data);
    const size = file.data.length;

    const local = new Uint8Array(30 + nameBytes.length);
    const lv = new DataView(local.buffer);
    lv.setUint32(0, 0x04034b50, true);
    lv.setUint16(4, 20, true);
    lv.setUint16(6, 0, true);
    lv.setUint16(8, 0, true); // STORED
    lv.setUint16(10, 0, true);
    lv.setUint16(12, 0, true);
    lv.setUint32(14, crc, true);
    lv.setUint32(18, size, true);
    lv.setUint32(22, size, true);
    lv.setUint16(26, nameBytes.length, true);
    lv.setUint16(28, 0, true);
    local.set(nameBytes, 30);
    localParts.push(local, file.data);

    const cd = new Uint8Array(46 + nameBytes.length);
    const cv = new DataView(cd.buffer);
    cv.setUint32(0, 0x02014b50, true);
    cv.setUint16(4, 20, true);
    cv.setUint16(6, 20, true);
    cv.setUint16(8, 0, true);
    cv.setUint16(10, 0, true); // STORED
    cv.setUint16(12, 0, true);
    cv.setUint16(14, 0, true);
    cv.setUint32(16, crc, true);
    cv.setUint32(20, size, true);
    cv.setUint32(24, size, true);
    cv.setUint16(28, nameBytes.length, true);
    cv.setUint16(30, 0, true);
    cv.setUint16(32, 0, true);
    cv.setUint16(34, 0, true);
    cv.setUint16(36, 0, true);
    cv.setUint32(38, 0, true);
    cv.setUint32(42, offset, true);
    cd.set(nameBytes, 46);
    cdParts.push(cd);

    offset += 30 + nameBytes.length + size;
  }

  const cdSize = cdParts.reduce((s, p) => s + p.length, 0);
  const eocd = new Uint8Array(22);
  const ev = new DataView(eocd.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(4, 0, true);
  ev.setUint16(6, 0, true);
  ev.setUint16(8, files.length, true);
  ev.setUint16(10, files.length, true);
  ev.setUint32(12, cdSize, true);
  ev.setUint32(16, offset, true);
  ev.setUint16(20, 0, true);

  const all = [...localParts, ...cdParts, eocd];
  const total = all.reduce((s, p) => s + p.length, 0);
  const out = new Uint8Array(total);
  let pos = 0;
  for (const p of all) {
    out.set(p, pos);
    pos += p.length;
  }
  return out;
}

// CRC-32 lookup table
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    t[i] = c;
  }
  return t;
})();

function crc32bytes(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    crc = CRC_TABLE[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
