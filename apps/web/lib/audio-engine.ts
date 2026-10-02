"use client";

import { world } from "./world-store";

/**
 * Web Audio engine. One AudioContext, created on the first user gesture.
 *
 *   teaser <audio> ─┐
 *                   ├─► analyser ─► master ─► destination
 *   drone (synth) ──┘
 *
 * The analyser feeds smoothed bands into the world store every frame so the
 * WebGL world reacts to House of Ash. Spotify playback ducks everything (we
 * can't analyse the cross-origin embed, and two sources at once is noise).
 */

type Bands = { low: number; mid: number; high: number; kick: number };

class AudioEngine {
  private ctx?: AudioContext;
  private master?: GainNode;
  private analyser?: AnalyserNode;
  private freq?: Uint8Array<ArrayBuffer>;
  private teaserEl?: HTMLAudioElement;
  private teaserSrc?: string;
  private drone?: { gain: GainNode; stop: () => void };
  private raf = 0;
  private lowSlow = 0;
  private smoothed: Bands = { low: 0, mid: 0, high: 0, kick: 0 };
  private teaserListeners = new Set<(t: { position: number; duration: number }) => void>();

  /** Registers the default teaser (latest release). Safe to call on every render. */
  setTeaser(src: string | undefined) {
    this.teaserSrc = src;
  }

  hasTeaser() {
    return Boolean(this.teaserSrc);
  }

  private ensure(): AudioContext {
    if (this.ctx) return this.ctx;
    const ctx = new AudioContext({ latencyHint: "playback" });
    const master = ctx.createGain();
    master.gain.value = 0;
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 1024;
    analyser.smoothingTimeConstant = 0.72;
    analyser.connect(master);
    master.connect(ctx.destination);
    this.ctx = ctx;
    this.master = master;
    this.analyser = analyser;
    this.freq = new Uint8Array(new ArrayBuffer(analyser.frequencyBinCount));

    document.addEventListener("visibilitychange", () => {
      if (document.hidden) void ctx.suspend();
      else if (world.getState().sound) void ctx.resume();
    });
    return ctx;
  }

  private ramp(to: number, seconds = 1.2) {
    if (!this.ctx || !this.master) return;
    const g = this.master.gain;
    const now = this.ctx.currentTime;
    g.cancelScheduledValues(now);
    g.setValueAtTime(g.value, now);
    g.linearRampToValueAtTime(to, now + seconds);
  }

  /** Visitor chose sound. Starts the teaser if there is one, otherwise the drone. Must run in a gesture. */
  async enable(preferTeaser = true) {
    const ctx = this.ensure();
    await ctx.resume();
    world.setState({ sound: true });
    if (world.getState().spotifyPlaying) return;
    if (preferTeaser && this.teaserSrc) await this.playTeaser();
    else this.startDrone();
    this.ramp(0.9, 1.6);
    this.loop();
  }

  disable() {
    world.setState({ sound: false });
    this.ramp(0, 0.9);
    window.setTimeout(() => {
      if (world.getState().sound) return;
      this.teaserEl?.pause();
      this.stopDrone();
      world.setState({ teaserPlaying: false });
      void this.ctx?.suspend();
    }, 950);
  }

  async toggle() {
    if (world.getState().sound) this.disable();
    else await this.enable();
  }

  async playTeaser() {
    if (!this.teaserSrc) return;
    const ctx = this.ensure();
    await ctx.resume();
    if (!this.teaserEl) {
      const el = new Audio();
      el.preload = "auto";
      el.crossOrigin = "anonymous";
      el.addEventListener("ended", () => {
        world.setState({ teaserPlaying: false });
        this.emitTeaser();
        // When the fragment ends the world falls back to the drone.
        if (world.getState().sound && !world.getState().spotifyPlaying) this.startDrone();
      });
      el.addEventListener("timeupdate", () => this.emitTeaser());
      const source = ctx.createMediaElementSource(el);
      if (this.analyser) source.connect(this.analyser);
      this.teaserEl = el;
    }
    if (this.teaserEl.src !== new URL(this.teaserSrc, location.href).href) {
      this.teaserEl.src = this.teaserSrc;
    }
    this.stopDrone();
    this.teaserEl.currentTime = 0;
    world.setState({ sound: true, teaserPlaying: true });
    this.ramp(0.9, 0.6);
    this.loop();
    try {
      await this.teaserEl.play();
    } catch {
      world.setState({ teaserPlaying: false });
    }
  }

  stopTeaser() {
    this.teaserEl?.pause();
    world.setState({ teaserPlaying: false });
    this.emitTeaser();
    if (world.getState().sound && !world.getState().spotifyPlaying) this.startDrone();
  }

  onTeaser(fn: (t: { position: number; duration: number }) => void) {
    this.teaserListeners.add(fn);
    return () => {
      this.teaserListeners.delete(fn);
    };
  }

  private emitTeaser() {
    const el = this.teaserEl;
    const t = { position: el?.currentTime ?? 0, duration: el?.duration || 0 };
    for (const fn of this.teaserListeners) fn(t);
  }

  /** Spotify started/stopped. We never play over it. */
  setSpotifyPlaying(playing: boolean) {
    if (playing === world.getState().spotifyPlaying) return;
    world.setState({ spotifyPlaying: playing });
    if (!this.ctx) return;
    if (playing) {
      this.teaserEl?.pause();
      world.setState({ teaserPlaying: false });
      this.ramp(0, 0.5);
    } else if (world.getState().sound) {
      this.startDrone();
      this.ramp(0.9, 2);
    }
  }

  /** A short sub-bass thud (sealed slots). Only when the visitor has chosen sound. */
  rumble() {
    const ctx = this.ctx;
    if (!ctx || !this.analyser || !world.getState().sound || ctx.state !== "running") return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(62, t);
    osc.frequency.exponentialRampToValueAtTime(31, t + 0.9);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.5, t + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 1.1);
    osc.connect(gain).connect(this.analyser);
    osc.start(t);
    osc.stop(t + 1.2);
  }

  /** Low, filtered drone: two detuned saws + brown noise. Quiet by design. */
  private startDrone() {
    const ctx = this.ctx;
    if (!ctx || !this.analyser || this.drone) return;
    const gain = ctx.createGain();
    gain.gain.value = 0;
    gain.gain.linearRampToValueAtTime(0.11, ctx.currentTime + 3);

    const lowpass = ctx.createBiquadFilter();
    lowpass.type = "lowpass";
    lowpass.frequency.value = 160;
    lowpass.Q.value = 6;

    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.value = 0.05;
    lfoGain.gain.value = 70;
    lfo.connect(lfoGain).connect(lowpass.frequency);

    const oscs = [55, 55.35, 82.4].map((f, i) => {
      const o = ctx.createOscillator();
      o.type = i === 2 ? "sine" : "sawtooth";
      o.frequency.value = f;
      const g = ctx.createGain();
      g.gain.value = i === 2 ? 0.15 : 0.35;
      o.connect(g).connect(lowpass);
      return o;
    });

    // brown noise
    const length = ctx.sampleRate * 4;
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < length; i++) {
      last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02;
      data[i] = last * 3.5;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;
    const band = ctx.createBiquadFilter();
    band.type = "bandpass";
    band.frequency.value = 320;
    band.Q.value = 0.6;
    const noiseGain = ctx.createGain();
    noiseGain.gain.value = 0.5;
    noise.connect(band).connect(noiseGain).connect(gain);

    lowpass.connect(gain);
    gain.connect(this.analyser);
    for (const o of oscs) o.start();
    lfo.start();
    noise.start();

    this.drone = {
      gain,
      stop: () => {
        const t = ctx.currentTime;
        gain.gain.cancelScheduledValues(t);
        gain.gain.setValueAtTime(gain.gain.value, t);
        gain.gain.linearRampToValueAtTime(0, t + 1.2);
        window.setTimeout(() => {
          for (const o of oscs) o.stop();
          lfo.stop();
          noise.stop();
          gain.disconnect();
        }, 1300);
      },
    };
  }

  private stopDrone() {
    this.drone?.stop();
    this.drone = undefined;
  }

  /** Reads the analyser once per frame and publishes smoothed bands. */
  private loop = () => {
    cancelAnimationFrame(this.raf);
    const tick = () => {
      const a = this.analyser;
      const f = this.freq;
      if (!a || !f) return;
      a.getByteFrequencyData(f);
      // ~47 Hz per bin at 48 kHz / 1024
      const avg = (from: number, to: number) => {
        let s = 0;
        for (let i = from; i < to; i++) s += f[i] ?? 0;
        return s / ((to - from) * 255);
      };
      const raw = { low: avg(1, 6), mid: avg(6, 40), high: avg(40, 160) };
      const k = this.smoothed;
      const follow = (prev: number, next: number) =>
        prev + (next - prev) * (next > prev ? 0.55 : 0.08);
      k.low = follow(k.low, raw.low);
      k.mid = follow(k.mid, raw.mid);
      k.high = follow(k.high, raw.high);
      this.lowSlow += (raw.low - this.lowSlow) * 0.04;
      const transient = Math.max(0, raw.low - this.lowSlow - 0.06) * 4;
      k.kick = Math.max(transient, k.kick * 0.88);
      world.setState({ bands: { ...k } });
      const silent = !world.getState().sound && k.low + k.mid + k.high < 0.003;
      if (silent) {
        world.setState({ bands: { low: 0, mid: 0, high: 0, kick: 0 } });
        return;
      }
      this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
  };
}

export const audio = new AudioEngine();
