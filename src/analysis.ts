import { FaceLandmarker, FilesetResolver, ImageSegmenter } from '@mediapipe/tasks-vision'
import { medianColor, rgbToHex, rgbToLab, type RGB } from './color'
import type { Observations, Part } from './recommend'

export type SamplePoint = { x: number; y: number }
export type Analysis = { observations: Observations; points: Record<Part, SamplePoint | null>; warnings: string[]; quality: '좋음' | '확인 필요' }

let facePromise: Promise<FaceLandmarker> | null = null
let segmenterPromise: Promise<ImageSegmenter> | null = null

function faceModel() {
  if (!facePromise) facePromise = (async () => {
    const vision = await FilesetResolver.forVisionTasks('/wasm')
    return FaceLandmarker.createFromOptions(vision, { baseOptions: { modelAssetPath: '/models/face_landmarker.task', delegate: 'CPU' }, runningMode: 'IMAGE', numFaces: 2 })
  })().catch((error) => { facePromise = null; throw error })
  return facePromise
}

async function hairModel() {
  if (!segmenterPromise) segmenterPromise = (async () => {
    const vision = await FilesetResolver.forVisionTasks('/wasm')
    return ImageSegmenter.createFromOptions(vision, { baseOptions: { modelAssetPath: '/models/selfie_multiclass_256x256.tflite', delegate: 'CPU' }, runningMode: 'IMAGE', outputCategoryMask: true })
  })().catch((error) => { segmenterPromise = null; throw error })
  return segmenterPromise
}

function sampleEllipse(data: ImageData, cx: number, cy: number, rx: number, ry: number, predicate?: (x: number, y: number) => boolean): RGB[] {
  const colors: RGB[] = []
  const xStart = Math.max(0, Math.floor(cx - rx)); const xEnd = Math.min(data.width - 1, Math.ceil(cx + rx))
  const yStart = Math.max(0, Math.floor(cy - ry)); const yEnd = Math.min(data.height - 1, Math.ceil(cy + ry))
  for (let y = yStart; y <= yEnd; y += 2) for (let x = xStart; x <= xEnd; x += 2) {
    if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 > 1 || (predicate && !predicate(x, y))) continue
    const i = (y * data.width + x) * 4
    const rgb = { r: data.data[i], g: data.data[i + 1], b: data.data[i + 2] }
    const lab = rgbToLab(rgb)
    if (lab.l > 9 && lab.l < 94) colors.push(rgb)
  }
  return colors
}

export function sampleAt(image: HTMLImageElement, x: number, y: number, radius = 10): string | null {
  const canvas = document.createElement('canvas')
  canvas.width = image.naturalWidth; canvas.height = image.naturalHeight
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) return null
  ctx.drawImage(image, 0, 0)
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const color = medianColor(sampleEllipse(data, x * data.width, y * data.height, radius, radius))
  return color ? rgbToHex(color) : null
}

export async function analyzeImage(image: HTMLImageElement): Promise<Analysis> {
  const maxEdge = 1100
  const scale = Math.min(1, maxEdge / Math.max(image.naturalWidth, image.naturalHeight))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale))
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale))
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) throw new Error('브라우저에서 이미지를 처리할 수 없습니다.')
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height)
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const detected = (await faceModel()).detect(canvas).faceLandmarks
  if (!detected.length) throw new Error('얼굴을 찾지 못했어요. 정면에서 밝게 촬영한 사진을 사용해 주세요.')
  if (detected.length > 1) throw new Error('얼굴이 여러 명이에요. 한 사람만 나온 사진을 사용해 주세요.')
  const landmarks = detected[0]
  const pixel = (index: number) => ({ x: landmarks[index].x * canvas.width, y: landmarks[index].y * canvas.height })
  const left = pixel(234); const right = pixel(454)
  const faceWidth = Math.hypot(right.x - left.x, right.y - left.y)
  if (faceWidth < 110) throw new Error('얼굴이 너무 작아요. 조금 더 가까운 사진을 사용해 주세요.')
  const warnings: string[] = []
  const points: Record<Part, SamplePoint | null> = { skin: null, hair: null, eyes: null }
  const empty = (quality: string) => ({ hex: null, source: 'unavailable' as const, quality })
  const observations: Observations = { skin: empty('판단 어려움'), hair: empty('판단 어려움'), eyes: empty('판단 어려움') }
  const toNormalized = (p: { x: number; y: number }): SamplePoint => ({ x: p.x / canvas.width, y: p.y / canvas.height })

  const forehead = pixel(151), leftCheek = pixel(205), rightCheek = pixel(425)
  const skinColors = [forehead, leftCheek, rightCheek].flatMap((p) => sampleEllipse(data, p.x, p.y, faceWidth * 0.055, faceWidth * 0.045))
  const skin = medianColor(skinColors)
  if (skin && skinColors.length > 80) {
    const skinLab = rgbToLab(skin)
    const colorCast = skinLab.b < 1 || skinLab.a < 0
    observations.skin = { hex: rgbToHex(skin), source: 'photo', quality: colorCast ? '색조명 영향 의심' : '사진에서 추출' }
    points.skin = toNormalized(leftCheek)
    if (colorCast) warnings.push('피부에 강한 색조명이 비친 것 같아요. 색을 직접 확인하고 색감 경향을 선택해 주세요.')
    const lightness = skinLab.l
    if (lightness < 25 || lightness > 88) warnings.push('사진 노출이 피부색 판단에 영향을 줄 수 있어요.')
  } else warnings.push('피부색을 충분히 추출하지 못했어요.')

  try {
    const result = (await hairModel()).segment(canvas)
    const mask = result.categoryMask
    if (mask) {
      const categories = mask.getAsUint8Array()
      const mw = mask.width, mh = mask.height
      const hairColors: RGB[] = []
      let sumX = 0, sumY = 0, count = 0
      for (let y = 0; y < canvas.height; y += 3) for (let x = 0; x < canvas.width; x += 3) {
        const mx = Math.min(mw - 1, Math.floor(x / canvas.width * mw))
        const my = Math.min(mh - 1, Math.floor(y / canvas.height * mh))
        if (categories[my * mw + mx] !== 1) continue
        if (x < left.x - faceWidth * .5 || x > right.x + faceWidth * .5 || y > forehead.y + faceWidth * .8) continue
        const i = (y * canvas.width + x) * 4
        const rgb = { r: data.data[i], g: data.data[i + 1], b: data.data[i + 2] }
        const l = rgbToLab(rgb).l
        if (l < 6 || l > 92) continue
        hairColors.push(rgb); sumX += x; sumY += y; count++
      }
      const hair = medianColor(hairColors)
      if (hair && count > 80) {
        observations.hair = { hex: rgbToHex(hair), source: 'photo', quality: '사진에서 추출' }
        points.hair = { x: sumX / count / canvas.width, y: sumY / count / canvas.height }
      } else warnings.push('헤어 영역이 작거나 가려져 있어요. 직접 색을 선택할 수 있습니다.')
      result.close()
    }
  } catch {
    warnings.push('헤어 분석 모델을 불러오지 못했어요. 직접 색을 선택할 수 있습니다.')
  }

  if (landmarks.length > 477) {
    const eyeCenters = [pixel(468), pixel(473)]
    const irisColors = eyeCenters.flatMap((center) => sampleEllipse(data, center.x, center.y, Math.max(2, faceWidth * .016), Math.max(2, faceWidth * .016)))
    const eye = medianColor(irisColors)
    if (eye && irisColors.length >= 8) {
      observations.eyes = { hex: rgbToHex(eye), source: 'photo', quality: '사진에서 추출 · 반사 확인 권장' }
      points.eyes = toNormalized(eyeCenters[0])
    } else warnings.push('홍채가 작아 눈동자색을 판단하기 어려워요.')
  } else warnings.push('이 사진에서는 눈동자색을 추출하지 못했어요.')

  if (canvas.width < 500 || canvas.height < 500) warnings.push('사진 해상도가 낮아 결과가 달라질 수 있어요.')
  return { observations, points, warnings, quality: warnings.length ? '확인 필요' : '좋음' }
}
