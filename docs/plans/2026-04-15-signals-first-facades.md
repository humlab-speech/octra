# Signals-First Store Facades Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Migrate store facade services (`AnnotationStoreService`, `ApplicationStoreService`, `AuthenticationStoreService`, `AsrStoreService`) from Observable-returning properties to Angular 17+ Signals. Reduce NgRx boilerplate, simplify component subscriptions, enable zoneless change detection.

**Architecture:** Convert 50+ Observable properties to Signal equivalents using `store.selectSignal()` (NgRx 17+). Remove `async` pipe from templates (signals integrate natively with OnPush). Update components using facades to consume signals directly (no subscription needed). Maintain backward compatibility with Observable overloads during migration.

**Tech Stack:** Angular 19 Signals, @ngrx/store selectSignal(), ChangeDetectionStrategy.OnPush.

**Rationale:** Signals eliminate RxJS subscription management overhead, improve change detection efficiency (O(1) vs O(n)), enable eventual zoneless change detection, reduce template boilerplate. Components already use OnPush + async pipe; signals make this pattern cleaner. 12-16 dev-hours estimated.

---

## Phase 1: ApplicationStoreService

### Task 1: Analyze current ApplicationStoreService

**Files:**
- Read: `apps/octra/src/app/core/store/application/application-store.service.ts`

**Step 1: Inspect service**

```bash
cat apps/octra/src/app/core/store/application/application-store.service.ts | head -100
```

**Expected output:** Mix of Observable properties (`this.store.select(...)`) and one Signal property (`selectSignal`).

**Step 2: List all properties**

Grep for property declarations:

```bash
grep -E "^\s+([\w]+)\s*=" apps/octra/src/app/core/store/application/application-store.service.ts | head -30
```

**Expected:** ~15-20 Observable properties. Document which ones can be safely converted to Signals.

---

### Task 2: Convert ApplicationStoreService properties to Signals

**Files:**
- Modify: `apps/octra/src/app/core/store/application/application-store.service.ts`

**Step 1: Update service**

```typescript
// apps/octra/src/app/core/store/application/application-store.service.ts

import { Injectable } from '@angular/core';
import { Store } from '@ngrx/store';
import { RootState } from '../index';
import {
  selectApplicationLoaded,
  selectMode,
  selectHasLoadedOctraData,
  selectOctraData,
  selectShowSidebar
} from './application.selectors';

@Injectable({
  providedIn: 'root'
})
export class ApplicationStoreService {
  constructor(private store: Store<RootState>) {}

  // Convert Observable returns to Signals
  applicationLoaded = this.store.selectSignal(selectApplicationLoaded);
  mode = this.store.selectSignal(selectMode);
  hasLoadedOctraData = this.store.selectSignal(selectHasLoadedOctraData);
  octraData = this.store.selectSignal(selectOctraData);
  showSidebar = this.store.selectSignal(selectShowSidebar);
  
  // ... (convert all remaining Observable properties to selectSignal)
  
  // Keep dispatchers as-is (no change needed)
  dispatchAction(action: any) {
    this.store.dispatch(action);
  }
}
```

**Step 2: Verify all properties converted**

```bash
grep "this.store.select(" apps/octra/src/app/core/store/application/application-store.service.ts
```

**Expected:** No results (all converted to `selectSignal`).

**Step 3: Commit**

```bash
git add apps/octra/src/app/core/store/application/application-store.service.ts
git commit -m "refactor: convert ApplicationStoreService to signals-first"
```

---

## Phase 2: AnnotationStoreService (largest facade, ~995 lines)

### Task 3: Identify Signal candidates in AnnotationStoreService

**Files:**
- Read: `apps/octra/src/app/core/store/login-mode/annotation/annotation.store.service.ts`

**Step 1: Analyze structure**

```bash
grep -E "^\s+([\w]+)\s*=" apps/octra/src/app/core/store/login-mode/annotation/annotation.store.service.ts | wc -l
```

**Expected:** 50-70 properties. Document which are:
- Read-only state selectors (convert to Signals)
- Computed derived state (keep as Observable or convert + use `computed()`)
- Action dispatchers (leave unchanged)

**Step 2: Categorize properties**

Create a checklist:

```bash
grep -E "^\s+([\w]+)\s*=\s*this\.store\.(select|selectSignal)" apps/octra/src/app/core/store/login-mode/annotation/annotation.store.service.ts
```

Document output for next step.

---

### Task 4: Convert AnnotationStoreService (part 1: simple properties)

**Files:**
- Modify: `apps/octra/src/app/core/store/login-mode/annotation/annotation.store.service.ts`
- Reference: Previous grep output from Task 3

**Step 1: Replace Observable selectors with selectSignal**

Batch convert all simple state reads:

```typescript
// Before (Observable)
currentLevel$: Observable<OCTRALevel | undefined> = this.store.select(selectCurrentLevel);

// After (Signal)
currentLevel = this.store.selectSignal(selectCurrentLevel);
```

Run a sed script or manually update top ~30 properties:

```bash
# Example: convert specific property
# In the editor, find each "this.store.select(" and replace with "this.store.selectSignal("
# (Do this in batches per property; exact count depends on file analysis)
```

**Step 2: Leave Action Dispatcher Methods Unchanged**

Methods like `setCurrentLevel(level: OCTRALevel)` that call `this.store.dispatch(...)` stay as-is.

**Step 3: Commit part 1**

```bash
git add apps/octra/src/app/core/store/login-mode/annotation/annotation.store.service.ts
git commit -m "refactor: convert AnnotationStoreService simple properties to signals (part 1)"
```

---

### Task 5: Convert AnnotationStoreService (part 2: computed properties)

**Files:**
- Modify: `apps/octra/src/app/core/store/login-mode/annotation/annotation.store.service.ts`

**Step 1: Identify computed properties**

```bash
grep -B2 "combineLatest\|withLatestFrom\|map\|switchMap" apps/octra/src/app/core/store/login-mode/annotation/annotation.store.service.ts | head -20
```

These are derived states (compositions of 2+ signals). Convert to Angular `computed()`:

```typescript
// Before (Observable)
private currentTask$ = combineLatest([
  this.store.select(selectCurrentTaskId),
  this.store.select(selectTasks)
]).pipe(
  map(([taskId, tasks]) => tasks.find(t => t.id === taskId))
);

// After (Signal with computed)
private currentTaskId = this.store.selectSignal(selectCurrentTaskId);
private tasks = this.store.selectSignal(selectTasks);
currentTask = computed(() => 
  this.tasks()?.find(t => t.id === this.currentTaskId())
);
```

**Step 2: Convert 5-10 key computed properties**

Focus on high-use derived state (annotation level, task info, bundle data).

**Step 3: Commit part 2**

```bash
git add apps/octra/src/app/core/store/login-mode/annotation/annotation.store.service.ts
git commit -m "refactor: convert AnnotationStoreService computed properties to signal-based (part 2)"
```

---

## Phase 3: AuthenticationStoreService & AsrStoreService

### Task 6: Convert AuthenticationStoreService

**Files:**
- Modify: `apps/octra/src/app/core/store/authentication/authentication-store.service.ts`

**Step 1: Convert all properties to signals**

```typescript
// apps/octra/src/app/core/store/authentication/authentication-store.service.ts

import { Injectable } from '@angular/core';
import { Store } from '@ngrx/store';
import { RootState } from '../index';
import {
  selectAuthMe,
  selectAuthLoading,
  selectAuthError
} from './authentication.selectors';

@Injectable({ providedIn: 'root' })
export class AuthenticationStoreService {
  constructor(private store: Store<RootState>) {}

  // Convert all to signals
  me = this.store.selectSignal(selectAuthMe);
  loading = this.store.selectSignal(selectAuthLoading);
  error = this.store.selectSignal(selectAuthError);
  
  // Dispatchers unchanged
  dispatchLogin(email: string, password: string) {
    this.store.dispatch(AuthenticationActions.login({ email, password }));
  }
}
```

**Step 2: Commit**

```bash
git add apps/octra/src/app/core/store/authentication/authentication-store.service.ts
git commit -m "refactor: convert AuthenticationStoreService to signals-first"
```

---

### Task 7: Convert AsrStoreService

**Files:**
- Modify: `apps/octra/src/app/core/store/asr/asr-store-service.service.ts`

**Step 1: Convert all properties**

Same pattern as Task 6.

**Step 2: Commit**

```bash
git add apps/octra/src/app/core/store/asr/asr-store-service.service.ts
git commit -m "refactor: convert AsrStoreService to signals-first"
```

---

## Phase 4: Update Components to Consume Signals

### Task 8: Update TranscriptionComponent (heavy store usage)

**Files:**
- Modify: `apps/octra/src/app/core/pages/intern/transcription/transcription.component.ts`
- Modify: `apps/octra/src/app/core/pages/intern/transcription/transcription.component.html`

**Step 1: Replace async pipe with signal calls**

**Before (template):**

```html
<div>{{ (annotationStore.currentTask$ | async)?.name }}</div>
```

**After (template, with signal):**

```html
<div>{{ annotationStore.currentTask()?.name }}</div>
```

**Step 2: Update component class if any subscriptions exist**

```typescript
// Before
this.annotationStore.currentTask$.subscribe(task => {
  this.currentTask = task;
});

// After (signal, no subscription needed)
currentTask = this.annotationStore.currentTask;
```

**Step 3: Run test for this component**

```bash
npm test -- apps/octra --include='**/transcription.component.spec.ts'
```

**Expected:** All tests pass.

**Step 4: Commit**

```bash
git add apps/octra/src/app/core/pages/intern/transcription/transcription.component.ts apps/octra/src/app/core/pages/intern/transcription/transcription.component.html
git commit -m "refactor: update TranscriptionComponent to consume signals from store facade"
```

---

### Task 9: Batch update remaining high-use components

**Files:**
- Components consuming store facades:
  - `projects-list.component.ts` / `.html`
  - `navbar.component.ts` / `.html`
  - `transcr-editor.component.ts` / `.html`
  - `transcr-overview.component.ts` / `.html`
  - `audio-navigation.component.ts` / `.html`

**Step 1: For each component:**

1. Replace `(facade.property$ | async)` with `facade.property()`
2. Remove any manual subscriptions to facade properties
3. Keep change detection strategy as-is (OnPush will still work, now more efficiently)

**Step 2: Run full test suite**

```bash
npm test -- apps/octra --watch=false
```

**Expected:** All tests pass.

**Step 3: Commit per component or batch:**

```bash
git add apps/octra/src/app/core/pages/intern/projects-list/
git commit -m "refactor: projects-list consumes signals from store facade"

git add apps/octra/src/app/core/component/navbar/
git commit -m "refactor: navbar consumes signals from store facade"

# ... (repeat for others)
```

---

## Phase 5: Build & Verify

### Task 10: Build and test

**Run:**

```bash
npm run build -- apps/octra
npm test -- apps/octra --watch=false
```

**Expected:** Build succeeds, all tests pass.

**Verify bundle size:**

```bash
npm run analyze:octra
```

Expected: Similar or slightly smaller (Signals have minimal overhead compared to async pipe + Observable subscription).

**Commit:**

```bash
git add .
git commit -m "refactor: signals-first store facades reduce NgRx boilerplate and improve change detection"
```

---

## Phase 6: Optional Zoneless Change Detection (Post-Signals)

### Task 11: (Future) Enable experimental zoneless change detection

Once all components consume signals, you can optionally enable Angular's experimental zoneless mode in main.ts:

```typescript
import { provideExperimentalZonelessChangeDetection } from '@angular/core';

bootstrapApplication(AppComponent, {
  providers: [
    provideExperimentalZonelessChangeDetection(),
    // ... rest of providers
  ]
});
```

This removes zone.js overhead entirely (~50KB). Requires all change detection to be signal-driven (which you now have).

---

## Notes

- **Backward Compatibility:** If any external libs still depend on Observable-returning facades, add Observable overloads temporarily:
  ```typescript
  // Keep for backward compat
  currentTask$ = toObservable(this.currentTask);
  ```
- **Testing:** Update mock facades to return signals instead of Observables (or mock `toSignal(observable$)`).
- **RxJS Interop:** Use `toSignal()` and `toObservable()` for any remaining Observable-signal bridges.

---

## Execution Paths

**Plan saved to `docs/plans/2026-04-15-signals-first-facades.md`**

Two execution options:

**1. Subagent-Driven (this session)** — Fresh subagent per task, code review between tasks

**2. Parallel Session (separate)** — Open new session with superpowers:executing-plans, batch execution with checkpoints

Which approach?
