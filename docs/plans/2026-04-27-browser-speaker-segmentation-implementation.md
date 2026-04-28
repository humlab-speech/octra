# Browser Speaker Segmentation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add public, in-browser speaker segmentation for OCTRA local transcription flow, no Hugging Face login required, producing stable-enough `SpeakerTurn[]` for downstream speaker labels.

**Architecture:** Use a new browser worker modeled after existing ASR/translation workers. Load a public `transformers.js`-compatible pyannote segmentation model from Hugging Face, run fully client-side on 16 kHz mono audio, then post-process raw segments into more stable speaker turns before injecting them into OCTRA annotations through existing `SpeakerTurn[]` seams. The UI exposes this as an opt-in toggle for all users.

**Tech Stack:** Angular 19, Nx, TypeScript, Web Workers, `@huggingface/transformers`, ONNX Runtime Web, Jest.

---

### Task 1: Define diarization contracts and post-processing helper

**Files:**
- Create: `apps/octra/src/app/core/shared/service/local-diarization-postprocess.ts`
- Create: `apps/octra/src/app/core/shared/service/local-diarization-postprocess.spec.ts`
- Reference: `apps/octra/src/app/core/shared/service/local-diarization.service.ts`

**Step 1: Write the failing test**

Add tests for:
- merging same speaker across short pause
- not merging across real speaker change
- dropping tiny turns
- stable renumbering by first appearance
- preserving long-gap separation when above threshold

**Step 2: Run test to verify it fails**

Run: `npx jest --config apps/octra/jest.config.ts --runInBand --testPathPatterns='local-diarization-postprocess.spec.ts' --no-cache`

Expected: FAIL because helper file does not exist.

**Step 3: Write minimal implementation**

Implement:
- raw segment type from pyannote post-process output
- normalization to `SpeakerTurn[]`
- merge/drop/relabel heuristics with constants:
  - `DEFAULT_MERGE_GAP_S = 0.8`
  - `DEFAULT_MIN_TURN_S = 0.35`

**Step 4: Run test to verify it passes**

Run same command.

Expected: PASS

**Step 5: Commit**

Run: `git add apps/octra/src/app/core/shared/service/local-diarization-postprocess.ts apps/octra/src/app/core/shared/service/local-diarization-postprocess.spec.ts && git commit -m "feat(diarization): add speaker turn post-processing"`

### Task 2: Add diarization worker

**Files:**
- Create: `apps/octra/src/app/core/workers/pyannote-diarization.worker.ts`
- Reference: `apps/octra/src/app/core/workers/whisper-transcription.worker.ts`
- Reference: `apps/octra/src/app/core/workers/translation.worker.ts`

**Step 1: Write the failing test**

Write contract tests against exported message/result types near the runtime service spec.

**Step 2: Run test to verify it fails**

Run: `npx jest --config apps/octra/jest.config.ts --runInBand --testPathPatterns='local-diarization-runtime.service.spec.ts' --no-cache`

Expected: FAIL because runtime service/worker contract missing.

**Step 3: Write minimal implementation**

Worker should:
- set `env.backends.onnx.wasm.wasmPaths = '/assets/ort/'`
- load `AutoProcessor` and `AutoModelForAudioFrameClassification`
- use public default model ID `onnx-community/pyannote-segmentation-3.0`
- preprocess audio with processor
- call model
- call `processor.post_process_speaker_diarization(logits, audio.length)`
- normalize via helper into `SpeakerTurn[]`
- post typed events and terminate on completion/error

**Step 4: Run targeted test**

Run same command.

Expected: contract test passes.

**Step 5: Commit**

Run: `git add apps/octra/src/app/core/workers/pyannote-diarization.worker.ts && git commit -m "feat(diarization): add browser diarization worker"`

### Task 3: Add local diarization runtime service

**Files:**
- Create: `apps/octra/src/app/core/shared/service/local-diarization-runtime.service.ts`
- Create: `apps/octra/src/app/core/shared/service/local-diarization-runtime.service.spec.ts`
- Reference: `apps/octra/src/app/core/shared/service/local-transcription.service.ts`

**Step 1: Write the failing test**

Test service behavior:
- resamples to 16 kHz mono
- sends typed worker message
- emits result with `SpeakerTurn[]`
- emits friendly error
- terminates worker on complete/cancel

**Step 2: Run test to verify it fails**

Run: `npx jest --config apps/octra/jest.config.ts --runInBand --testPathPatterns='local-diarization-runtime.service.spec.ts' --no-cache`

Expected: FAIL

**Step 3: Write minimal implementation**

Mirror `LocalTranscriptionService` pattern with options for `modelId`, `useWebGPU`, and optional `dtype`.

**Step 4: Run test to verify it passes**

Run same command.

Expected: PASS

**Step 5: Commit**

Run: `git add apps/octra/src/app/core/shared/service/local-diarization-runtime.service.ts apps/octra/src/app/core/shared/service/local-diarization-runtime.service.spec.ts && git commit -m "feat(diarization): add local diarization runtime service"`

### Task 4: Integrate opt-in diarization into local transcription flow

**Files:**
- Modify: `apps/octra/src/app/core/component/octra-dropzone/auto-transcribe-options.component.ts`
- Modify: `apps/octra/src/app/core/component/octra-dropzone/octra-dropzone.component.ts`
- Modify: `apps/octra/src/app/core/pages/login/login.component.ts`
- Modify: `apps/octra/src/app/core/pages/login/login.component.html`
- Modify: `apps/octra/src/app/core/component/octra-dropzone/octra-dropzone.service.ts`
- Test: `apps/octra/src/app/core/component/octra-dropzone/octra-dropzone.service.spec.ts`
- Test: orchestration spec near `login.component` if present, otherwise service-level spec

**Step 1: Write the failing test**

Add tests for orchestration:
- diarization runs only when toggle enabled
- diarization result passed into annotation flow
- diarization failure degrades gracefully to transcription-only result
- toggle default is unchecked

**Step 2: Run tests to verify they fail**

Run: `npx jest --config apps/octra/jest.config.ts --runInBand --testPathPatterns='(local-transcription-finalization|octra-dropzone.service|login.component)\.spec' --no-cache`

Expected: FAIL on new orchestration expectations.

**Step 3: Write minimal implementation**

- add `Speaker segmentation (experimental)` opt-in control in existing auto-transcribe options UI
- keep feature available to all users, no auth gating
- on successful local transcription path, request diarization only when toggle enabled
- if diarization errors, continue without speaker labels and surface non-blocking warning if UI supports it

**Step 4: Run tests to verify they pass**

Run same command.

Expected: PASS

**Step 5: Commit**

Run: `git add apps/octra/src/app/core/component/octra-dropzone/auto-transcribe-options.component.ts apps/octra/src/app/core/component/octra-dropzone/octra-dropzone.component.ts apps/octra/src/app/core/pages/login/login.component.ts apps/octra/src/app/core/pages/login/login.component.html apps/octra/src/app/core/component/octra-dropzone/octra-dropzone.service.ts && git commit -m "feat(diarization): add opt-in browser speaker segmentation"`

### Task 5: Add public defaults and no-auth model configuration

**Files:**
- Modify: `apps/octra/src/app/core/shared/service/local-diarization-runtime.service.ts`
- Test: `apps/octra/src/app/core/shared/service/local-diarization-runtime.service.spec.ts`

**Step 1: Write the failing test**

Assert:
- default model ID is public `onnx-community/pyannote-segmentation-3.0`
- feature does not depend on HF login state

**Step 2: Run test to verify it fails**

Run targeted runtime service spec.

Expected: FAIL

**Step 3: Write minimal implementation**

- define `DIARIZATION_DEFAULT_MODEL_ID`
- keep model fixed for MVP

**Step 4: Run test to verify it passes**

Run targeted runtime service spec.

Expected: PASS

**Step 5: Commit**

Run: `git add apps/octra/src/app/core/shared/service/local-diarization-runtime.service.ts apps/octra/src/app/core/shared/service/local-diarization-runtime.service.spec.ts && git commit -m "feat(diarization): use public no-auth browser model"`

### Task 6: Manual verification and guardrails

**Files:**
- Verify only

**Step 1: Run focused tests**

Run: `npx jest --config apps/octra/jest.config.ts --runInBand --testPathPatterns='(local-diarization-postprocess|local-diarization-runtime|local-transcription-finalization|octra-dropzone.service)\.spec' --no-cache`

Expected: PASS

**Step 2: Run broader app test command**

Run: `npm test -- --runInBand`

Expected: no regressions in touched areas; if unrelated failures exist, document them.

**Step 3: Manual browser verification**

Check:
- local transcription works without HF login
- diarization model downloads for anonymous user
- second run reuses cache when available
- same speaker across short pause stays same speaker
- actual speaker change creates different speaker label
- diarization failure does not lose transcript
