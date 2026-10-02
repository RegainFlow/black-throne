import { describe, expect, it } from "vitest";
import { loudestWindow, readWavInfo, rmsEnvelope } from "./audio";

function makeWav(seconds: number, sampleRate: number, amp: (t: number) => number): Buffer {
  const frames = seconds * sampleRate;
  const buf = Buffer.alloc(44 + frames * 4);
  buf.write("RIFF", 0, "ascii");
  buf.writeUInt32LE(36 + frames * 4, 4);
  buf.write("WAVE", 8, "ascii");
  buf.write("fmt ", 12, "ascii");
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(2, 22);
  buf.writeUInt32LE(sampleRate, 24);
  buf.writeUInt32LE(sampleRate * 4, 28);
  buf.writeUInt16LE(4, 32);
  buf.writeUInt16LE(16, 34);
  buf.write("data", 36, "ascii");
  buf.writeUInt32LE(frames * 4, 40);
  for (let f = 0; f < frames; f++) {
    const t = f / sampleRate;
    const v = Math.round(Math.sin(f * 0.05) * amp(t) * 32767);
    buf.writeInt16LE(v, 44 + f * 4);
    buf.writeInt16LE(v, 46 + f * 4);
  }
  return buf;
}

describe("audio analysis", () => {
  it("reads the WAV header", () => {
    const info = readWavInfo(makeWav(2, 8000, () => 0.5));
    expect(info).toMatchObject({ sampleRate: 8000, channels: 2, bitsPerSample: 16 });
    expect(info.duration).toBeCloseTo(2);
  });

  it("finds the loud section", () => {
    // 100s song, loud between 60s and 75s.
    const wav = makeWav(100, 2000, (t) => (t >= 60 && t < 75 ? 0.9 : 0.1));
    const info = readWavInfo(wav);
    const env = rmsEnvelope(wav, info, 0.5);
    const { start, end } = loudestWindow(env, 0.5, 15);
    expect(start).toBeGreaterThanOrEqual(59);
    expect(start).toBeLessThanOrEqual(61);
    expect(end - start).toBe(15);
  });

  it("ignores loud intros and outros", () => {
    const wav = makeWav(100, 2000, (t) => (t < 5 || t > 96 ? 1 : t > 40 && t < 50 ? 0.6 : 0.1));
    const info = readWavInfo(wav);
    const { start } = loudestWindow(rmsEnvelope(wav, info, 0.5), 0.5, 10);
    expect(start).toBeGreaterThanOrEqual(35);
    expect(start).toBeLessThanOrEqual(45);
  });
});
