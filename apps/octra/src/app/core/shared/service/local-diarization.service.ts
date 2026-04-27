import { OAnnotJSON, OLabel, OSegment, OSegmentLevel } from '@octra/annotation';

export interface SpeakerTurn {
  startS: number;
  endS: number;
  speakerId: string;
}

export function applySpeakerTurnsToAnnotJson(
  annotJson: OAnnotJSON,
  turns: SpeakerTurn[],
): OAnnotJSON {
  const sourceLevel = (annotJson.levels ?? []).find(
    (level): level is OSegmentLevel<OSegment> => level instanceof OSegmentLevel,
  );

  if (!sourceLevel || turns.length === 0) {
    return annotJson;
  }

  const speakerLabelMap = new Map<string, string>();
  let nextSpeakerNumber = 1;

  for (const item of sourceLevel.items) {
    const startS = item.sampleStart / annotJson.sampleRate;
    const endS = (item.sampleStart + item.sampleDur) / annotJson.sampleRate;
    const overlapBySpeaker = new Map<string, number>();

    for (const turn of turns) {
      const overlapS = Math.min(endS, turn.endS) - Math.max(startS, turn.startS);
      if (overlapS <= 0) {
        continue;
      }
      overlapBySpeaker.set(
        turn.speakerId,
        (overlapBySpeaker.get(turn.speakerId) ?? 0) + overlapS,
      );
    }

    const dominantSpeaker = [...overlapBySpeaker.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
    if (!dominantSpeaker) {
      continue;
    }

    if (!speakerLabelMap.has(dominantSpeaker)) {
      speakerLabelMap.set(dominantSpeaker, `Speaker ${nextSpeakerNumber++}`);
    }

    const normalizedSpeaker = speakerLabelMap.get(dominantSpeaker)!;
    const existingIndex = item.labels.findIndex((label) => label.name === 'Speaker');

    if (existingIndex > -1) {
      item.labels = [
        ...item.labels.slice(0, existingIndex),
        new OLabel('Speaker', normalizedSpeaker),
        ...item.labels.slice(existingIndex + 1),
      ];
    } else {
      item.labels = [...item.labels, new OLabel('Speaker', normalizedSpeaker)];
    }
  }

  return annotJson;
}
