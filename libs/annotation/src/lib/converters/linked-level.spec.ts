/**
 * Linked level round-trip + speaker label survival tests.
 */
import { describe, it, expect } from 'vitest';
import {
  IAnnotJSON,
  OAnnotJSON,
  OLabel,
  OSegment,
  OSegmentLevel,
} from '../annotjson';

function makeAnnot(): OAnnotJSON {
  const sourceLevel = new OSegmentLevel<OSegment>('OCTRA_1', [
    new OSegment(1, 0, 48000, [
      new OLabel('OCTRA_1', 'hello'),
      new OLabel('Speaker', 'Speaker 1'),
    ]),
    new OSegment(2, 48000, 48000, [
      new OLabel('OCTRA_1', 'world'),
      new OLabel('Speaker', 'Speaker 2'),
    ]),
  ]);
  const linkedLevel = new OSegmentLevel<OSegment>(
    'OCTRA_1_en',
    [
      new OSegment(3, 0, 48000, [
        new OLabel('OCTRA_1_en', 'hallo'),
        new OLabel('Speaker', 'Speaker 1'),
      ]),
      new OSegment(4, 48000, 48000, [
        new OLabel('OCTRA_1_en', 'welt'),
        new OLabel('Speaker', 'Speaker 2'),
      ]),
    ],
    'OCTRA_1',
    'translation',
  );
  return new OAnnotJSON('audio.wav', 'audio', 48000, [
    sourceLevel as any,
    linkedLevel as any,
  ]);
}

describe('linked levels', () => {
  it('serializes linkedToLevelName + linkedKind on segment levels', () => {
    const annot = makeAnnot();
    const json: IAnnotJSON = annot.serialize();
    const linked = json.levels[1] as any;
    expect(linked.linkedToLevelName).toBe('OCTRA_1');
    expect(linked.linkedKind).toBe('translation');
  });

  it('round-trip: deserialize → serialize preserves link metadata', () => {
    const annot = makeAnnot();
    const json = annot.serialize();
    const restored = OAnnotJSON.deserialize(json)!;
    const reJson = restored.serialize();
    const linked = reJson.levels[1] as any;
    expect(linked.linkedToLevelName).toBe('OCTRA_1');
    expect(linked.linkedKind).toBe('translation');
  });

  it('source level has no link metadata', () => {
    const annot = makeAnnot();
    const json = annot.serialize();
    const source = json.levels[0] as any;
    expect(source.linkedToLevelName).toBeUndefined();
    expect(source.linkedKind).toBeUndefined();
  });

  it('Speaker labels present on both source and linked level segments', () => {
    const annot = makeAnnot();
    const sourceItems = (annot.levels[0] as OSegmentLevel<OSegment>).items;
    const linkedItems = (annot.levels[1] as OSegmentLevel<OSegment>).items;
    for (let i = 0; i < sourceItems.length; i++) {
      const sSpeaker = sourceItems[i].labels.find((l) => l.name === 'Speaker');
      const lSpeaker = linkedItems[i].labels.find((l) => l.name === 'Speaker');
      expect(sSpeaker?.value).toBeDefined();
      expect(lSpeaker?.value).toBe(sSpeaker?.value);
    }
  });
});
