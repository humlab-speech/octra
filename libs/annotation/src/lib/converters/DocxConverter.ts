import { OAudiofile } from '@octra/media';
import { OAnnotJSON, OSegment } from '../annotjson';
import { ExportCategory } from './Converter';
import { Converter, ExportResult, IFile, ImportResult, OctraAnnotationFormatType } from './Converter';
import { WordApplication } from './SupportedApplications';
import { buildZip } from './zip-builder';

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

