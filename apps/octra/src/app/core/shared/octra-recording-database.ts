import Dexie from 'dexie';

export type RecordingMode = 'audio' | 'audio+video';
export type RecordingChunkKind = 'container' | 'pcm';

export interface IRecordingSession {
  id: string;
  mode: RecordingMode;
  mimeType: string;
  startedAt: number;
  lastChunkAt: number;
  finalized: 0 | 1;
  totalBytes: number;
  sampleRate?: number;
  channels?: number;
}

export interface IRecordingChunk {
  autoId?: number;
  sessionId: string;
  index: number;
  kind: RecordingChunkKind;
  blob: Blob;
  createdAt: number;
}

export class OctraRecordingDatabase extends Dexie {
  public sessions!: Dexie.Table<IRecordingSession, string>;
  public chunks!: Dexie.Table<IRecordingChunk, number>;

  constructor(dbName = 'octra-recordings') {
    super(dbName);

    this.version(1).stores({
      sessions: 'id, finalized, startedAt',
      chunks: '++autoId, sessionId, [sessionId+index], kind',
    });
  }
}
