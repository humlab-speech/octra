/**
 * @Author Klaus Jänsch
 * Original: https://github.com/IPS-LMU/WebSpeechRecorderNg/blob/master/projects/speechrecorderng/src/lib/io/BinaryWriter.ts
 * Extracted: 2024-11-04
 **/

export class BinaryByteWriter {
  static DEFAULT_SIZE_INC = 65536;
  buf: ArrayBuffer;
  private _pos: number;

  constructor() {
    this.buf = new ArrayBuffer(BinaryByteWriter.DEFAULT_SIZE_INC);
    this._pos = 0;
  }

  get pos(): number {
    return this._pos;
  }

  ensureCapacity(numBytes: number) {
    const needed = this._pos + numBytes;
    if (needed < this.buf.byteLength) return;
    // Exponential doubling avoids O(n²) copy cost on many small writes.
    let newSize = this.buf.byteLength;
    while (newSize <= needed) newSize *= 2;
    const arrNew = new Uint8Array(newSize);
    arrNew.set(new Uint8Array(this.buf, 0, this._pos));
    this.buf = arrNew.buffer;
  }

  writeUint8(val: number): void {
    this.ensureCapacity(1);
    const valView = new DataView(this.buf, this._pos, 1);
    valView.setUint8(0, val);
    this._pos++;
  }

  writeUint16(val: number, le: boolean): void {
    this.ensureCapacity(2);
    const valView = new DataView(this.buf, this._pos, 2);
    valView.setUint16(0, val, le);
    this._pos += 2;
  }

  writeInt16(val: number, le: boolean): void {
    this.ensureCapacity(2);
    const valView = new DataView(this.buf, this._pos, 2);
    valView.setInt16(0, val, le);
    this._pos += 2;
  }

  writeUint32(val: number, le: boolean): void {
    this.ensureCapacity(4);
    const valView = new DataView(this.buf, this._pos, 4);
    valView.setUint32(0, val, le);
    this._pos += 4;
  }

  writeInt32(val: number, le: boolean): void {
    this.ensureCapacity(4);
    const valView = new DataView(this.buf, this._pos, 4);
    valView.setInt32(0, val, le);
    this._pos += 4;
  }

  writeFloat(val: number) {
    this.ensureCapacity(4);
    const valView = new DataView(this.buf, this._pos, 4);
    valView.setFloat32(0, val, true);
    this._pos += 4;
  }

  finish(): Uint8Array {
    // Slice creates a trimmed standalone copy; avoids per-byte DataView overhead.
    return new Uint8Array(this.buf, 0, this._pos).slice();
  }

  writeAscii(text: string): void {
    let i;
    for (i = 0; i < text.length; i++) {
      const asciiCode = text.charCodeAt(i);
      if (asciiCode < 0 || asciiCode > 255) {
        throw new Error('Not an ASCII character at char ' + i + ' in ' + text);
      }
      this.writeUint8(asciiCode);
    }
  }
}
