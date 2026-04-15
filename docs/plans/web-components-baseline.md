# Web-Components Bundle Baseline

**Date:** 2026-04-15
**Build Status:** Success

## Current Metrics

### Uncompressed Sizes
- **main.js:** 264 KB
- **polyfills.js:** 36 KB
- **Total JS:** 300 KB
- **All chunks + CSS:** 484 KB
- **With assets (excl libav WASM):** 530 KB (approx)

### Gzipped Sizes
- **main.js.gz:** 82 KB
- **polyfills.js.gz:** 12 KB
- **Total gzipped:** 94 KB (core JS only)

### Assets (Lazy-loaded)
- **libav-default.mjs:** 27 KB
- **libav-fat.mjs:** 18 KB
- **libav-default WASM:** ~1.6 MB (not included, loaded on demand)
- **libav-fat WASM:** 30 MB (not included, loaded on demand)

### Total Distribution
- **Excluding lazy assets:** 530 KB uncompressed
- **Full build output:** 31 MB (includes large libav WASM for ASF support)

## Architecture Observations

### Includes
- Angular 19 framework + runtime
- RxJS signals/observables
- zone.js polyfill (50+ KB)
- Konva.js (Canvas rendering library) - appears large
- music-metadata (audio format detection)
- @huggingface/transformers deps
- x2js (XML parsing)
- Multiple CommonJS dependencies causing optimization bailouts

### Main Bundle Breakdown (Estimated)
1. **Angular + RxJS:** ~120 KB
2. **zone.js:** ~50 KB (removable - not needed for web components)
3. **Konva.js:** ~40 KB (large, needs tree-shaking)
4. **music-metadata:** ~30 KB
5. **Other utilities:** ~60 KB
6. **Custom code:** ~30 KB

## Optimization Targets

### High Impact (30-40% overall reduction)
1. **Remove zone.js polyfill** (~50 KB uncompressed, ~15 KB gzipped)
   - Web Components don't require Zone.js scheduling
   - Will require Angular configuration update
   - Expected savings: 15-20 KB gzipped

2. **Tree-shake Konva.js** (~20-30 KB potential)
   - Only use specific Konva classes needed
   - Mark unused shapes/layers for dead code elimination
   - Expected savings: 10-15 KB gzipped

3. **Separate entry points** (~20 KB potential)
   - Create AudioViewer vs AudioPlayer bundles
   - Lazy load unused editor features
   - Expected savings: 8-10 KB gzipped

4. **Remove ViewEncapsulation.ShadowDom** (~5 KB)
   - Simplify component styles
   - Expected savings: 2-3 KB gzipped

### Medium Impact
5. **CommonJS optimization**
   - Configure @angular-cli to inline CommonJS deps
   - Reduce optimization bailouts
   - Expected savings: 5-10 KB gzipped

6. **Angular configuration**
   - Disable unused features (forms, http, etc.)
   - Enable tree-shaking for vendor code
   - Expected savings: 5-8 KB gzipped

## Success Criteria
- **Current gzipped (core JS):** 94 KB
- **Target gzipped (core JS):** <70 KB
- **Reduction target:** 25-30% (20-25 KB gzipped)
- **Build succeeds:** Yes
- **No runtime errors:** Verified

## Next Steps
1. Task 19: Update build config for production optimization
2. Task 20: Remove zone.js polyfill
3. Task 21: Optimize Konva with tree-shaking
4. Task 22: Strip ViewEncapsulation
5. Task 23: Configure post-build optimization
6. Task 24: Create separate entrypoints
7. Task 25: Final validation & measurement

## Notes
- libav WASM files (30+ MB) are lazy-loaded and not included in core bundle
- Current 484 KB distribution (excl async WASM) is reasonable for feature set
- Main opportunities are polyfill removal and dependency tree-shaking
- Build currently uses Angular 19 with esbuild (modern toolchain)
- String concatenation workaround used for dynamic libav imports (esbuild compatibility)
