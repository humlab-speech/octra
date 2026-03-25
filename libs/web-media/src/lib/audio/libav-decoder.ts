export interface AudioBufferLike {
  sampleRate: number;
  length: number;
  duration: number;
  numberOfChannels: number;
  getChannelData(channel: number): Float32Array;
}

class AudioBufferLikeImpl implements AudioBufferLike {
  readonly sampleRate: number;
  readonly length: number;
  readonly duration: number;
  readonly numberOfChannels: number;
  private _channels: Float32Array[];

  constructor(channels: Float32Array[], sampleRate: number) {
    this._channels = channels;
    this.sampleRate = sampleRate;
    this.length = channels[0].length;
    this.duration = this.length / sampleRate;
    this.numberOfChannels = channels.length;
  }

  getChannelData(channel: number): Float32Array {
    return this._channels[channel];
  }
}

let libavInstance: any = null;

async function getLibAV(): Promise<any> {
  if (libavInstance) return libavInstance;
  // Dynamic import of the libav ES module from deployed assets.
  // webpackIgnore keeps Angular's bundler from trying to resolve this path at build time.
  const m = await import(/* webpackIgnore: true */ '/assets/libav/libav-default.mjs' as any);
  libavInstance = await m.LibAV({ noworker: true, base: '/assets/libav/' });
  return libavInstance;
}

export async function decodeWithLibAV(buf: ArrayBuffer): Promise<AudioBufferLike> {
  const libav = await getLibAV();

  const filename = 'input.audio';
  await libav.writeFile(filename, new Uint8Array(buf));

  const [fmt_ctx, streams] = await libav.ff_init_demuxer_file(filename);

  const audioStream = streams.find((s: any) => s.codec_type === libav.AVMEDIA_TYPE_AUDIO);
  if (!audioStream) {
    await libav.avformat_close_input_js(fmt_ctx);
    await libav.unlink(filename);
    throw new Error('No audio stream found in file.');
  }

  const [, c, pkt, frame] = await libav.ff_init_decoder(
    audioStream.codec_id,
    audioStream.codecpar,
  );

  const [, allPackets] = await libav.ff_read_multi(fmt_ctx, pkt);
  const packets = allPackets[audioStream.index] || [];

  const frames = await libav.ff_decode_multi(c, pkt, frame, packets, true);

  if (!frames || frames.length === 0) {
    await libav.ff_free_decoder(c, pkt, frame);
    await libav.avformat_close_input_js(fmt_ctx);
    await libav.unlink(filename);
    throw new Error('libav.js: no audio frames decoded.');
  }

  const sampleRate = frames[0].sample_rate;
  const numChannels = frames[0].channels || frames[0].ch_layout_nb_channels || 1;
  const sampleFormat = frames[0].format;

  let totalSamples = 0;
  for (const f of frames) totalSamples += f.nb_samples;

  const channels: Float32Array[] = [];
  for (let ch = 0; ch < numChannels; ch++) channels.push(new Float32Array(totalSamples));

  let offset = 0;
  for (const f of frames) {
    const nb = f.nb_samples;
    if (isPlanar(sampleFormat)) {
      for (let ch = 0; ch < numChannels; ch++) {
        const src = toFloat32(f.data[ch], sampleFormat);
        channels[ch].set(src, offset);
      }
    } else {
      const src = toFloat32(f.data, sampleFormat);
      for (let i = 0; i < nb; i++) {
        for (let ch = 0; ch < numChannels; ch++) {
          channels[ch][offset + i] = src[i * numChannels + ch];
        }
      }
    }
    offset += nb;
  }

  await libav.ff_free_decoder(c, pkt, frame);
  await libav.avformat_close_input_js(fmt_ctx);
  await libav.unlink(filename);

  return new AudioBufferLikeImpl(channels, sampleRate);
}

function isPlanar(fmt: number): boolean {
  // AV_SAMPLE_FMT_*P formats: U8P=6, S16P=7, S32P=8, FLTP=9, DBLP=10, S64P=12
  return (fmt >= 6 && fmt <= 10) || fmt === 12;
}

function toFloat32(data: any, fmt: number): Float32Array {
  if (data instanceof Float32Array) return data;
  if (data instanceof Float64Array) {
    const out = new Float32Array(data.length);
    for (let i = 0; i < data.length; i++) out[i] = data[i];
    return out;
  }
  if (data instanceof Int16Array) {
    const out = new Float32Array(data.length);
    for (let i = 0; i < data.length; i++) out[i] = data[i] / 32768;
    return out;
  }
  if (data instanceof Int32Array) {
    const out = new Float32Array(data.length);
    for (let i = 0; i < data.length; i++) out[i] = data[i] / 2147483648;
    return out;
  }
  if (data instanceof Uint8Array) {
    const out = new Float32Array(data.length);
    for (let i = 0; i < data.length; i++) out[i] = (data[i] - 128) / 128;
    return out;
  }
  return new Float32Array(data);
}
