import { hexToRgb, rgbToLab, relativeLuminance } from './color'

export type Part = 'skin' | 'hair' | 'eyes'
export type ColorObservation = { hex: string | null; source: 'photo' | 'manual' | 'unavailable'; quality: string }
export type Observations = Record<Part, ColorObservation>
export type Temperature = 'warm' | 'neutral' | 'cool'
export type Profile = 'soft-warm' | 'clear-warm' | 'soft-neutral' | 'clear-neutral' | 'soft-cool' | 'clear-cool'
export type Swatch = { name: string; hex: string; role: string }
export type BeautyColor = { name: string; hex: string; note: string }

export const partLabels: Record<Part, string> = { skin: '피부', hair: '헤어', eyes: '눈동자' }

export const collections: Record<Profile, {
  title: string; english: string; description: string; tone: string; alternate: string; background: string;
  palette: Swatch[]; lips: BeautyColor[]; blush: BeautyColor[]; eyeshadow: BeautyColor[]; dye: BeautyColor[]
}> = {
  'soft-neutral': {
    title: '편안한 균형', english: 'Soft balance', description: '따뜻함과 차가움 사이, 자연스럽고 부드러운 색을 함께 즐겨요.', tone: 'soft · light grayish · light', alternate: 'pale', background: '#E7E1DB',
    palette: [
      { name: '린넨', hex: '#E6DCCF', role: '기본' }, { name: '스톤', hex: '#B9ADA6', role: '기본' }, { name: '로즈 베이지', hex: '#C7A3A2', role: '기본' },
      { name: '더스티 세이지', hex: '#A3AEA0', role: '포인트' }, { name: '모브 로즈', hex: '#AE8999', role: '포인트' }, { name: '스모키 블루', hex: '#9CA9BB', role: '포인트' },
      { name: '웜 그레이', hex: '#716A6A', role: '중립' }, { name: '소프트 화이트', hex: '#F6F2ED', role: '중립' }, { name: '코코아', hex: '#81675E', role: '포인트' },
    ],
    lips: [{ name: '로즈 누드', hex: '#B47A79', note: '일상용 · 자연스럽게' }, { name: '로즈 브라운', hex: '#965F64', note: '포인트 · 차분하게' }],
    blush: [{ name: '누드 로즈', hex: '#D0A49E', note: '얇게 퍼뜨리기' }, { name: '소프트 피치', hex: '#D5A997', note: '은은한 생기' }],
    eyeshadow: [{ name: '로즈 토프', hex: '#A58C89', note: '데일리 음영' }, { name: '스톤 브라운', hex: '#8D7972', note: '차분한 포인트' }],
    dye: [{ name: '뉴트럴 브라운', hex: '#76594B', note: '자연스러운 조화' }, { name: '모카 브라운', hex: '#604A43', note: '깊이를 더하는 선택' }, { name: '베이지 브라운', hex: '#9A7964', note: '밝은 변화 · 시술 상담' }],
  },
  'clear-neutral': {
    title: '담백한 선명함', english: 'Clear balance', description: '깨끗한 기본색과 또렷한 포인트 색으로 균형을 잡아요.', tone: 'bright · strong · deep', alternate: 'soft', background: '#E1E1DE',
    palette: [
      { name: '크리스프 화이트', hex: '#F7F6F3', role: '기본' }, { name: '쿨 스톤', hex: '#B1B0B0', role: '기본' }, { name: '잉크 네이비', hex: '#344252', role: '기본' },
      { name: '베리 로즈', hex: '#B95470', role: '포인트' }, { name: '티얼', hex: '#287B7A', role: '포인트' }, { name: '코발트', hex: '#4763A0', role: '포인트' },
      { name: '차콜', hex: '#38383B', role: '중립' }, { name: '카멜', hex: '#B18A67', role: '포인트' }, { name: '딥 레드', hex: '#A5444C', role: '포인트' },
    ],
    lips: [{ name: '클리어 로즈', hex: '#C35E70', note: '일상용 · 생기 있게' }, { name: '로즈 레드', hex: '#B04453', note: '포인트 · 또렷하게' }],
    blush: [{ name: '로즈 핑크', hex: '#D58F9C', note: '가볍게 퍼뜨리기' }, { name: '피치 로즈', hex: '#DA9A91', note: '자연스러운 포인트' }],
    eyeshadow: [{ name: '뉴트럴 토프', hex: '#9B8C89', note: '기본 음영' }, { name: '딥 브라운', hex: '#66534F', note: '깊이 있는 포인트' }],
    dye: [{ name: '에스프레소', hex: '#3D3231', note: '또렷한 대비' }, { name: '뉴트럴 초콜릿', hex: '#62483E', note: '부드러운 균형' }, { name: '로즈 브라운', hex: '#75505A', note: '색감을 더하는 선택' }],
  },
  'soft-warm': {
    title: '부드러운 온기', english: 'Soft warmth', description: '차분하고 따뜻한 색이 얼굴의 자연스러운 분위기를 살려줘요.', tone: 'soft · light · dull', alternate: 'pale', background: '#EADFD2',
    palette: [
      { name: '오트 밀크', hex: '#E8DAC8', role: '기본' }, { name: '버터 크림', hex: '#F2E5BF', role: '기본' }, { name: '웜 토프', hex: '#A78D79', role: '기본' },
      { name: '세이지', hex: '#A8AE8A', role: '포인트' }, { name: '클레이 로즈', hex: '#C78F82', role: '포인트' }, { name: '아프리콧', hex: '#DAA376', role: '포인트' },
      { name: '카카오', hex: '#57483F', role: '중립' }, { name: '아이보리', hex: '#F8F2E8', role: '중립' }, { name: '올리브', hex: '#777957', role: '포인트' },
    ],
    lips: [{ name: '소프트 코랄', hex: '#C77F71', note: '일상용 · 얇게 바르기' }, { name: '웜 로즈', hex: '#AD6663', note: '포인트 · 선명하게' }],
    blush: [{ name: '피치 베이지', hex: '#D9A18B', note: '가볍게 퍼뜨리기' }, { name: '살구 로즈', hex: '#CD8D7B', note: '볼 중앙에 소량' }],
    eyeshadow: [{ name: '밀크 브라운', hex: '#A98570', note: '데일리 음영' }, { name: '올리브 토프', hex: '#8C8870', note: '차분한 포인트' }],
    dye: [{ name: '허니 브라운', hex: '#8B6248', note: '따뜻한 윤기' }, { name: '밀크 티 브라운', hex: '#A78A70', note: '밝은 변화 · 시술 상담' }, { name: '코코아 브라운', hex: '#614A3D', note: '부드러운 깊이' }],
  },
  'clear-warm': {
    title: '맑은 햇살', english: 'Clear warmth', description: '투명하고 생기 있는 따뜻한 색으로 산뜻한 대비를 만들어요.', tone: 'bright · light · vivid', alternate: 'soft', background: '#F5E2CB',
    palette: [
      { name: '바닐라', hex: '#F6E7C8', role: '기본' }, { name: '크림', hex: '#FFF6E8', role: '기본' }, { name: '카라멜', hex: '#BD8B5D', role: '기본' },
      { name: '코랄', hex: '#EF796A', role: '포인트' }, { name: '선샤인', hex: '#EAC065', role: '포인트' }, { name: '리프 그린', hex: '#90AE70', role: '포인트' },
      { name: '초콜릿', hex: '#534139', role: '중립' }, { name: '피치', hex: '#F6B49A', role: '포인트' }, { name: '웜 네이비', hex: '#344857', role: '중립' },
    ],
    lips: [{ name: '프레시 코랄', hex: '#EA6F67', note: '일상용 · 생기 있게' }, { name: '토마토 레드', hex: '#C84E48', note: '포인트 · 선명하게' }],
    blush: [{ name: '살구', hex: '#EDAA85', note: '맑게 퍼뜨리기' }, { name: '코랄 핑크', hex: '#E98C87', note: '조금 더 화사하게' }],
    eyeshadow: [{ name: '샴페인', hex: '#D5B382', note: '밝은 베이스' }, { name: '웜 브라운', hex: '#966B4D', note: '눈매 음영' }],
    dye: [{ name: '골든 브라운', hex: '#9C6C3F', note: '따뜻한 광택' }, { name: '카라멜 브라운', hex: '#A97751', note: '밝은 변화 · 시술 상담' }, { name: '다크 초콜릿', hex: '#4E362C', note: '안정적인 대비' }],
  },
  'soft-cool': {
    title: '은은한 여운', english: 'Soft coolness', description: '연하고 차분한 차가운 색이 부드러운 균형을 만들어요.', tone: 'pale · light grayish · soft', alternate: 'light', background: '#E5E0E5',
    palette: [
      { name: '라벤더 그레이', hex: '#BFB8C7', role: '기본' }, { name: '파우더 핑크', hex: '#E9CBD5', role: '기본' }, { name: '도브 그레이', hex: '#A8A4A9', role: '기본' },
      { name: '더스티 로즈', hex: '#B98495', role: '포인트' }, { name: '블루 미스트', hex: '#A8BDD2', role: '포인트' }, { name: '뮤트 라일락', hex: '#AA9BBB', role: '포인트' },
      { name: '소프트 네이비', hex: '#515C70', role: '중립' }, { name: '페일 화이트', hex: '#F7F4F6', role: '중립' }, { name: '세이지 그레이', hex: '#A5B3AA', role: '포인트' },
    ],
    lips: [{ name: '로즈 베이지', hex: '#B77988', note: '일상용 · 은은하게' }, { name: '뮤트 모브', hex: '#9D637D', note: '포인트 · 한 겹 더' }],
    blush: [{ name: '쿨 로즈', hex: '#D6A0B0', note: '얇게 퍼뜨리기' }, { name: '라일락 핑크', hex: '#C9AAC6', note: '은은한 포인트' }],
    eyeshadow: [{ name: '로즈 토프', hex: '#9D8892', note: '부드러운 음영' }, { name: '라벤더 그레이', hex: '#AAA0B2', note: '눈가 포인트' }],
    dye: [{ name: '애쉬 브라운', hex: '#786F6C', note: '차분한 인상' }, { name: '로즈 브라운', hex: '#88666C', note: '은은한 색감' }, { name: '쿨 다크 브라운', hex: '#493F42', note: '낮은 명도의 대안' }],
  },
  'clear-cool': {
    title: '선명한 균형', english: 'Clear coolness', description: '또렷하고 시원한 색으로 얼굴의 대비를 자연스럽게 이어줘요.', tone: 'vivid · deep · bright', alternate: 'strong', background: '#DDDDE8',
    palette: [
      { name: '퓨어 화이트', hex: '#FBFAFC', role: '기본' }, { name: '아이스 그레이', hex: '#D5DCE6', role: '기본' }, { name: '차콜', hex: '#444654', role: '기본' },
      { name: '베리 핑크', hex: '#C54D81', role: '포인트' }, { name: '로열 블루', hex: '#435CA7', role: '포인트' }, { name: '에메랄드', hex: '#21887C', role: '포인트' },
      { name: '블랙', hex: '#22232B', role: '중립' }, { name: '플럼', hex: '#754A75', role: '포인트' }, { name: '쿨 레드', hex: '#B93F59', role: '포인트' },
    ],
    lips: [{ name: '베리 로즈', hex: '#BF527E', note: '일상용 · 투명하게' }, { name: '쿨 레드', hex: '#B43758', note: '포인트 · 선명하게' }],
    blush: [{ name: '쿨 핑크', hex: '#DA93B0', note: '가볍게 퍼뜨리기' }, { name: '베리 핑크', hex: '#BD7398', note: '또렷한 포인트' }],
    eyeshadow: [{ name: '쿨 토프', hex: '#817782', note: '선명한 음영' }, { name: '플럼', hex: '#796079', note: '깊이 있는 포인트' }],
    dye: [{ name: '애쉬 블랙', hex: '#29292F', note: '또렷한 대비' }, { name: '쿨 에스프레소', hex: '#42363B', note: '깊고 부드럽게' }, { name: '플럼 브라운', hex: '#5D3E4C', note: '변화를 주는 포인트' }],
  },
}

export function suggestProfile(observations: Observations, temperatureOverride: Temperature | 'auto', clarityOverride: 'soft' | 'clear' | 'auto'): {
  profile: Profile; temperature: Temperature; clarity: 'soft' | 'clear'; contrast: '낮음' | '보통' | '높음'; reasons: string[]; provisional: boolean
} {
  const skin = observations.skin.hex ? rgbToLab(hexToRgb(observations.skin.hex)) : null
  const hair = observations.hair.hex ? relativeLuminance(observations.hair.hex) : null
  const eyes = observations.eyes.hex ? relativeLuminance(observations.eyes.hex) : null
  const distance = skin ? Math.max(...[hair, eyes].filter((v): v is number => v !== null).map((v) => Math.abs(skin.l - v)), 0) : 0
  const contrast = distance > 40 ? '높음' : distance > 24 ? '보통' : '낮음'
  // A photograph can hint at color temperature, but cannot establish undertone.
  const unreliableSkin = observations.skin.quality.includes('색조명')
  const observedTemperature: Temperature = !unreliableSkin && skin && skin.b - skin.a > 14 ? 'warm' : !unreliableSkin && skin && skin.b - skin.a < 3 ? 'cool' : 'neutral'
  const temperature = temperatureOverride === 'auto' ? observedTemperature : temperatureOverride
  const clarity = clarityOverride === 'auto' ? contrast === '높음' ? 'clear' : 'soft' : clarityOverride
  const profile: Profile = `${clarity}-${temperature}`
  const reasons = [
    temperatureOverride === 'auto' ? !skin ? '피부색을 선택하면 색감 경향을 더 구체적으로 제안할 수 있어요.' : unreliableSkin ? '색조명 영향으로 색감 경향을 판단하기 어려워 임시 팔레트를 보여드려요.' : '사진에서 관찰한 피부색 경향을 참고했어요.' : '직접 선택한 색감 취향을 우선했어요.',
    hair === null || eyes === null ? '헤어·눈 색 정보가 부족해 대비 판단은 참고용이에요.' : `피부와 헤어·눈 색의 밝기 차이는 ${contrast} 수준으로 관찰됐어요.`,
    clarityOverride === 'auto' ? '관찰된 대비에 맞춰 색의 선명함을 제안했어요.' : '직접 선택한 선명함을 반영했어요.',
  ]
  return { profile, temperature, clarity, contrast, reasons, provisional: !skin || hair === null || eyes === null || (temperatureOverride === 'auto' && temperature === 'neutral') }
}
