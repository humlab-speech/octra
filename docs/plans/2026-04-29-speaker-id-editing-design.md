# Speaker ID Editing Design

**Date:** 2026-04-29
**Status:** Approved

## Goal

Add interactive speaker ID management to OCTRA: a navbar dropdown for global speaker renaming, colored speaker badges in the popup editor (click-to-cycle), and small colored speaker labels at segment boundaries in the 2D and Linear editors (click-to-cycle).

## Approach

Pure derivation — no new NgRx state. All speaker information is derived from existing `Speaker` annotation labels on `OctraAnnotationSegment`. A thin `SpeakerManagementService` provides color lookup, text contrast, and cycling logic. Dispatch uses existing annotation actions.

## Color Palette

17 colors, auto-assigned by sorted speaker ID index (`% 17` for overflow):

```
#2A4765  #4A5E7A  #A8C3D4  #3D6B5C  #73A790
#C4D4C0  #5B8E8A  #D7B17C  #C2A08A  #B87D5E
#C9918A  #EABAB9  #9C7A8C  #6B5B6E  #8B8FAE
#D4C7B5  #000000
```

Text color: WCAG relative luminance threshold 0.179 — beige `#F1EFE4` for dark backgrounds, black `#000000` for light.

## Components

### 1. SpeakerManagementService

**File:** `apps/octra/src/app/core/shared/service/speaker-management.service.ts`

Injectable at root. Pure computation, no stored state.

| Method | Description |
|--------|-------------|
| `getSpeakerIds(annotation)` | Collect unique non-empty Speaker label values across all segment levels, return sorted string array |
| `getColor(speakerId, allIds)` | `SPEAKER_COLORS[sortedIds.indexOf(id) % 17]` |
| `getTextColor(bgHex)` | WCAG relative luminance < 0.179 → `#F1EFE4`, else `#000000` |
| `cycleNext(currentId, allIds)` | Next in sorted array, wraps to first |
| `renameSpeaker(oldId, newId, annotation)` | Returns annotation clone with all matching Speaker labels updated (pure, caller dispatches) |

### 2. Navbar Speaker Dropdown

**Files:** `apps/octra/src/app/core/component/navbar/navbar.component.html` + `.ts`

- Sibling to existing tier dropdown, inside same `<ul class="navbar-nav">`
- Rendered only when `hasSpeakers` (at least one non-empty Speaker label exists)
- Toggle shows speaker icon
- Dropdown row per speaker: 16×16px color swatch + inline text input for rename
- Input blur triggers `onSpeakerNameLeave(event, oldId)`:
  1. Calls `speakerManagementService.renameSpeaker(oldId, newId, transcript)`
  2. Dispatches `AnnotationActions.overwriteTranscript({ transcript: newAnnotation })`
  3. Blocked if new name is empty (same validation as tier names)
- Rename to existing ID merges speakers (natural behavior, no special handling)

### 3. Transcr-window Popup Editor

**Files:** `apps/octra/src/app/editors/2D-editor/transcr-window/transcr-window.component.html` + `.ts`

Existing `speaker-badge` div extended:
- `[style.background-color]="speakerColor"` from `getColor()`
- `[style.color]="speakerTextColor"` from `getTextColor()`
- `(click)="cycleSpeaker()"` — calls `cycleNext()`, updates segment Speaker label via existing segment-save flow (`changeFirstLabelWithoutName`)

New getters in component:
- `speakerIds`: unique sorted speaker IDs from current annotation
- `speakerColor`: derived from `currentSegmentSpeaker`
- `speakerTextColor`: derived from `speakerColor`
- `cycleSpeaker()`: calls `cycleNext()`, updates label, triggers existing save path

### 4. Canvas Speaker Labels (2D + Linear editors)

**File:** `libs/ngx-components/src/lib/components/audio/audio-viewer/audio-viewer.service.ts`

After each boundary line is drawn (existing loop ~line 1561), add Konva speaker label for the segment starting at that boundary:

- Read speaker ID from the next segment's Speaker label
- Skip if empty
- Draw `Group` on `this.layers.boundaries`, id: `speaker_label_${boundary.id}`:
  - `Rect`: `fill = speakerColor`, height 16px, width fitted to text + 6px padding, `cornerRadius: 2`, position: `x = boundary.x + 4`, `y = boundary.y`
  - `Text`: speaker ID, `fontSize: 10`, `fill = speakerTextColor`, offset 3px inside rect
- Remove and redraw on segment update (same lifecycle as boundary lines)
- Click handler: `cycleNext()` → emit `currentLevelChange` with updated annotation

Applies to both multi-line (2D editor) and single-line (Linear editor) viewers since both use `AudioViewerService`.

## Data Flow

### Rename (navbar)
```
input blur → onSpeakerNameLeave(oldId, newId)
  → speakerManagementService.renameSpeaker(oldId, newId, transcript)
  → AnnotationActions.overwriteTranscript({ transcript })
  → reducer updates store → IDB effect persists → UI redraws
```

### Click-to-cycle (canvas)
```
Konva click on speaker label group
  → speakerManagementService.cycleNext(currentId, allIds)
  → update segment.labels Speaker value
  → emit currentLevelChange
  → 2D-editor / linear-editor onCurrentLevelChange() dispatches to store
```

### Click-to-cycle (popup)
```
badge click → cycleSpeaker()
  → speakerManagementService.cycleNext(currentId, allIds)
  → segment.changeFirstLabelWithoutName('Speaker', nextId)
  → existing segment save flow → store dispatch
```

## Edge Cases

| Case | Handling |
|------|----------|
| Rename to existing ID | Merge — both speaker sets share one color entry |
| Rename to empty string | Blocked by input validation |
| Speaker removed entirely | Color map recomputes from remaining sorted IDs |
| >17 speakers | Colors wrap via `% 17` |
| Segment has no Speaker label | No canvas label drawn, badge hidden |
