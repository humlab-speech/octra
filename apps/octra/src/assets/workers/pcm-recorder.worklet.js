class PcmRecorderProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this._buffer = [];
    this._bufferedFrames = 0;
    this._frameTarget = 4096;
  }

  process(inputs) {
    const input = inputs[0];
    if (!input || input.length === 0) return true;

    const channels = input.length;
    const frames = input[0].length;
    const interleaved = new Float32Array(frames * channels);
    for (let f = 0; f < frames; f++) {
      for (let c = 0; c < channels; c++) {
        interleaved[f * channels + c] = input[c][f];
      }
    }

    this._buffer.push(interleaved);
    this._bufferedFrames += frames;

    if (this._bufferedFrames >= this._frameTarget) {
      const total = this._buffer.reduce((s, a) => s + a.length, 0);
      const merged = new Float32Array(total);
      let offset = 0;
      for (const chunk of this._buffer) {
        merged.set(chunk, offset);
        offset += chunk.length;
      }
      this.port.postMessage({ samples: merged, channels }, [merged.buffer]);
      this._buffer = [];
      this._bufferedFrames = 0;
    }

    return true;
  }
}

registerProcessor('pcm-recorder', PcmRecorderProcessor);
