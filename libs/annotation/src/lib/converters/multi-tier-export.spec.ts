/**
 * Multi-tier export grouping tests for TextConverter (utterance-major default,
 * tier-major opt-in via groupByTier).
 */
import { describe, it, expect } from 'vitest';
import {
  OAnnotJSON,
  OLabel,
  OSegment,
  OSegmentLevel,
} from '../annotjson';
import { TextConverter } from './TextConverter';

const SAMPLE_RATE = 48000;

function makeAnnot(): OAnnotJSON {
  const source = new OSegmentLevel<OSegment>('SRC', [
    new OSegment(1, 0, 48000, [new OLabel('SRC', 'hello')]),
    new OSegment(2, 48000, 48000, [new OLabel('SRC', 'world')]),
  ]);
  const linked = new OSegmentLevel<OSegment>(
    'TR',
    [
      new OSegment(3, 0, 48000, [new OLabel('TR', 'hallo')]),
      new OSegment(4, 48000, 48000, [new OLabel('TR', 'welt')]),
    ],
    'SRC',
    'translation',
  );
  return new OAnnotJSON('a.wav', 'a', SAMPLE_RATE, [source as any, linked as any]);
}

const audiofile = {
  name: 'a.wav',
  size: 0,
  duration: 96000,
  sampleRate: SAMPLE_RATE,
  type: 'audio/wav',
  arraybuffer: undefined as any,
};

describe('TextConverter multi-tier grouping', () => {
  it('utterance-major (default) interleaves tiers per segment', () => {
    const annot = makeAnnot();
    const c = new TextConverter();
    const r = c.export(annot, audiofile, 0, [0, 1]);
    expect(r.error).toBeUndefined();
    const content = r.file!.content as string;
    // Expect: [SRC] hello, [TR] hallo, blank, [SRC] world, [TR] welt
    expect(content).toContain('[SRC] hello');
    expect(content).toContain('[TR] hallo');
    const srcHelloIdx = content.indexOf('[SRC] hello');
    const trHalloIdx = content.indexOf('[TR] hallo');
    const srcWorldIdx = content.indexOf('[SRC] world');
    expect(srcHelloIdx).toBeLessThan(trHalloIdx);
    expect(trHalloIdx).toBeLessThan(srcWorldIdx);
  });

  it('groupByTier=true emits tier-major blocks (current behaviour)', () => {
    const annot = makeAnnot();
    const c = new TextConverter();
    c.options.groupByTier = true;
    const r = c.export(annot, audiofile, 0, [0, 1]);
    expect(r.error).toBeUndefined();
    const content = r.file!.content as string;
    expect(content).toContain('=== SRC ===');
    expect(content).toContain('=== TR ===');
    // hello/world should both appear before hallo
    const helloIdx = content.indexOf('hello');
    const worldIdx = content.indexOf('world');
    const halloIdx = content.indexOf('hallo');
    expect(helloIdx).toBeLessThan(halloIdx);
    expect(worldIdx).toBeLessThan(halloIdx);
  });

  it('single-tier export ignores groupByTier', () => {
    const annot = makeAnnot();
    const c = new TextConverter();
    const r1 = c.export(annot, audiofile, 0, [0]);
    c.options.groupByTier = true;
    const r2 = c.export(annot, audiofile, 0, [0]);
    expect(r1.file!.content).toBe(r2.file!.content);
  });

  it('mismatched-length tiers do not crash', () => {
    const source = new OSegmentLevel<OSegment>('SRC', [
      new OSegment(1, 0, 48000, [new OLabel('SRC', 'one')]),
      new OSegment(2, 48000, 48000, [new OLabel('SRC', 'two')]),
      new OSegment(3, 96000, 48000, [new OLabel('SRC', 'three')]),
    ]);
    const linked = new OSegmentLevel<OSegment>('TR', [
      new OSegment(4, 0, 48000, [new OLabel('TR', 'eins')]),
    ]);
    const annot = new OAnnotJSON('a.wav', 'a', SAMPLE_RATE, [
      source as any,
      linked as any,
    ]);
    const c = new TextConverter();
    const r = c.export(annot, { ...audiofile, duration: 144000 }, 0, [0, 1]);
    expect(r.error).toBeUndefined();
    const content = r.file!.content as string;
    expect(content).toContain('[SRC] one');
    expect(content).toContain('[TR] eins');
    expect(content).toContain('[SRC] two');
    expect(content).toContain('[SRC] three');
  });
});
