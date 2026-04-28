# WebGPU Transcription Regression Investigation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Determine the root cause of the regression where local Whisper transcription on WebGPU now fails with GPU memory/device-loss errors on the same machine/browser that previously worked for tiny and small models.

**Architecture:** This is an investigation-only plan. Do not fix anything until the regression is reproduced, narrowed, and attributed to a specific cause bucket. The plan traces the full option flow from UI to worker, compares current branch behavior against a last-known-good baseline, and separates transcription-stage failures from post-transcription speaker-segmentation effects.

**Tech Stack:** Angular 19, Nx, Web Workers, `@huggingface/transformers`, ONNX Runtime Web via Transformers.js, WebGPU, WASM.

---

### Task 1: Capture the exact failing scenario

**Files:**
- Read: `apps/octra/src/app/core/component/octra-dropzone/auto-transcribe-options.component.ts`
- Read: `apps/octra/src/app/core/pages/login/login.component.ts`
- Read: `apps/octra/src/app/core/shared/service/local-transcription.service.ts`
- Output notes to: `docs/plans/2026-04-27-webgpu-transcription-regression-investigation.md`

**Step 1: Write the reproduction checklist**

Record these facts at the top of the investigation notes:

- Same machine: yes
- Same browser family: yes
- Previously working models: tiny, small
- Current failing model: tiny
- Speaker segmentation enabled during failing run: yes
- Exact visible error text from UI

**Step 2: Define the manual repro path**

Use this exact path in the app:

1. Open local/offline flow
2. Load audio file with no annotation
3. Enable local transcription
4. Select tiny model
5. Keep WebGPU enabled
6. Enable speaker segmentation
7. Start offline transcription

**Step 3: Define evidence to capture per run**

For every repro attempt, collect:

- selected model id
- selected language
- WebGPU enabled true/false
- speaker segmentation enabled true/false
- dtype actually sent to worker
- last download progress message
- whether `transcribe-start` event fired
- full console stack trace
- worker error text

**Step 4: Commit**

No commit. Investigation plan only.

### Task 2: Instrument the transcription pipeline boundary

**Files:**
- Modify: `apps/octra/src/app/core/shared/service/local-transcription.service.ts`
- Modify: `apps/octra/src/app/core/workers/whisper-transcription.worker.ts`

**Step 1: Write the failing test or failing evidence harness**

This bug is browser/WebGPU/runtime-specific. Use a temporary evidence harness instead of an automated unit test.

Add temporary structured logs at these boundaries:

- before `LocalTranscriptionService` posts worker message
- when worker receives message
- immediately before `pipeline(...)`
- immediately after `pipeline(...)`
- immediately before `(transcriber as any)(audio, ...)`
- in worker catch block with full serialized error
- in main-thread `friendlyError(...)` path

**Step 2: Run app to verify instrumentation fires**

Run: `npm start`

Expected:
- app starts cleanly
- logs appear in browser console during transcription attempt

**Step 3: Write minimal instrumentation**

Log these exact values:

- `modelId`
- `useWebGPU`
- `dtype`
- `language`
- `audioDurationS`
- whether segmentation is enabled in `TranscriptionOptions`
- timestamps around model load and inference start

Do not change behavior. Logs only.

**Step 4: Re-run repro to gather evidence**

Expected result categories:

- failure before `pipeline(...)`
- failure during `pipeline(...)`
- failure after `pipeline(...)` but before inference
- failure during inference

**Step 5: Commit**

No commit. Temporary debug instrumentation.

### Task 3: Prove whether speaker segmentation is causal or incidental

**Files:**
- Read: `apps/octra/src/app/core/pages/login/login.component.ts:305-332`
- Read: `apps/octra/src/app/core/pages/login/local-offline-transcription.helpers.ts`
- Read: `apps/octra/src/app/core/shared/service/local-diarization-runtime.service.ts`

**Step 1: Confirm execution order from code**

Verify from source that diarization runs only after transcription result is emitted.

Write down:

- whether diarization worker can start before transcription `result`
- whether diarization can allocate GPU resources during model download

**Step 2: Run paired manual repros**

Run these two cases back-to-back from a fresh tab:

1. tiny + WebGPU + segmentation ON
2. tiny + WebGPU + segmentation OFF

Collect same evidence fields from Task 1.

**Step 3: Evaluate**

Interpretation rules:

- If both fail before transcription result, segmentation is not the direct cause.
- If only segmentation ON fails and transcription result completes first, segmentation path is implicated.
- If ON fails earlier than result despite code order, investigate stale workers or previous allocations.

**Step 4: Commit**

No commit.

### Task 4: Compare runtime parameters against last known good behavior

**Files:**
- Read: `apps/octra/src/app/core/component/octra-dropzone/auto-transcribe-options.component.ts`
- Read: `apps/octra/src/app/core/component/octra-dropzone/auto-transcribe-options.helpers.ts`
- Read: `apps/octra/src/app/core/shared/service/local-transcription.service.ts`
- Read: `apps/octra/src/app/core/workers/whisper-transcription.worker.ts`

**Step 1: Capture current effective settings for tiny model**

Write down current values for tiny model:

- `modelId`
- `dtypeWasm`
- `dtypeWebgpu`
- `requiresWebGpu`
- `hasWebgpuVariant`

**Step 2: Compare with last known good git state**

Run:

```bash
git log --oneline -20 -- apps/octra/src/app/core/component/octra-dropzone/auto-transcribe-options.component.ts apps/octra/src/app/core/component/octra-dropzone/auto-transcribe-options.helpers.ts apps/octra/src/app/core/shared/service/local-transcription.service.ts apps/octra/src/app/core/workers/whisper-transcription.worker.ts
```

Then diff current branch against a known-good commit or `main` for those files.

**Step 3: Identify candidate regressions**

Look for:

- model id change for tiny
- WebGPU default change
- dtype change, especially `q4`
- worker initialization path change
- cache/backend config change

**Step 4: Write a short hypothesis list**

Format:

1. Hypothesis A: tiny model now resolves to a heavier artifact on WebGPU
2. Hypothesis B: current `dtypeWebgpu: 'q4'` is more memory-hungry or less stable than previous setting
3. Hypothesis C: worker/dependency change altered WebGPU allocation behavior

**Step 5: Commit**

No commit.

### Task 5: Determine whether the failure is model-load or inference-time

**Files:**
- Modify temporarily: `apps/octra/src/app/core/workers/whisper-transcription.worker.ts`

**Step 1: Use instrumentation timestamps**

From Task 2 logs, determine whether the exception occurs:

- before `pipeline(...)`
- inside `pipeline(...)`
- after `transcribe-start`
- inside the transcription call

**Step 2: Write the decision result**

Create one of these exact statements in the notes:

- `Failure occurs during model initialization/upload.`
- `Failure occurs during inference after successful initialization.`

**Step 3: Explain why it matters**

Add one line:

- initialization failure suggests graph/weights/device upload regression
- inference failure suggests runtime memory pressure from execution path or chunking

**Step 4: Commit**

No commit.

### Task 6: Check dependency drift

**Files:**
- Read: `package.json`
- Read: lockfile (`package-lock.json` or equivalent)
- Read: any recent diffs touching `@huggingface/transformers`

**Step 1: Identify relevant package versions**

Record versions for:

- `@huggingface/transformers`
- ONNX/runtime-related transitive packages if visible

**Step 2: Inspect recent package diffs**

Run git diff/log for dependency files to see if versions changed during this work.

**Step 3: Correlate with symptom**

If dependency version changed, note whether regression started after that change or is still reproducible when code paths are reverted.

**Step 4: Commit**

No commit.

### Task 7: Rule out stale worker or lifecycle leakage

**Files:**
- Read: `apps/octra/src/app/core/shared/service/local-transcription.service.ts:62-159`
- Read: `apps/octra/src/app/core/shared/service/local-diarization-runtime.service.ts`
- Read: `apps/octra/src/app/core/shared/service/local-translation.service.ts`

**Step 1: Trace worker lifetime**

Verify:

- when transcription worker is created
- when it is terminated
- whether cancel path always terminates
- whether repeated retries can overlap workers

**Step 2: Run retry scenario**

Manual sequence:

1. fail once with tiny + WebGPU
2. retry without full page refresh
3. retry after full page refresh

Capture whether second run fails faster or with different behavior.

**Step 3: Evaluate**

Interpretation:

- faster second failure suggests retained GPU state/leak
- identical failure from clean refresh suggests deterministic allocation issue, not leak

**Step 4: Commit**

No commit.

### Task 8: Build the minimal repro matrix

**Files:**
- No code changes required

**Step 1: Run this exact matrix**

From clean reloads, test:

1. tiny + WebGPU + segmentation ON
2. tiny + WebGPU + segmentation OFF
3. tiny + WASM + segmentation ON
4. tiny + WASM + segmentation OFF
5. small + WebGPU + segmentation OFF
6. current branch vs last-known-good branch for tiny + WebGPU + segmentation OFF

**Step 2: Record result table**

Columns:

- branch
- model
- backend
- segmentation
- dtype
- pass/fail
- failure stage
- notes

**Step 3: Use the table to classify cause**

Choose one bucket:

1. default/runtime option regression
2. dependency regression
3. lifecycle leak
4. environment-only issue
5. mixed cause

**Step 4: Commit**

No commit.

### Task 9: Write the root-cause report before any fix

**Files:**
- Update: `docs/plans/2026-04-27-webgpu-transcription-regression-investigation.md`

**Step 1: Fill out this report template**

```md
## Investigation Report

### Symptom
- Tiny WebGPU transcription now fails on same machine/browser that previously worked.

### Proven Facts
- [fact]
- [fact]

### Ruled Out
- [not the cause]
- [not the cause]

### Root Cause Hypothesis
- [single best explanation]

### Evidence
- [console/log evidence]
- [git diff evidence]
- [matrix evidence]

### Confidence
- [1-10]

### Next Fix Candidate
- [smallest fix worth testing]
```

**Step 2: Stop after report**

Do not implement fix in this plan. The goal is root cause, not patching.

**Step 3: Commit**

No commit.

---

## Decision Gates

Stop and ask for direction if any of these happen:

1. The bug cannot be reproduced on the current branch anymore.
2. The bug reproduces only after display sleep/wake or other external GPU events.
3. No code or dependency difference correlates with the regression after 3 tested hypotheses.
4. Fix would require broad architectural changes before root cause is proven.

## Expected Outputs

By the end of this investigation, we must have:

1. One deterministic failing case
2. One deterministic passing control case
3. Exact runtime parameters for both
4. Evidence showing whether failure is initialization-time or inference-time
5. A narrow root-cause hypothesis tied to specific code or dependency changes

## Notes from current context

- Same machine/browser as previously working runs
- Previously working models: tiny and small
- Current failing case: tiny on WebGPU
- Speaker segmentation was enabled during failure
- Current code read suggests diarization starts only after transcription result, so segmentation is likely incidental unless stale worker/lifecycle interaction is proven

## Investigation Report

### Symptom
- Local WebGPU transcription now fails for tiny on the same machine/browser that previously worked.
- User-facing message mentions `onnx/decoder_model_merged_q4.onnx` and GPU out-of-memory/device-loss.

### Proven Facts
- `applyOptionalSpeakerSegmentation(...)` runs only after transcription emits a `result` event.
- Current branch added optional diarization, but that path is downstream of transcription completion.
- Current branch changed transcription language selection to follow app locale:
  - `apps/octra/src/app/core/component/octra-dropzone/auto-transcribe-options.component.ts:396`
  - `selectedLanguage = 'en'`
  - `applyAppLanguage(this.transloco.getActiveLang())`
- App locale defaults to English unless user/browser/app settings override it:
  - `apps/octra/src/app/app.transloco.ts:27`
  - `defaultLang: 'en'`
  - `apps/octra/src/app/core/store/application/application-session.effects.ts:58-60`
- Non-Swedish transcription switches from KB Whisper models to OpenAI Whisper models:
  - `auto-transcribe-options.component.ts:447-460`
- Known-good transcription UI used fixed Swedish default:
  - commit `819f19d75`
  - `selectedLanguage = 'sv'`
- There is no branch-local dependency drift in `@huggingface/transformers` or ONNX Runtime during this diarization work:
  - current package still uses `@huggingface/transformers ^3.8.1`
  - lockfile still resolves `onnxruntime-web 1.22.0-dev.20250409-89f8206ba4`
- HF manifests show both tiny repos expose `decoder_model_merged_q4.onnx`, but current branch can now silently route users to a different tiny model family than before:
  - previous likely path: `onnx-community/kb-whisper-tiny-ONNX`
  - current likely path under English locale: `onnx-community/whisper-tiny-ONNX`

### Ruled Out
- Direct diarization-before-transcription causality
- Branch-local `transformers` / ORT version bump as part of this diarization work
- Worker dtype change inside `whisper-transcription.worker.ts`

### Current Best Root Cause Hypothesis
- The regression is most likely not caused by speaker segmentation itself.
- The stronger candidate is a transcription model-selection regression introduced by locale-following behavior.
- Before, the transcription UI defaulted to Swedish, which selected KB Whisper tiny/small models.
- Now the UI defaults to the active app language, usually English, which selects OpenAI Whisper tiny/small models.
- So the user can still think they selected “tiny”, but the app may now load a different tiny model family and WebGPU artifact path than the previously working one.

### Why this explains the report
- Same machine/browser can still regress if the actual model behind the same “tiny” label changed.
- The error references a decoder q4 artifact during model load/application, consistent with a different WebGPU model path rather than a post-transcription diarization step.

### Remaining Proof Needed
- Live runtime console evidence from the new instrumentation showing actual values for:
  - `modelId`
  - `language`
  - `dtype`
  - `useWebGPU`
  - whether failure occurs during pipeline load or inference
- A paired manual repro comparing:
  - tiny + English/default locale + WebGPU
  - tiny + Swedish locale + WebGPU
  - same cases with segmentation off

### Confidence
- 7/10

### Next Fix Candidate
- Do not fix yet.
- First prove the hypothesis with runtime logs.
- If confirmed, the smallest likely fix is to stop silently changing the transcription model family when the app locale changes, or default local transcription back to Swedish KB Whisper unless the user explicitly chooses another language.
