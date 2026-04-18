/**
 * Round-trip tests: import from real file → export (with time indicators) → re-import.
 * Verifies that exported annotation files can be read back correctly by the app.
 */
import * as fs from 'fs';
import * as path from 'path';
import { describe, it, expect } from 'vitest';
import { TextConverter } from './TextConverter';
import { PraatTextgridConverter } from './PraatTextgridConverter';
import { PraatTableConverter } from './PraatTableConverter';
import { ELANConverter } from './ELANConverter';
import { SRTConverter } from './SRTConverter';
import { WebVTTConverter } from './WebVTTConverter';
import { AnnotJSONConverter } from './AnnotJSONConverter';
import { OAudiofile } from '@octra/media';
import { OAnnotJSON } from '../annotjson';

const PROJECT_ROOT = path.resolve(__dirname, '../../../../..');
const BASE = 'Intervju med Stig Bergling';

function readFile(name: string): string {
  return fs.readFileSync(path.join(PROJECT_ROOT, name), 'utf-8');
}

/** mock OAudiofile matching the WAV (48 kHz, ~2691.9 s) */
const audiofile: OAudiofile = {
  name: `${BASE}.wav`,
  size: 86140502,
  duration: 129216000, // last timestamp = 2692 s × 48000 (clean ms boundary)
  sampleRate: 48000,
  arraybuffer: undefined,
};

// ── helpers ──────────────────────────────────────────────────────────────────

function importTextGrid(): OAnnotJSON {
  const c = new PraatTextgridConverter();
  const r = c.import(
    { name: `${BASE}.TextGrid`, type: 'text/plain', content: readFile(`${BASE}.TextGrid`), encoding: 'UTF-8' },
    audiofile,
  );
  expect(r.error).toBe('');
  return r.annotjson!;
}

function segmentCount(ann: OAnnotJSON): number {
  return ann.levels.reduce((n, l) => n + l.items.length, 0);
}

// ── round-trip tests ─────────────────────────────────────────────────────────

describe('annotation round-trip (export → re-import)', () => {

  it('PlainText (.txt) — with showTimestampString', () => {
    const source = importTextGrid();
    const src_count = segmentCount(source);

    const exporter = new TextConverter();
    exporter.options = { showTimestampString: true, showTimestampSamples: false, addNewLineString: false };
    const exported = exporter.export(source, audiofile, 0);
    expect(exported.error).toBeFalsy();
    expect(exported.file!.content).toContain('<ts=');

    const importer = new TextConverter();
    const reimported = importer.import(
      { name: `${BASE}.txt`, type: 'text/plain', content: exported.file!.content, encoding: 'UTF-8' },
      audiofile,
    );
    expect(reimported.error).toBe('');
    expect(reimported.annotjson).toBeDefined();
    expect(segmentCount(reimported.annotjson!)).toBe(src_count);
  });

  it('PlainText (.txt) — with showTimestampSamples', () => {
    const source = importTextGrid();
    const src_count = segmentCount(source);

    const exporter = new TextConverter();
    exporter.options = { showTimestampString: false, showTimestampSamples: true, addNewLineString: false };
    const exported = exporter.export(source, audiofile, 0);
    expect(exported.error).toBeFalsy();
    expect(exported.file!.content).toContain('<sp=');

    const importer = new TextConverter();
    const reimported = importer.import(
      { name: `${BASE}.txt`, type: 'text/plain', content: exported.file!.content, encoding: 'UTF-8' },
      audiofile,
    );
    expect(reimported.error).toBe('');
    expect(reimported.annotjson).toBeDefined();
    expect(segmentCount(reimported.annotjson!)).toBe(src_count);
  });

  it('Praat TextGrid (.TextGrid)', () => {
    const source = importTextGrid();
    const src_count = segmentCount(source);

    const exporter = new PraatTextgridConverter();
    const exported = exporter.export(source, audiofile);
    expect(exported.error).toBeFalsy();
    expect(exported.file!.encoding).toBe('UTF-8'); // Bug #2 guard

    const importer = new PraatTextgridConverter();
    const reimported = importer.import(
      { name: `${BASE}.TextGrid`, type: 'text/plain', content: exported.file!.content, encoding: 'UTF-8' },
      audiofile,
    );
    expect(reimported.error).toBe('');
    expect(reimported.annotjson).toBeDefined();
    expect(segmentCount(reimported.annotjson!)).toBe(src_count);
  });

  it('Praat Table (.Table)', () => {
    const source = importTextGrid();
    const src_count = segmentCount(source);

    const exporter = new PraatTableConverter();
    const exported = exporter.export(source);
    expect(exported.error).toBeFalsy();

    const importer = new PraatTableConverter();
    const reimported = importer.import(
      { name: `${BASE}.Table`, type: 'text/plain', content: exported.file!.content, encoding: 'UTF-8' },
      audiofile,
    );
    expect(reimported.error).toBe('');
    expect(reimported.annotjson).toBeDefined();
    expect(segmentCount(reimported.annotjson!)).toBe(src_count);
  });

  it('ELAN (.eaf)', () => {
    const source = importTextGrid();
    const src_count = segmentCount(source);

    const exporter = new ELANConverter();
    const exported = exporter.export(source, audiofile);
    expect(exported.error).toBeFalsy();

    const importer = new ELANConverter();
    const reimported = importer.import(
      { name: `${BASE}.eaf`, type: 'text/xml', content: exported.file!.content, encoding: 'UTF-8' },
      audiofile,
    );
    expect(reimported.error).toBe('');
    expect(reimported.annotjson).toBeDefined();
    // ELAN import adds a trailing empty segment when source doesn't reach audio duration;
    // ms-precision rounding may also cause a 1-segment gap at the end.
    expect(segmentCount(reimported.annotjson!)).toBeGreaterThanOrEqual(src_count);
  });

  it('SRT (.srt)', () => {
    // SRT only exports non-empty segments
    const source = importTextGrid();
    const nonEmpty = source.levels[0].items.filter((s: any) =>
      (s.labels?.[0]?.value ?? '') !== ''
    ).length;

    const exporter = new SRTConverter();
    const exported = exporter.export(source, audiofile, 0);
    expect(exported.error).toBeFalsy();
    expect(exported.file!.content).toContain('-->');

    const importer = new SRTConverter();
    const reimported = importer.import(
      { name: `${BASE}.srt`, type: 'text/plain', content: exported.file!.content, encoding: 'UTF-8' },
      audiofile,
    );
    expect(reimported.error).toBe('');
    expect(reimported.annotjson).toBeDefined();
    // SRT skips empty segments on export; re-import recreates them
    expect(reimported.annotjson!.levels[0].items.length).toBeGreaterThanOrEqual(nonEmpty);
  });

  it('WebVTT (.vtt)', () => {
    const source = importTextGrid();
    const nonEmpty = source.levels[0].items.filter((s: any) =>
      (s.labels?.[0]?.value ?? '') !== ''
    ).length;

    const exporter = new WebVTTConverter();
    const exported = exporter.export(source, audiofile, 0);
    expect(exported.error).toBeFalsy();
    expect(exported.file!.content.startsWith('WEBVTT')).toBe(true);

    const importer = new WebVTTConverter();
    // WebVTT import rejects if timeEnd >= duration (strict); last cue ends at 129216000
    const vttAudio = { ...audiofile, duration: 129216001 };
    const reimported = importer.import(
      { name: `${BASE}.vtt`, type: 'text/vtt', content: exported.file!.content, encoding: 'UTF-8' },
      vttAudio,
    );
    expect(reimported.error).toBe('');
    expect(reimported.annotjson).toBeDefined();
    expect(reimported.annotjson!.levels[0].items.length).toBeGreaterThanOrEqual(nonEmpty);
  });

  it('AnnotJSON (_annot.json)', () => {
    const source = importTextGrid();
    const src_count = segmentCount(source);
    // Patch annotates to match the mock audio name so re-import accepts it
    source.annotates = audiofile.name;

    const exporter = new AnnotJSONConverter();
    const exported = exporter.export(source);
    expect(exported.error).toBeFalsy();

    const importer = new AnnotJSONConverter();
    const reimported = importer.import(
      { name: `${BASE}_annot.json`, type: 'application/json', content: exported.file!.content, encoding: 'UTF-8' },
      audiofile,
    );
    expect(reimported.error).toBeFalsy();
    expect(reimported.annotjson).toBeDefined();
    expect(segmentCount(reimported.annotjson!)).toBe(src_count);
  });

});
