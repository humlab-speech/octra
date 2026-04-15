# Better ROI Alternatives to Svelte Conversion — Master Plan Summary

**Decision:** Rather than full Svelte rewrite (18-36 dev-months, high risk), execute three incremental improvements that deliver immediate, measurable value with low risk.

---

## Three Parallel Work Streams

### 1. Standalone Component Migration
**File:** `docs/plans/2026-04-15-standalone-migration.md`

**Scope:** Remove 9 NgModule wrappers, modernize deprecated APIs, simplify DI

**Effort:** 18-24 dev-hours  
**Risk:** Low — all changes are refactors, all standalone components already exist  
**Benefit:** Reduces runtime overhead, improves tree-shaking, modernizes codebase, enables next two improvements  
**Key Tasks:**
- Convert `DefaultComponent` to standalone
- Replace `ComponentFactoryResolver` with modern `ViewContainerRef.createComponent()`
- Dissolve `AppSharedModule`, `ModalsModule`, `PagesModule`, `InternModule` to providers arrays
- Update `main.ts` to use direct module imports instead of `importProvidersFrom()`
- Migrate child routes to `loadComponent`

**Go/No-Go Decision:** Essential prerequisite for Signals migration. Low risk. **Recommend: START FIRST.**

---

### 2. Signals-First Store Facades
**File:** `docs/plans/2026-04-15-signals-first-facades.md`

**Scope:** Convert 4 store facades (AnnotationStoreService, ApplicationStoreService, AuthenticationStoreService, AsrStoreService) from Observable-returning properties to Angular 17+ Signals

**Effort:** 12-16 dev-hours  
**Risk:** Low-Medium — well-tested, incremental property conversion, backward-compat easy with Observable overloads  
**Benefit:**
- Eliminates RxJS subscription overhead
- Simplifies component templates (remove `async` pipe)
- Enables zoneless change detection (optional, post-signals)
- Reduces NgRx boilerplate (no need for every Observable facade property)
- Signals are O(1) change detection vs Observable O(n)

**Key Tasks:**
- Convert `ApplicationStoreService` properties to `store.selectSignal()`
- Convert `AnnotationStoreService` (largest, 50+ properties) in two parts: simple + computed
- Convert `AuthenticationStoreService` and `AsrStoreService`
- Update components to call `facade.property()` instead of `(facade.property$ | async)`
- Test suite to verify all store logic works with signals

**Dependency:** Requires Standalone migration to be done first (cleaner module structure)  
**Go/No-Go Decision:** Medium complexity, high return. **Recommend: START SECOND.**

---

### 3. Web-Components Bundle Optimization
**File:** `docs/plans/2026-04-15-web-components-optimization.md`

**Scope:** Reduce published web-components bundle by 30-40% through build config tuning, zoneless change detection, tree-shaking, separate component bundles

**Effort:** 10-14 dev-hours  
**Risk:** Low — pure build config changes, safe to rollback  
**Benefit:**
- Remove zone.js (~50KB gzipped)
- Tree-shake unused Konva plugins (~30KB)
- Remove unnecessary view encapsulation (~5KB)
- Split AudioViewer + Audioplayer into separate bundles with shared runtime (~20KB)
- Target: 200-300KB gzipped → 120-180KB gzipped

**Key Tasks:**
- Measure baseline bundle size
- Enable production optimizations in build config
- Remove zone.js, enable zoneless change detection
- Tree-shake Konva imports
- Strip unnecessary ViewEncapsulation.ShadowDom
- Create separate viewer/player entrypoints
- Add post-build optimization script
- Measure final size and validate

**Dependency:** Optional, but works best after Signals migration (cleaner code = better tree-shaking)  
**Go/No-Go Decision:** Direct value for consumers, low risk. **Recommend: START AFTER SIGNALS (or in parallel).**

---

## Estimated Total Effort & Timeline

| Plan | Hours | Sequential Order | Can Parallelize |
|------|-------|------------------|-----------------|
| Standalone Migration | 18-24 | 1st | No (prerequisite) |
| Signals-First Facades | 12-16 | 2nd | No (depends on 1) |
| Web-Components Optimization | 10-14 | 3rd | Yes (after 1, parallel with 2) |
| **Total** | **40-54 hours** | ~6-8 dev-days | ~5-6 dev-days with parallelization |

**vs. Svelte Conversion:** 18-36 dev-**months** (540-1080 hours)

**ROI:** Better Alternatives deliver measurable improvements in 1/10th the effort with zero risk of breaking core functionality.

---

## Success Metrics

### After Plan 1 (Standalone Migration):
- [ ] All 9 NgModules converted to providers
- [ ] No deprecation warnings from Angular compiler
- [ ] Bundle size slightly reduced (5-10%)
- [ ] All tests pass
- [ ] Codebase ready for Signals migration

### After Plan 2 (Signals-First Facades):
- [ ] 4 store facades converted to Signals
- [ ] 50+ Observable properties replaced with Signals
- [ ] All 115 i18n components updated to call Signals
- [ ] Templates simplified (async pipe removed where applicable)
- [ ] Bundle size reduced by 3-5% (fewer RxJS subscriptions)
- [ ] Change detection performance improved on high-frequency updates

### After Plan 3 (Web-Components Optimization):
- [ ] Web-components bundle 30-40% smaller (verified with gzip)
- [ ] zone.js removed
- [ ] Separate viewer/player bundles published
- [ ] All web-components tests pass
- [ ] web-components-demo renders correctly
- [ ] Consumers can use lighter bundles

---

## Execution Paths

Choose one:

### Option A: Subagent-Driven (This Session)
- Fresh subagent per task, code review between tasks
- Fast feedback loop
- Risk: context overhead for subagents
- Timeline: 6-8 days with 1 dev (5-6 with parallelization)

### Option B: Parallel Sessions (Separate Terminals)
- Open new session with `superpowers:executing-plans`
- Each plan runs in dedicated session
- Batch execution with checkpoints
- Timeline: Same as A, but parallelizable more effectively

### Option C: Sequential Single-Dev
- One developer works through plans in order
- Takes more calendar time but simplest execution
- Timeline: 2-3 weeks (part-time) or 6-8 days (full-time)

---

## Recommended Approach

**Start with Plan 1 (Standalone Migration)** as prerequisite, then:

**For velocity:** Options A + B in parallel
- Subagent 1: Execute Plan 1 (Standalone)
- Once Plan 1 done: Subagent 2 starts Plan 2 (Signals) while Subagent 3 does Plan 3 (Web-Components)

**For safety:** Sequential (Option C)
- Complete Plan 1 fully (review, test, deploy)
- Complete Plan 2 fully
- Complete Plan 3

---

## What Comes After

If these 3 plans complete successfully:

1. **Optional: Zoneless Change Detection** (2-4 hours)
   - All components now signal-driven
   - Remove zone.js from main providers
   - Enable `provideExperimentalZonelessChangeDetection()`
   - Expected: Additional 10-15% performance improvement on change detection

2. **Consider: Lighter Modal Library**
   - @ng-bootstrap is good but includes tooltip, dropdown, collapse
   - For web-components consumers, a smaller modal-only library saves bandwidth
   - But: lower priority than the 3 plans above

3. **Consider: Vite Migration** (future, not included in this plan)
   - Nx 20 now has Vite support for Angular
   - Could replace webpack-based dev server
   - Faster HMR, smaller dev bundles
   - Lower urgency after Standalone migration done

---

## Questions?

- Prefer sequential or parallel execution?
- Any blockers before starting Plan 1?
- Want to split work across team or single developer?

Plans are ready to execute. Invoke superpowers:executing-plans or superpowers:subagent-driven-development to begin.
