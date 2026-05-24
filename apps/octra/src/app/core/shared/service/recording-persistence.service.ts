import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import {
  IRecordingChunk,
  IRecordingSession,
  OctraRecordingDatabase,
  RecordingChunkKind,
  RecordingMode,
} from '../octra-recording-database';

export interface RecoverableSession extends IRecordingSession {
  durationMs: number;
}

@Injectable({ providedIn: 'root' })
export class RecordingPersistenceService {
  private db = new OctraRecordingDatabase();

  readonly recoverableSessions$ = new BehaviorSubject<RecoverableSession[]>([]);

  async createSession(params: {
    id: string;
    mode: RecordingMode;
    mimeType: string;
    sampleRate?: number;
    channels?: number;
  }): Promise<IRecordingSession> {
    const now = Date.now();
    const session: IRecordingSession = {
      id: params.id,
      mode: params.mode,
      mimeType: params.mimeType,
      startedAt: now,
      lastChunkAt: now,
      finalized: 0,
      totalBytes: 0,
      sampleRate: params.sampleRate,
      channels: params.channels,
    };
    await this.db.sessions.put(session);
    return session;
  }

  async appendChunk(params: {
    sessionId: string;
    index: number;
    kind: RecordingChunkKind;
    blob: Blob;
  }): Promise<void> {
    const now = Date.now();
    await this.db.transaction(
      'rw',
      (this.db.chunks as any),
      this.db.sessions,
      async () => {
        await (this.db.chunks as any).add({
          sessionId: params.sessionId,
          index: params.index,
          kind: params.kind,
          blob: params.blob,
          createdAt: now,
        });
        const session = await this.db.sessions.get(params.sessionId);
        if (session) {
          session.lastChunkAt = now;
          session.totalBytes += params.blob.size;
          await this.db.sessions.put(session);
        }
      },
    );
  }

  async loadChunks(
    sessionId: string,
    kind?: RecordingChunkKind,
  ): Promise<IRecordingChunk[]> {
    const coll = (this.db.chunks as any).where('sessionId').equals(sessionId);
    const all = (await coll.toArray()) as IRecordingChunk[];
    const filtered = kind ? all.filter((c) => c.kind === kind) : all;
    return filtered.sort((a, b) => a.index - b.index);
  }

  async listSessions(opts: { finalized?: boolean } = {}): Promise<
    IRecordingSession[]
  > {
    const all = await this.db.sessions.toArray();
    if (opts.finalized === undefined) return all;
    const target = opts.finalized ? 1 : 0;
    return all.filter((s) => s.finalized === target);
  }

  async finalizeSession(sessionId: string): Promise<void> {
    const session = await this.db.sessions.get(sessionId);
    if (!session) return;
    session.finalized = 1;
    await this.db.sessions.put(session);
  }

  async discardSession(sessionId: string): Promise<void> {
    await this.db.transaction(
      'rw',
      (this.db.chunks as any),
      this.db.sessions,
      async () => {
        await (this.db.chunks as any)
          .where('sessionId')
          .equals(sessionId)
          .delete();
        await this.db.sessions.delete(sessionId);
      },
    );
  }

  async pruneOlderThan(ageMs: number): Promise<number> {
    const cutoff = Date.now() - ageMs;
    const stale = await this.db.sessions
      .filter((s) => s.startedAt < cutoff)
      .toArray();
    for (const s of stale) {
      await this.discardSession(s.id);
    }
    return stale.length;
  }

  async refreshRecoverable(): Promise<RecoverableSession[]> {
    const unfinalized = await this.listSessions({ finalized: false });
    const result: RecoverableSession[] = unfinalized.map((s) => ({
      ...s,
      durationMs: Math.max(0, s.lastChunkAt - s.startedAt),
    }));
    this.recoverableSessions$.next(result);
    return result;
  }
}
