export type TimingFn = () => { endTimer: () => { inMillis: number } }
export const timingFn: TimingFn = () => {
  const t0 = process.hrtime()
  return {
    endTimer: (): { inMillis: number } => {
      const t1 = process.hrtime(t0)
      return { inMillis: Math.round(t1[0] * 1000 + t1[1] / 1000000) }
    },
  }
}
