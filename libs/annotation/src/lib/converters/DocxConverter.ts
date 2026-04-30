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
    addSpeakerId: boolean;
    breakMarkerCode: string;
  } = {
    mode: 'separate',
    addTimestamps: false,
    addSpeakerId: false,
    breakMarkerCode: '<P>',
  };

  public constructor() {
    super();
    this._applications = [{ application: new WordApplication(), recommended: true }];
    this._extensions = ['.docx'];
    this._conversion = { export: true, import: false };
    this._encoding = 'binary';
    this._multitiers = false;
    this._multiTierExport = true;
  }

  export(
    annotation: OAnnotJSON,
    audiofile: OAudiofile,
    levelnum = 0,
    levelnums?: number[],
  ): ExportResult {
    if (!audiofile?.sampleRate) {
      return { error: 'Invalid audio file' };
    }

    const indices =
      levelnums && levelnums.length > 0
        ? levelnums.filter((i) => i >= 0 && i < annotation.levels.length)
        : [levelnum].filter((i) => i >= 0 && i < annotation.levels.length);

    if (indices.length === 0) {
      return { error: `Level ${levelnum} not found` };
    }

    const multi = indices.length > 1;
    const paragraphs: { text: string; heading?: boolean }[] = [];

    for (const idx of indices) {
      const level = annotation.levels[idx];
      if (multi) {
        paragraphs.push({ text: level.name, heading: true });
      }
      const segments = level.items as OSegment[];

      if (this.options.mode === 'separate') {
        for (const seg of segments) {
          const text = seg.getFirstLabelWithoutName('Speaker')?.value ?? '';
          if (!text.trim() || text.trim() === this.options.breakMarkerCode) continue;
          const tsPrefix = this.options.addTimestamps
            ? `[${this.msToTimeString(Math.round((seg.sampleStart / audiofile.sampleRate) * 1000))}] `
            : '';
          const speakerId = seg.labels?.find((l) => l.name === 'Speaker')?.value;
          const speakerPrefix =
            this.options.addSpeakerId && speakerId ? `[${speakerId}] ` : '';
          paragraphs.push({
            text: tsPrefix + speakerPrefix + text.trim(),
          });
        }
      } else {
        const parts: string[] = [];
        for (const seg of segments) {
          const text = seg.getFirstLabelWithoutName('Speaker')?.value ?? '';
          if (!text.trim() || text.trim() === this.options.breakMarkerCode) continue;
          const tsPrefix = this.options.addTimestamps
            ? `[${this.msToTimeString(Math.round((seg.sampleStart / audiofile.sampleRate) * 1000))}] `
            : '';
          const speakerId = seg.labels?.find((l) => l.name === 'Speaker')?.value;
          const speakerPrefix =
            this.options.addSpeakerId && speakerId ? `[${speakerId}] ` : '';
          parts.push(tsPrefix + speakerPrefix + text.trim());
        }
        if (parts.length > 0) {
          paragraphs.push({ text: parts.join(' ') });
        }
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

  private buildDocx(paragraphs: { text: string; heading?: boolean }[]): Uint8Array {
    const enc = new TextEncoder();

    const contentTypes = enc.encode(
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
        '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
        '<Default Extension="xml" ContentType="application/xml"/>' +
        '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>' +
        '<Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/>' +
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
      .map((p) => {
        const text = `<w:t xml:space="preserve">${this.escapeXml(p.text)}</w:t>`;
        if (p.heading) {
          return `<w:p><w:pPr><w:pStyle w:val="Heading1"/></w:pPr><w:r><w:rPr><w:b/></w:rPr>${text}</w:r></w:p>`;
        }
        return `<w:p><w:r>${text}</w:r></w:p>`;
      })
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

