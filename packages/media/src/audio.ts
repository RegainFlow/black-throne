/** Minimal 16-bit PCM WAV reader + loudness analysis (no native deps). */

export interface WavInfo {
  sampleRate: number;
  channels: number;
  bitsPerSample: number;
  dataOffset: number;
  dataLength: number;
  duration: number;
}

export function readWavInfo(buf: Buffer): WavInfo {
  if (buf.toString("ascii", 0, 4) !== "RIFF" || buf.toString("ascii", 8, 12) !== "WAVE") {
    throw new Error("Not a RIFF/WAVE file");
  }
  let offset = 12;
  let fmt: Omit<WavInfo, "dataOffset" | "dataLength" | "duration"> | undefined;
  while (offset + 8 <= buf.length) {
    const id = buf.toString("ascii", offset, offset + 4);
    const size = buf.readUInt32LE(offset + 4);
    if (id === "fmt ") {
      const format = buf.readUInt16LE(offset + 8);
      if (format !== 1 && format !== 0xfffe) throw new Error(`Unsupported WAV format ${format}`);
      fmt = {
        channels: buf.readUInt16LE(offset + 10),
        sampleRate: buf.readUInt32LE(offset + 12),
        bitsPerSample: buf.readUInt16LE(offset + 22),
      };
    }
    if (id === "data") {
      if (!fmt) throw new Error("WAV data chunk before fmt chunk");
      if (fmt.bitsPerSample !== 16) throw new Error("Only 16-bit PCM is supported");
      const dataLength = Math.min(size, buf.length - offset - 8);
      const frameBytes = fmt.channels * 2;
      return {
        ...fmt,
        dataOffset: offset + 8,
        dataLength,
        duration: dataLength / frameBytes / fmt.sampleRate,
      };
    }
    offset += 8 + size + (size % 2);
  }
  throw new Error("WAV has no data chunk");
}

/** Mono-downmixed RMS per `windowSeconds` slice, 0..1. */
export function rmsEnvelope(buf: Buffer, info: WavInfo, windowSeconds = 0.5): number[] {
  const frameBytes = info.channels * 2;
  const framesPerWindow = Math.max(1, Math.round(info.sampleRate * windowSeconds));
  const totalFrames = Math.floor(info.dataLength / frameBytes);
  const out: number[] = [];
  for (let start = 0; start < totalFrames; start += framesPerWindow) {
    const end = Math.min(totalFrames, start + framesPerWindow);
    let sum = 0;
    for (let f = start; f < end; f++) {
      let mono = 0;
      for (let c = 0; c < info.channels; c++) {
        mono += buf.readInt16LE(info.dataOffset + f * frameBytes + c * 2);
      }
      mono /= info.channels * 32768;
      sum += mono * mono;
    }
    out.push(Math.sqrt(sum / (end - start)));
  }
  return out;
}

/**
 * Start time (seconds) of the loudest `duration`-second window, ignoring the first and last
 * `edge` fraction of the song (intros/outros). Pure — unit tested.
 */
export function loudestWindow(
  envelope: number[],
  windowSeconds: number,
  duration: number,
  edge = 0.1,
): { start: number; end: number } {
  const total = envelope.length * windowSeconds;
  const span = Math.max(1, Math.round(duration / windowSeconds));
  const first = Math.floor((total * edge) / windowSeconds);
  const last = Math.max(first, Math.floor((total * (1 - edge)) / windowSeconds) - span);
  let best = first;
  let bestScore = -1;
  let running = 0;
  for (let i = first; i < first + span && i < envelope.length; i++) running += envelope[i] ?? 0;
  for (let i = first; i <= last; i++) {
    if (running > bestScore) {
      bestScore = running;
      best = i;
    }
    running += (envelope[i + span] ?? 0) - (envelope[i] ?? 0);
  }
  const start = best * windowSeconds;
  return { start, end: Math.min(total, start + duration) };
}

/**
 * `count` normalised (0..1) loudness values across [start, end) seconds. Uses RMS per bin and
 * stretches the range, so heavily compressed masters still show their shape.
 */
export function peaks(
  buf: Buffer,
  info: WavInfo,
  start: number,
  end: number,
  count = 160,
): number[] {
  const frameBytes = info.channels * 2;
  const startFrame = Math.floor(start * info.sampleRate);
  const endFrame = Math.min(Math.floor(end * info.sampleRate), info.dataLength / frameBytes);
  const per = Math.max(1, Math.floor((endFrame - startFrame) / count));
  const raw: number[] = [];
  for (let b = 0; b < count; b++) {
    let sum = 0;
    let n = 0;
    const from = startFrame + b * per;
    for (let f = from; f < from + per && f < endFrame; f += 2) {
      const v = buf.readInt16LE(info.dataOffset + f * frameBytes) / 32768;
      sum += v * v;
      n++;
    }
    raw.push(Math.sqrt(sum / Math.max(1, n)));
  }
  const sorted = [...raw].sort((a, b) => a - b);
  const lo = sorted[Math.floor(sorted.length * 0.05)] ?? 0;
  const hi = sorted[Math.floor(sorted.length * 0.98)] ?? 1;
  return raw.map((v) => {
    const t = Math.min(1, Math.max(0, (v - lo) / Math.max(1e-6, hi - lo)));
    return Math.round((0.15 + 0.85 * t ** 1.4) * 1000) / 1000;
  });
}
