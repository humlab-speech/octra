import { OAudiofile } from '@octra/media';
import { OAnnotJSON, OSegment } from '../annotjson';
import { Converter, ExportCategory, ExportResult, IFile, ImportResult, OctraAnnotationFormatType } from './Converter';
import { LibreOfficeApplication } from './SupportedApplications';
import { buildZip } from './zip-builder';

export class OdtConverter extends Converter {
  override _name: OctraAnnotationFormatType = 'ODT';
  override _category: ExportCategory = 'general';

  public override options: {
    mode: 'separate' | 'continuous';
    addTimestamps: boolean;
    breakMarkerCode: string;
  } = {
    mode: 'separate',
    addTimestamps: false,
    breakMarkerCode: '<P>',
  };

  public constructor() {
    super();
    this._applications = [{ application: new LibreOfficeApplication(), recommended: true }];
    this._extensions = ['.odt'];
    this._conversion = { export: true, import: false };
    this._encoding = 'binary';
    this._multitiers = false;
  }

  export(annotation: OAnnotJSON, audiofile: OAudiofile, levelnum = 0): ExportResult {
    if (!audiofile?.sampleRate) {
      return { error: 'Invalid audio file' };
    }
    const level = annotation.levels[levelnum];
    if (!level) {
      return { error: `Level ${levelnum} not found` };
    }

    const segments = level.items as OSegment[];
    const paragraphs: string[] = [];

    if (this.options.mode === 'separate') {
      for (const seg of segments) {
        const text = seg.labels?.[0]?.value ?? '';
        if (!text.trim() || text.trim() === this.options.breakMarkerCode) continue;
        const prefix = this.options.addTimestamps
          ? `[${this.msToTimeString(Math.round((seg.sampleStart / audiofile.sampleRate) * 1000))}] `
          : '';
        paragraphs.push(prefix + text.trim());
      }
    } else {
      const parts: string[] = [];
      for (const seg of segments) {
        const text = seg.labels?.[0]?.value ?? '';
        if (!text.trim() || text.trim() === this.options.breakMarkerCode) continue;
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

    const odtBytes = this.buildOdt(paragraphs);
    const baseName = audiofile.name.replace(/\.[^.]+$/, '');

    const file: IFile = {
      name: `${baseName}.odt`,
      content: odtBytes as unknown as string,
      type: 'application/vnd.oasis.opendocument.text',
      encoding: 'binary',
    };
    return { file };
  }

  import(_file: IFile, _audiofile: OAudiofile): ImportResult {
    return { error: 'ODT import not supported' };
  }

  needsOptionsForImport(_file: IFile, _audiofile: OAudiofile): undefined {
    return undefined;
  }

  private buildOdt(paragraphs: string[]): Uint8Array {
    const enc = new TextEncoder();

    // mimetype MUST be the first entry per ODF spec, STORED (no compression)
    const mimetype = enc.encode('application/vnd.oasis.opendocument.text');

    const manifest = enc.encode(
      '<?xml version="1.0" encoding="UTF-8"?>' +
        '<manifest:manifest' +
        ' xmlns:manifest="urn:oasis:names:tc:opendocument:xmlns:manifest:1.0"' +
        ' manifest:version="1.2">' +
        '<manifest:file-entry manifest:full-path="/"' +
        ' manifest:media-type="application/vnd.oasis.opendocument.text"/>' +
        '<manifest:file-entry manifest:full-path="content.xml"' +
        ' manifest:media-type="text/xml"/>' +
        '</manifest:manifest>',
    );

    const paras = paragraphs
      .map((p) => `<text:p text:style-name="Standard">${this.escapeXml(p)}</text:p>`)
      .join('');

    const content = enc.encode(
      '<?xml version="1.0" encoding="UTF-8"?>' +
        '<office:document-content' +
        ' xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"' +
        ' xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0"' +
        ' office:version="1.2">' +
        '<office:body><office:text>' +
        paras +
        '</office:text></office:body>' +
        '</office:document-content>',
    );

    return buildZip([
      { name: 'mimetype', data: mimetype },
      { name: 'META-INF/manifest.xml', data: manifest },
      { name: 'content.xml', data: content },
    ]);
  }
}
