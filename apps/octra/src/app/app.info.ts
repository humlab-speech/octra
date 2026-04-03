import { NavigationExtras } from '@angular/router';
import {
  AnnotJSONConverter,
  BundleJSONConverter,
  Converter,
  CTMConverter,
  DocxConverter,
  ELANConverter,
  PartiturConverter,
  PraatTableConverter,
  PraatTextgridConverter,
  SRTConverter,
  TextConverter,
  WebVTTConverter,
  WhisperJSONConverter,
} from '@octra/annotation';
import { LibavFormat, MusicMetadataFormat, WavFormat } from '@octra/web-media';

export class AppInfo {
  public static readonly audioformats = [
    new WavFormat(),
    new MusicMetadataFormat(),
    new LibavFormat(),
  ];

  public static readonly converters: Converter[] = [
    new DocxConverter(),
    new SRTConverter(),
    new TextConverter(),
    new AnnotJSONConverter(),
    new WhisperJSONConverter(),
    new PraatTableConverter(),
    new PraatTextgridConverter(),
    new ELANConverter(),
    new BundleJSONConverter(),
    new WebVTTConverter(),
    new PartiturConverter(),
    new CTMConverter(),
  ];

  public static readonly themes: string[] = ['default', 'shortAudioFiles'];
  static readonly manualURL =
    'https://clarin.phonetik.uni-muenchen.de/apps/octra/manuals/octra/';

  static readonly maxAudioFileSize = 3000;

  public static readonly queryParamsHandling: NavigationExtras = {
    queryParamsHandling: 'merge',
    preserveFragment: false,
  };

  public static BUILD = {
    version: '0.0.0',
    hash: '2893u092i349i23904',
    timestamp: new Date().toISOString(),
  };
}
