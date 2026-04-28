import { SpeakerTurn } from './local-diarization.service';

export interface PyannoteSpeakerSegment {
  id: number;
  start: number;
  end: number;
  confidence?: number;
}

export const DEFAULT_MERGE_GAP_S = 0.8;
export const DEFAULT_MIN_TURN_S = 0.35;

export function normalizePyannoteSpeakerTurns(
  segments: PyannoteSpeakerSegment[],
): SpeakerTurn[] {
  const filtered = [...segments]
    .filter((segment) => segment.end > segment.start)
    .sort((a, b) => a.start - b.start)
    .filter((segment) => segment.end - segment.start >= DEFAULT_MIN_TURN_S);

  const merged: Array<{ startS: number; endS: number; speakerId: string }> = [];

  for (const segment of filtered) {
    const speakerId = String(segment.id);
    const previous = merged.at(-1);

    if (
      previous &&
      previous.speakerId === speakerId &&
      segment.start - previous.endS <= DEFAULT_MERGE_GAP_S
    ) {
      previous.endS = segment.end;
      continue;
    }

    merged.push({
      startS: segment.start,
      endS: segment.end,
      speakerId,
    });
  }

  const normalizedSpeakerIds = new Map<string, string>();
  let nextSpeakerNumber = 0;

  return merged.map((segment) => {
    if (!normalizedSpeakerIds.has(segment.speakerId)) {
      normalizedSpeakerIds.set(segment.speakerId, String(nextSpeakerNumber++));
    }

    return {
      ...segment,
      speakerId: normalizedSpeakerIds.get(segment.speakerId)!,
    };
  });
}
