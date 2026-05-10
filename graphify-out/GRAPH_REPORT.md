# Graph Report - libs  (2026-05-10)

## Corpus Check
- 190 files · ~73,971 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1242 nodes · 1627 edges · 59 communities detected
- Extraction: 82% EXTRACTED · 18% INFERRED · 0% AMBIGUOUS · INFERRED: 295 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Audio Selection & Playback|Audio Selection & Playback]]
- [[_COMMUNITY_Annotation Core Operations|Annotation Core Operations]]
- [[_COMMUNITY_Format Converters (PraatELAN)|Format Converters (Praat/ELAN)]]
- [[_COMMUNITY_Audio Decoding|Audio Decoding]]
- [[_COMMUNITY_Module 4|Module 4]]
- [[_COMMUNITY_Module 5|Module 5]]
- [[_COMMUNITY_Module 6|Module 6]]
- [[_COMMUNITY_Module 7|Module 7]]
- [[_COMMUNITY_Module 8|Module 8]]
- [[_COMMUNITY_Module 9|Module 9]]
- [[_COMMUNITY_ASR Configuration UI|ASR Configuration UI]]
- [[_COMMUNITY_Audio Visualization|Audio Visualization]]
- [[_COMMUNITY_Worker Thread Management|Worker Thread Management]]
- [[_COMMUNITY_Binary Data Parsing|Binary Data Parsing]]
- [[_COMMUNITY_Converter Framework|Converter Framework]]
- [[_COMMUNITY_Binary Write Operations|Binary Write Operations]]
- [[_COMMUNITY_Library Documentation|Library Documentation]]
- [[_COMMUNITY_Converter Utilities|Converter Utilities]]
- [[_COMMUNITY_Bug Report Modal|Bug Report Modal]]
- [[_COMMUNITY_Audio Player Controls|Audio Player Controls]]
- [[_COMMUNITY_Keyboard Shortcuts|Keyboard Shortcuts]]
- [[_COMMUNITY_WAV Format Handling|WAV Format Handling]]
- [[_COMMUNITY_Word Document Export|Word Document Export]]
- [[_COMMUNITY_Audio Format Metadata|Audio Format Metadata]]
- [[_COMMUNITY_Whisper Transcription Format|Whisper Transcription Format]]
- [[_COMMUNITY_Component Suite (Audio)|Component Suite (Audio)]]
- [[_COMMUNITY_Audio Information|Audio Information]]
- [[_COMMUNITY_Application Support Registry|Application Support Registry]]
- [[_COMMUNITY_Media Resource Abstraction|Media Resource Abstraction]]
- [[_COMMUNITY_Directory Information|Directory Information]]
- [[_COMMUNITY_Generic Data Information|Generic Data Information]]
- [[_COMMUNITY_Audio Time Calculations|Audio Time Calculations]]
- [[_COMMUNITY_Module 32|Module 32]]
- [[_COMMUNITY_Module 33|Module 33]]
- [[_COMMUNITY_Module 34|Module 34]]
- [[_COMMUNITY_Module 35|Module 35]]
- [[_COMMUNITY_Module 36|Module 36]]
- [[_COMMUNITY_Module 37|Module 37]]
- [[_COMMUNITY_Module 38|Module 38]]
- [[_COMMUNITY_Module 39|Module 39]]
- [[_COMMUNITY_Module 41|Module 41]]
- [[_COMMUNITY_Module 42|Module 42]]
- [[_COMMUNITY_Module 43|Module 43]]
- [[_COMMUNITY_Module 44|Module 44]]
- [[_COMMUNITY_Module 45|Module 45]]
- [[_COMMUNITY_Module 46|Module 46]]
- [[_COMMUNITY_Module 47|Module 47]]
- [[_COMMUNITY_Module 48|Module 48]]
- [[_COMMUNITY_Module 49|Module 49]]
- [[_COMMUNITY_Module 50|Module 50]]
- [[_COMMUNITY_Module 51|Module 51]]
- [[_COMMUNITY_Module 54|Module 54]]
- [[_COMMUNITY_Module 55|Module 55]]
- [[_COMMUNITY_Module 59|Module 59]]
- [[_COMMUNITY_Module 60|Module 60]]
- [[_COMMUNITY_Module 61|Module 61]]
- [[_COMMUNITY_Module 62|Module 62]]
- [[_COMMUNITY_Module 63|Module 63]]
- [[_COMMUNITY_Module 113|Module 113]]

## God Nodes (most connected - your core abstractions)
1. `AudioViewerService` - 86 edges
2. `OctraAnnotation` - 38 edges
3. `AudioViewerComponent` - 38 edges
4. `AudioManager` - 27 edges
5. `AudioChunk` - 27 edges
6. `FileInfo` - 23 edges
7. `HtmlAudioMechanism` - 21 edges
8. `ShortcutManager` - 20 edges
9. `BugreportModalComponent` - 18 edges
10. `WavFormat` - 17 edges

## Surprising Connections (you probably didn't know these)
- `cycleNextSpeaker()` --calls--> `sort()`  [INFERRED]
  /Users/frkkan96/Documents/src/octra/libs/ngx-components/src/lib/components/audio/audio-viewer/speaker-colors.ts → /Users/frkkan96/Documents/src/octra/libs/annotation/src/lib/functions.ts
- `setStyle()` --calls--> `getProperties()`  [INFERRED]
  /Users/frkkan96/Documents/src/octra/libs/web-media/src/lib/functions.ts → /Users/frkkan96/Documents/src/octra/libs/utilities/src/lib/functions.ts
- `getSpeakerIds()` --calls--> `sort()`  [INFERRED]
  /Users/frkkan96/Documents/src/octra/libs/ngx-components/src/lib/components/audio/audio-viewer/speaker-colors.ts → /Users/frkkan96/Documents/src/octra/libs/annotation/src/lib/functions.ts
- `getSpeakerColor()` --calls--> `sort()`  [INFERRED]
  /Users/frkkan96/Documents/src/octra/libs/ngx-components/src/lib/components/audio/audio-viewer/speaker-colors.ts → /Users/frkkan96/Documents/src/octra/libs/annotation/src/lib/functions.ts
- `importTextGrid()` --calls--> `readFile()`  [INFERRED]
  /Users/frkkan96/Documents/src/octra/libs/annotation/src/lib/converters/roundtrip.spec.ts → /Users/frkkan96/Documents/src/octra/libs/annotation/src/lib/converters/spec-helpers.ts

## Hyperedges (group relationships)
- **Cross-platform utilities foundation** — readme_utilities_lib, readme_json_sets_lib, readme_assets_lib [INFERRED 0.80]
- **Angular-specific libraries (ngx prefix)** — readme_ngx_utilities_lib, readme_ngx_components_lib [EXTRACTED 1.00]
- **Audio handling libraries (media, web-media, components)** — readme_media_lib, readme_web_media_lib, readme_ngx_components_lib, audioformats_readme [INFERRED 0.75]
- **Form Generator Component Suite** — tool_configurator_component, toolconfig_group_component, toolconfig_array_adder_component [INFERRED 0.85]
- **Audio Component Collection** — audioplayer_component, audio_viewer_component [INFERRED 0.80]

## Communities

### Community 0 - "Audio Selection & Playback"
Cohesion: 0.04
Nodes (5): AudioSelection, AudioViewerService, getSegmentsOfRange(), getStartTimeBySegmentID(), PlayCursor

### Community 1 - "Annotation Core Operations"
Cohesion: 0.03
Nodes (8): OctraAnnotation, OctraAnnotationEventLevel, OctraAnnotationItemLevel, OctraAnnotationLevel, OctraAnnotationLink, OctraAnnotationSegmentLevel, betweenWhichSegment(), makeAnnotation()

### Community 2 - "Format Converters (Praat/ELAN)"
Cohesion: 0.03
Nodes (11): CTMConverter, ELANConverter, FileInfo, contains(), extractFileNameFromURL(), last(), PraatTableConverter, PraatTextgridConverter (+3 more)

### Community 3 - "Audio Decoding"
Cohesion: 0.04
Nodes (14): AudioDecoder, afterAudioContextResumed(), initAudioContext(), play(), prepare(), isSafariOrWebKit(), lanczos(), mixToMono() (+6 more)

### Community 4 - "Module 4"
Cohesion: 0.04
Nodes (13): AudioCutter, FileSizePipe, appendURLQueryParams(), downloadFile(), getBaseHrefURL(), getFileSize(), getProperties(), hasProperty() (+5 more)

### Community 5 - "Module 5"
Cohesion: 0.04
Nodes (10): makeSolutionsUnique(), DecisionTreeCombination, DecisionTreeExpression, DecisionTreeNode, FileSetValidator, IFile, JSONSetFileBlueprint, JSONSetFileConditions (+2 more)

### Community 6 - "Module 6"
Cohesion: 0.05
Nodes (15): SampleUnit, addSegment(), cleanup(), combineSegments(), convertFromSupportedConverters(), removeBySamples(), removeSegmentByIndex(), sort() (+7 more)

### Community 7 - "Module 7"
Cohesion: 0.04
Nodes (13): AnnotJSONConverter, ConfigurationArrayControl, ConfigurationControl, ConfigurationControlGroup, ConfigurationControlOptions, ConfigurationMultipleChoiceControl, ConfigurationNumberControl, ConfigurationSelectControl (+5 more)

### Community 8 - "Module 8"
Cohesion: 0.05
Nodes (2): AudioChunk, AudioManager

### Community 9 - "Module 9"
Cohesion: 0.05
Nodes (10): OAnnotJSON, OEvent, OEventLevel, OItem, OItemLevel, OLabel, OLevel, OLink (+2 more)

### Community 10 - "ASR Configuration UI"
Cohesion: 0.06
Nodes (12): AsrOptionsComponent, destroy(), NgbModalWrapper, openModal(), Interval, Margin, Position, Rectangle (+4 more)

### Community 11 - "Audio Visualization"
Cohesion: 0.06
Nodes (3): AudioViewerComponent, wait(), SubscriptionManager

### Community 12 - "Worker Thread Management"
Cohesion: 0.08
Nodes (3): MultiThreadingService, TsWorkerJob, TsWorker

### Community 13 - "Binary Data Parsing"
Cohesion: 0.14
Nodes (2): BinaryByteReader, WavReader

### Community 14 - "Converter Framework"
Cohesion: 0.1
Nodes (5): escapeXml(), msToTimeString(), pad(), WebVTTConverter, WebVTTConverterImportOptions

### Community 15 - "Binary Write Operations"
Cohesion: 0.17
Nodes (2): BinaryByteWriter, WavWriter

### Community 16 - "Library Documentation"
Cohesion: 0.11
Nodes (22): Angular module import pattern, AudioManager class for audio format handling, Audio format classes for parsing binary data, annotation v1.1.0 TextConverter timestamp format change, json-sets v1.0.0 validator bug fix, ngx-components v1.1.0 version notification component, utilities v1.1.0 appendURLQueryParams function, web-media v1.0.1 release (+14 more)

### Community 17 - "Converter Utilities"
Cohesion: 0.12
Nodes (9): AudioBufferLikeImpl, decodeWithLibAV(), getLibAV(), getLibAVFat(), isPlanar(), toFloat32(), PartiturConverter, importTextGrid() (+1 more)

### Community 18 - "Bug Report Modal"
Cohesion: 0.12
Nodes (2): BugreportModalComponent, getAudioInfo()

### Community 19 - "Audio Player Controls"
Cohesion: 0.15
Nodes (1): AudioplayerComponent

### Community 20 - "Keyboard Shortcuts"
Cohesion: 0.18
Nodes (1): ShortcutManager

### Community 21 - "WAV Format Handling"
Cohesion: 0.16
Nodes (1): WavFormat

### Community 22 - "Word Document Export"
Cohesion: 0.14
Nodes (4): DocxConverter, OdtConverter, buildZip(), crc32bytes()

### Community 23 - "Audio Format Metadata"
Cohesion: 0.12
Nodes (2): init(), MusicMetadataFormat

### Community 24 - "Whisper Transcription Format"
Cohesion: 0.19
Nodes (3): WhisperJSON, WhisperJSONConverter, WhisperJSONSegment

### Community 25 - "Component Suite (Audio)"
Cohesion: 0.17
Nodes (13): ASR Options Component, Audio Module, Audio Viewer Component, Audio Player Component, BugReport Modal Component, Media Library Changelog, Media Library, NGX Components Library (+5 more)

### Community 26 - "Audio Information"
Cohesion: 0.2
Nodes (3): AudioInfo, calculateChannelDataFactor(), normalizeMimeType()

### Community 27 - "Application Support Registry"
Cohesion: 0.18
Nodes (10): AnyTextEditor, AnyVideoPlayer, BASWebservicesApplication, ELANApplication, EMUWebAppApplication, LibreOfficeApplication, OctraApplication, PraatApplication (+2 more)

### Community 28 - "Media Resource Abstraction"
Cohesion: 0.22
Nodes (1): MediaResource

### Community 29 - "Directory Information"
Cohesion: 0.31
Nodes (1): DirectoryInfo

### Community 30 - "Generic Data Information"
Cohesion: 0.25
Nodes (1): DataInfo

### Community 31 - "Audio Time Calculations"
Cohesion: 0.32
Nodes (1): AudioTimeCalculator

### Community 32 - "Module 32"
Cohesion: 0.46
Nodes (6): baseCode(), formatLanguageLabel(), getEnglishLanguageLabel(), lookupDisplayName(), pickInitialLevelName(), stripTrailingParens()

### Community 33 - "Module 33"
Cohesion: 0.29
Nodes (1): TimespanPipe

### Community 34 - "Module 34"
Cohesion: 0.33
Nodes (1): BrowserInfo

### Community 35 - "Module 35"
Cohesion: 0.33
Nodes (1): AudioResource

### Community 36 - "Module 36"
Cohesion: 0.33
Nodes (2): AudioFormat, PCMAudioFormat

### Community 37 - "Module 37"
Cohesion: 0.33
Nodes (1): BundleJSONConverter

### Community 38 - "Module 38"
Cohesion: 0.33
Nodes (3): JSONSet, JSONSetCombination, JSONSetStatement

### Community 39 - "Module 39"
Cohesion: 0.4
Nodes (1): LibavFormat

### Community 41 - "Module 41"
Cohesion: 0.5
Nodes (1): ToolconfigGroupComponent

### Community 42 - "Module 42"
Cohesion: 0.67
Nodes (1): CapitalLetterPipe

### Community 43 - "Module 43"
Cohesion: 0.67
Nodes (1): UnixDurationPipe

### Community 44 - "Module 44"
Cohesion: 0.67
Nodes (1): MapPipe

### Community 45 - "Module 45"
Cohesion: 0.67
Nodes (1): LeadingNullPipe

### Community 46 - "Module 46"
Cohesion: 0.67
Nodes (1): ProcentPipe

### Community 47 - "Module 47"
Cohesion: 0.67
Nodes (1): JoinPipe

### Community 48 - "Module 48"
Cohesion: 0.67
Nodes (1): Link

### Community 49 - "Module 49"
Cohesion: 0.67
Nodes (1): JSONSetResult

### Community 50 - "Module 50"
Cohesion: 0.67
Nodes (1): PossibleSolution

### Community 51 - "Module 51"
Cohesion: 0.67
Nodes (1): JSONSetValidationError

### Community 54 - "Module 54"
Cohesion: 1.0
Nodes (1): WavFileFormat

### Community 55 - "Module 55"
Cohesion: 1.0
Nodes (1): OctraUtilitiesModule

### Community 59 - "Module 59"
Cohesion: 1.0
Nodes (1): OctraComponentsModule

### Community 60 - "Module 60"
Cohesion: 1.0
Nodes (1): AudioviewerConfig

### Community 61 - "Module 61"
Cohesion: 1.0
Nodes (1): QuestionMarkComponent

### Community 62 - "Module 62"
Cohesion: 1.0
Nodes (1): OctraFormGeneratorModule

### Community 63 - "Module 63"
Cohesion: 1.0
Nodes (1): OAudiofile

### Community 113 - "Module 113"
Cohesion: 1.0
Nodes (1): MIT License

## Knowledge Gaps
- **42 isolated node(s):** `WavFileFormat`, `OctraUtilitiesModule`, `EMUWebAppApplication`, `OctraApplication`, `ELANApplication` (+37 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Module 8`** (51 nodes): `AudioChunk`, `.absolutePlayposition()`, `.audioManager()`, `.cancelPendingReplayRestart()`, `.clone()`, `.constructor()`, `.destroy()`, `.id()`, `.isPlaybackEnded()`, `.isPlayBackStopped()`, `.isPlaying()`, `.lastplayedpos()`, `.pausePlayback()`, `.playbackRate()`, `.relativePlayposition()`, `.replay()`, `.sampleRate()`, `.selection()`, `.setState()`, `.startPlayback()`, `.startpos()`, `.status()`, `.stepBackward()`, `.stepBackwardTime()`, `.toggleReplay()`, `.volume()`, `AudioManager`, `.addChunk()`, `.audioMechanism()`, `.channel()`, `.channelDataFactor()`, `.constructor()`, `.createNewAudioChunk()`, `.destroy()`, `.gainNode()`, `.getFileFormat()`, `.getNumberOfDataParts()`, `.isPlaying()`, `.isValidAudioFileName()`, `.mainchunk()`, `.onChannelDataChange()`, `.playOnHover()`, `.playPosition()`, `.removeChunk()`, `.resource()`, `.sampleRate()`, `.startPlayback()`, `.state()`, `.statechange()`, `.stopDecoding()`, `audio-manager.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Binary Data Parsing`** (25 nodes): `BinaryByteReader`, `.constructor()`, `.eof()`, `.length()`, `.pos()`, `.readAscii()`, `.readFloat32()`, `.readInt16BE()`, `.readInt16LE()`, `.readInt32BE()`, `.readInt8()`, `.readUint16LE()`, `.readUint32LE()`, `.skip()`, `WavReader`, `.constructor()`, `._frameLength()`, `.navigateToChunk()`, `.parseFmtChunk()`, `.read()`, `.readData()`, `.readFormat()`, `.readHeader()`, `BinaryReader.ts`, `wavreader.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Binary Write Operations`** (23 nodes): `BinaryByteWriter`, `.constructor()`, `.ensureCapacity()`, `.finish()`, `.pos()`, `.writeAscii()`, `.writeFloat()`, `.writeInt16()`, `.writeInt32()`, `.writeUint16()`, `.writeUint32()`, `.writeUint8()`, `WavWriter`, `.constructor()`, `.write()`, `.writeAsync()`, `.writeChunkHeader()`, `.writeDataChunk()`, `.writeFactChunk()`, `.writeFmtChunk()`, `.writeHeader()`, `BinaryWriter.ts`, `wavwriter.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Bug Report Modal`** (21 nodes): `.alert()`, `BugreportModalComponent`, `.applyAction()`, `.close()`, `.constructor()`, `.createPreviewFromFile()`, `.email()`, `.i18n()`, `.isvalid()`, `.name()`, `.ngAfterViewInit()`, `.onFileChange()`, `.onHidden()`, `.profile()`, `.removeScreenshot()`, `.selectFileForUpload()`, `.sendBugReport()`, `.update()`, `.waitForSendResponse()`, `getAudioInfo()`, `bugreport-modal.component.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Audio Player Controls`** (20 nodes): `.onPlaybackEnded()`, `.onPlaybackPaused()`, `.onPlaybackStopped()`, `AudioplayerComponent`, `.afterChunkUpdated()`, `.getPlayHeadX()`, `.ngAfterViewInit()`, `.ngOnChanges()`, `.ngOnInit()`, `.onPlaybackEnded()`, `.onPlaybackPaused()`, `.onPlaybackStopped()`, `.onResize()`, `.pxToSample()`, `.settings()`, `.timeLeft()`, `.update()`, `.width()`, `.stop()`, `audioplayer.component.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Keyboard Shortcuts`** (19 nodes): `ShortcutManager`, `.checkKeyEvent()`, `.checkPressedKey()`, `.constructor()`, `.disableShortcutGroup()`, `.enableShortcutGroup()`, `.getCommand()`, `.getCommandByEvent()`, `.getKeyCode()`, `.getNameByEvent()`, `.getShorcutCombination()`, `.getShortcutGroup()`, `.isProtectedShortcut()`, `.pressedKeys()`, `.resetPressedKeys()`, `.shortcuts()`, `.unregisterItemFromGroup()`, `.unregisterShortcutGroup()`, `shortcut-manager.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `WAV Format Handling`** (18 nodes): `WavFormat`, `.blockAlign()`, `.constructor()`, `.extractDataFromArray()`, `.getDataChunk()`, `.getDataChunkSize()`, `.init()`, `.isValid()`, `.readAudioInformation()`, `.setBitsPerSample()`, `.setBlockAlign()`, `.setByteRate()`, `.setChannels()`, `.setDataStart()`, `.setDuration()`, `.setSampleRate()`, `.stopAudioSplitting()`, `wav-format.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Audio Format Metadata`** (16 nodes): `bitsPerSample()`, `byteRate()`, `channels()`, `decoder()`, `duration()`, `filename()`, `init()`, `mimeType()`, `sampleRate()`, `supportedFormats()`, `MusicMetadataFormat`, `.constructor()`, `.isValid()`, `.readAudioInformation()`, `audio-format.ts`, `music-metadata-format.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Media Resource Abstraction`** (9 nodes): `MediaResource`, `.arraybuffer()`, `.constructor()`, `.extension()`, `.name()`, `.originalArraybuffer()`, `.size()`, `.url()`, `media-resource.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Directory Information`** (9 nodes): `DirectoryInfo`, `.addEntries()`, `.clone()`, `.constructor()`, `.extractFolderName()`, `.fromFolderObject()`, `.path()`, `.traverseFileTree()`, `directory-info.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Generic Data Information`** (8 nodes): `DataInfo`, `.attributes()`, `.constructor()`, `.hash()`, `.name()`, `.size()`, `.type()`, `data-info.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Audio Time Calculations`** (8 nodes): `AudioTimeCalculator`, `.absXtoSamples2()`, `.constructor()`, `.duration()`, `.roundSamples()`, `.samplesToSeconds()`, `.secondsToSamples()`, `audio-time-calculator.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 33`** (7 nodes): `timespan.pipe.ts`, `TimespanPipe`, `.Hours()`, `.MilliSeconds()`, `.Minutes()`, `.Seconds()`, `.transform()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 34`** (6 nodes): `BrowserInfo`, `.browser()`, `.os()`, `.platform()`, `.version()`, `browser-info.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 35`** (6 nodes): `AudioResource`, `.constructor()`, `.getOAudioFile()`, `.info()`, `.originalType()`, `audio-resource.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 36`** (6 nodes): `AudioFormat`, `.constructor()`, `PCMAudioFormat`, `.constructor()`, `.toString()`, `format.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 37`** (6 nodes): `BundleJSONConverter.ts`, `BundleJSONConverter`, `.constructor()`, `.export()`, `.import()`, `.needsOptionsForImport()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 39`** (5 nodes): `LibavFormat`, `.constructor()`, `.isValid()`, `.readAudioInformation()`, `libav-format.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 41`** (4 nodes): `toolconfig-group.component.ts`, `ToolconfigGroupComponent`, `.onArrayItemAdd()`, `.onArrayItemDelete()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 42`** (3 nodes): `CapitalLetterPipe`, `.transform()`, `capital-letter.pipe.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 43`** (3 nodes): `unix-duration.pipe.ts`, `UnixDurationPipe`, `.transform()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 44`** (3 nodes): `MapPipe`, `.transform()`, `map.pipe.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 45`** (3 nodes): `LeadingNullPipe`, `.transform()`, `leadingnull.pipe.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 46`** (3 nodes): `procent.pipe.ts`, `ProcentPipe`, `.transform()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 47`** (3 nodes): `JoinPipe`, `.transform()`, `join.pipe.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 48`** (3 nodes): `link.ts`, `Link`, `.constructor()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 49`** (3 nodes): `result.ts`, `JSONSetResult`, `.constructor()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 50`** (3 nodes): `possible-solution.ts`, `PossibleSolution`, `.constructor()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 51`** (3 nodes): `JSONSetValidationError`, `.constructor()`, `error.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 54`** (2 nodes): `WavFileFormat`, `wavformat.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 55`** (2 nodes): `octra-utilities.module.ts`, `OctraUtilitiesModule`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 59`** (2 nodes): `OctraComponentsModule`, `components.module.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 60`** (2 nodes): `AudioviewerConfig`, `audio-viewer.config.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 61`** (2 nodes): `question-mark.component.ts`, `QuestionMarkComponent`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 62`** (2 nodes): `OctraFormGeneratorModule`, `form-generator.module.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 63`** (2 nodes): `OAudiofile`, `audio-file.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 113`** (1 nodes): `MIT License`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `AudioViewerService` connect `Audio Selection & Playback` to `Annotation Core Operations`, `Audio Decoding`, `Module 4`, `Module 6`, `ASR Configuration UI`, `Audio Visualization`, `Audio Player Controls`?**
  _High betweenness centrality (0.126) - this node is a cross-community bridge._
- **Why does `OItem` connect `Module 9` to `Format Converters (Praat/ELAN)`, `Audio Visualization`?**
  _High betweenness centrality (0.070) - this node is a cross-community bridge._
- **What connects `WavFileFormat`, `OctraUtilitiesModule`, `EMUWebAppApplication` to the rest of the system?**
  _42 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Audio Selection & Playback` be split into smaller, more focused modules?**
  _Cohesion score 0.04 - nodes in this community are weakly interconnected._
- **Should `Annotation Core Operations` be split into smaller, more focused modules?**
  _Cohesion score 0.03 - nodes in this community are weakly interconnected._
- **Should `Format Converters (Praat/ELAN)` be split into smaller, more focused modules?**
  _Cohesion score 0.03 - nodes in this community are weakly interconnected._
- **Should `Audio Decoding` be split into smaller, more focused modules?**
  _Cohesion score 0.04 - nodes in this community are weakly interconnected._