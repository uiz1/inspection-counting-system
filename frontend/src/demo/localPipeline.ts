import type { CountingResult, RouteClass, BranchName } from '@/types'

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = reject
    img.src = url
  })
}

function canvasFromImage(img: HTMLImageElement, maxSide = 720): HTMLCanvasElement {
  const scale = Math.min(1, maxSide / Math.max(img.width, img.height))
  const w = Math.max(1, Math.round(img.width * scale))
  const h = Math.max(1, Math.round(img.height * scale))
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(img, 0, 0, w, h)
  return canvas
}

function extractFeatures(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!
  const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height)
  let sum = 0
  let sumSq = 0
  let dark = 0
  let sat = 0
  const n = width * height
  const glare = new Uint8Array(n)

  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    const r = data[i] / 255
    const g = data[i + 1] / 255
    const b = data[i + 2] / 255
    const maxc = Math.max(r, g, b)
    const minc = Math.min(r, g, b)
    const v = maxc
    const s = maxc === 0 ? 0 : (maxc - minc) / maxc
    const luma = 0.299 * r + 0.587 * g + 0.114 * b
    sum += luma
    sumSq += luma * luma
    if (v < 0.18) dark++
    if (v > 0.88 && s < 0.22) {
      sat++
      glare[p] = 1
    }
  }

  const l_mean = sum / n
  const l_std = Math.sqrt(Math.max(0, sumSq / n - l_mean * l_mean))
  // coarse glare blob estimate via 32x block
  const bw = 32
  const bh = 32
  let best = 0
  for (let by = 0; by < bh; by++) {
    for (let bx = 0; bx < bw; bx++) {
      let area = 0
      const x0 = Math.floor((bx * width) / bw)
      const x1 = Math.floor(((bx + 1) * width) / bw)
      const y0 = Math.floor((by * height) / bh)
      const y1 = Math.floor(((by + 1) * height) / bh)
      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) area += glare[y * width + x]
      }
      best = Math.max(best, area)
    }
  }

  return {
    l_mean: +l_mean.toFixed(4),
    r_dark: +(dark / n).toFixed(4),
    r_sat: +(sat / n).toFixed(4),
    l_std: +l_std.toFixed(4),
    a_glare: +(best / n).toFixed(4),
  }
}

function decideRoute(f: ReturnType<typeof extractFeatures>): { route_class: RouteClass; branch: BranchName; reason: string } {
  if (f.r_sat >= 0.045 || f.a_glare >= 0.02) {
    return { route_class: 'high', branch: 'specular_clahe', reason: '高光特征触发 → 高光抑制+CLAHE' }
  }
  if (f.l_mean <= 0.32 || f.r_dark >= 0.28) {
    return { route_class: 'low', branch: 'zero_dce_pp', reason: '低照度特征触发 → Zero-DCE++' }
  }
  // 契约：mixed 为一等公民，禁止并入 normal
  if (f.l_std >= 0.22) {
    return { route_class: 'mixed', branch: 'identity', reason: '高对比混合光照 → mixed（默认直通，分块消融另开）' }
  }
  return { route_class: 'normal', branch: 'identity', reason: '正常光照 → 直通' }
}

function applyBranch(canvas: HTMLCanvasElement, branch: BranchName): HTMLCanvasElement {
  const out = document.createElement('canvas')
  out.width = canvas.width
  out.height = canvas.height
  const ctx = out.getContext('2d')!
  ctx.drawImage(canvas, 0, 0)
  const img = ctx.getImageData(0, 0, out.width, out.height)
  const d = img.data

  if (branch === 'identity') return out

  if (branch === 'zero_dce_pp') {
    for (let i = 0; i < d.length; i += 4) {
      for (let c = 0; c < 3; c++) {
        let x = d[i + c] / 255
        for (const a of [0.55, 0.35, 0.2]) x = x + x * (1 - x) * a
        d[i + c] = Math.max(0, Math.min(255, Math.round(x * 255)))
      }
    }
  } else {
    for (let i = 0; i < d.length; i += 4) {
      const r = d[i] / 255
      const g = d[i + 1] / 255
      const b = d[i + 2] / 255
      const maxc = Math.max(r, g, b)
      const minc = Math.min(r, g, b)
      const s = maxc === 0 ? 0 : (maxc - minc) / maxc
      const glare = maxc > 0.88 && s < 0.22 ? 1 : 0
      const atten = 1 - 0.45 * glare
      let rr = r * atten
      let gg = g * atten
      let bb = b * atten
      // mild equalization-ish lift on dark midtones
      const luma = 0.299 * rr + 0.587 * gg + 0.114 * bb
      const lift = (luma < 0.55 ? (0.55 - luma) * 0.35 : 0)
      d[i] = Math.max(0, Math.min(255, Math.round((rr + lift) * 255)))
      d[i + 1] = Math.max(0, Math.min(255, Math.round((gg + lift) * 255)))
      d[i + 2] = Math.max(0, Math.min(255, Math.round((bb + lift) * 255)))
    }
  }

  ctx.putImageData(img, 0, 0)
  return out
}

function densityOverlay(canvas: HTMLCanvasElement): { overlay: HTMLCanvasElement; count: number } {
  const ctx = canvas.getContext('2d')!
  const src = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const out = document.createElement('canvas')
  out.width = canvas.width
  out.height = canvas.height
  const octx = out.getContext('2d')!
  octx.drawImage(canvas, 0, 0)
  const dst = octx.getImageData(0, 0, out.width, out.height)

  let sum = 0
  for (let y = 1; y < canvas.height - 1; y++) {
    for (let x = 1; x < canvas.width - 1; x++) {
      const i = (y * canvas.width + x) * 4
      const luma =
        0.299 * src.data[i] + 0.587 * src.data[i + 1] + 0.114 * src.data[i + 2]
      const left =
        0.299 * src.data[i - 4] + 0.587 * src.data[i - 3] + 0.114 * src.data[i - 2]
      const up =
        0.299 * src.data[i - canvas.width * 4] +
        0.587 * src.data[i - canvas.width * 4 + 1] +
        0.114 * src.data[i - canvas.width * 4 + 2]
      const edge = Math.min(1, (Math.abs(luma - left) + Math.abs(luma - up)) / 80)
      const dens = Math.pow(edge, 1.2)
      sum += dens
      if (dens > 0.08) {
        const a = 0.45
        const r = Math.min(1, 1.5 * dens - 0.2)
        const g = Math.min(1, Math.max(0, 1.5 * (1 - Math.abs(dens - 0.55) * 1.6)))
        const b = Math.min(1, Math.max(0, 1.2 * (1 - dens) - 0.1))
        dst.data[i] = Math.round(src.data[i] * (1 - a) + r * 255 * a)
        dst.data[i + 1] = Math.round(src.data[i + 1] * (1 - a) + g * 255 * a)
        dst.data[i + 2] = Math.round(src.data[i + 2] * (1 - a) + b * 255 * a)
      }
    }
  }
  octx.putImageData(dst, 0, 0)
  const count = +(sum * 0.045).toFixed(2)
  return { overlay: out, count }
}

export async function runLocalInference(file: File, station_id: string): Promise<CountingResult> {
  const t0 = performance.now()
  const img = await loadImage(file)
  const original = canvasFromImage(img)

  const tFeat0 = performance.now()
  const features = extractFeatures(original)
  const feature_ms = +(performance.now() - tFeat0).toFixed(2)

  const tRoute0 = performance.now()
  const decision = decideRoute(features)
  const route_ms = +(performance.now() - tRoute0).toFixed(2)

  const tPre0 = performance.now()
  const corrected = applyBranch(original, decision.branch)
  const preprocess_ms = +(performance.now() - tPre0).toFixed(2)

  const tCount0 = performance.now()
  const { overlay, count } = densityOverlay(corrected)
  const count_ms = +(performance.now() - tCount0).toFixed(2)
  const total_ms = +(performance.now() - t0).toFixed(2)

  return {
    id: crypto.randomUUID(),
    task_id: null,
    station_id,
    created_at: new Date().toISOString(),
    route_class: decision.route_class,
    branch: decision.branch,
    features,
    count,
    count_rounded: Math.round(count),
    timing: { feature_ms, route_ms, preprocess_ms, count_ms, total_ms },
    original_image: original.toDataURL('image/jpeg', 0.88),
    corrected_image: corrected.toDataURL('image/jpeg', 0.88),
    density_overlay: overlay.toDataURL('image/jpeg', 0.88),
    mock: true,
    note: `${decision.reason}；当前为浏览器本地演示管线（后端未连接时启用）。`,
  }
}
