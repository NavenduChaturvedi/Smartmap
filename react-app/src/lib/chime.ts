// A short two-note chime, synthesized so there's no audio file to ship.
// Browsers only allow audio after a user gesture; unlocks follow clicks and
// navigation, but if audio is blocked or unsupported this silently no-ops.

let ctx: AudioContext | null = null

function playChime() {
  try {
    ctx ??= new AudioContext()
    if (ctx.state === "suspended") void ctx.resume()
    const start = ctx.currentTime
    for (const [i, freq] of [659.25, 987.77].entries()) {
      // E5 then B5
      const t = start + i * 0.12
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = "sine"
      osc.frequency.value = freq
      gain.gain.setValueAtTime(0, t)
      gain.gain.linearRampToValueAtTime(0.18, t + 0.015)
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.5)
      osc.connect(gain).connect(ctx.destination)
      osc.start(t)
      osc.stop(t + 0.5)
    }
  } catch {
    // Audio unavailable; the toast still shows.
  }
}

export { playChime }
