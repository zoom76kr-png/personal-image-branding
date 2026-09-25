import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowDownRight, ArrowLeft, ArrowRight, Camera, Check, ChevronDown, CircleHelp, Copy, Download, Droplets, Eye, ImagePlus, LockKeyhole, Menu, RefreshCw, ScanFace, Sparkles, Sun, UploadCloud, WandSparkles, X } from 'lucide-react'
import { analyzeImage, sampleAt, type Analysis } from './analysis'
import { collections, partLabels, suggestProfile, type Observations, type Part, type Temperature, type BeautyColor } from './recommend'
import { relativeLuminance } from './color'

type Screen = 'home' | 'capture' | 'results'
type Tab = 'palette' | 'makeup' | 'hair'
const emptyObservations: Observations = {
  skin: { hex: null, source: 'unavailable', quality: '직접 선택해 주세요' },
  hair: { hex: null, source: 'unavailable', quality: '직접 선택해 주세요' },
  eyes: { hex: null, source: 'unavailable', quality: '직접 선택해 주세요' },
}

function ColorChip({ hex, name, role, onClick, selected = false }: { hex: string; name: string; role?: string; onClick?: () => void; selected?: boolean }) {
  return <button className={`color-chip ${selected ? 'selected' : ''}`} onClick={onClick} type="button" title={`${name} ${hex}`}>
    <span className="color-chip__color" style={{ background: hex }}>{selected && <Check size={18} strokeWidth={2.6} color={relativeLuminance(hex) < 55 ? '#fff' : '#36313b'} />}</span>
    <span className="color-chip__text"><strong>{name}</strong><small>{role ?? hex}</small></span>
  </button>
}

function BeautyList({ title, subtitle, items }: { title: string; subtitle: string; items: BeautyColor[] }) {
  return <div className="beauty-list">
    <div className="beauty-list__head"><div><span className="eyebrow">COLOR EDIT</span><h3>{title}</h3></div><p>{subtitle}</p></div>
    <div className="beauty-list__items">{items.map((item) => <div className="beauty-item" key={item.name}><span className="beauty-item__swatch" style={{ background: item.hex }} /><div><strong>{item.name}</strong><small>{item.note}</small></div><span className="mono">{item.hex}</span></div>)}</div>
  </div>
}

export default function App() {
  const [screen, setScreen] = useState<Screen>('home')
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const [analysis, setAnalysis] = useState<Analysis | null>(null)
  const [observations, setObservations] = useState<Observations>(emptyObservations)
  const [tab, setTab] = useState<Tab>('palette')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [cameraOpen, setCameraOpen] = useState(false)
  const [cameraError, setCameraError] = useState('')
  const [temperature, setTemperature] = useState<Temperature | 'auto'>('auto')
  const [clarity, setClarity] = useState<'soft' | 'clear' | 'auto'>('auto')
  const [selected, setSelected] = useState<string[]>([])
  const [compare, setCompare] = useState<string | null>(null)
  const [picking, setPicking] = useState<Part | null>(null)
  const [showMenu, setShowMenu] = useState(false)
  const [hairTreated, setHairTreated] = useState(false)
  const [lenses, setLenses] = useState(false)
  const [makeup, setMakeup] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const imageRef = useRef<HTMLImageElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const photoUrlRef = useRef<string | null>(null)

  const recommendation = useMemo(() => suggestProfile(observations, temperature, clarity), [observations, temperature, clarity])
  const collection = collections[recommendation.profile]

  function stopCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    setCameraOpen(false)
  }

  useEffect(() => () => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    if (photoUrlRef.current) URL.revokeObjectURL(photoUrlRef.current)
  }, [])

  function reset() {
    stopCamera()
    if (photoUrlRef.current) URL.revokeObjectURL(photoUrlRef.current)
    photoUrlRef.current = null
    setPhotoUrl(null); setAnalysis(null); setObservations(emptyObservations); setSelected([]); setCompare(null)
    setTemperature('auto'); setClarity('auto'); setPicking(null); setError(''); setScreen('home')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function selectFile(file: File | undefined) {
    if (!file) return
    setError('')
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { setError('JPG, PNG, WebP 사진만 사용할 수 있어요.'); return }
    if (file.size > 10 * 1024 * 1024) { setError('사진 크기는 10MB 이하로 선택해 주세요.'); return }
    if (photoUrlRef.current) URL.revokeObjectURL(photoUrlRef.current)
    const url = URL.createObjectURL(file)
    photoUrlRef.current = url; setPhotoUrl(url); setAnalysis(null); setScreen('capture'); stopCamera()
  }

  async function openCamera() {
    setCameraError(''); setError('')
    if (!navigator.mediaDevices?.getUserMedia) { setCameraError('이 브라우저에서는 카메라를 사용할 수 없어요. 사진을 업로드해 주세요.'); return }
    try {
      stopCamera()
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 1280 } }, audio: false })
      streamRef.current = stream
      setCameraOpen(true); setScreen('capture')
      requestAnimationFrame(() => { if (videoRef.current) videoRef.current.srcObject = stream })
    } catch { setCameraError('카메라를 열 수 없어요. 브라우저 권한을 확인하거나 사진을 업로드해 주세요.'); setScreen('capture') }
  }

  function capture() {
    const video = videoRef.current
    if (!video || !video.videoWidth) { setError('카메라 화면을 준비 중이에요. 잠시 후 다시 눌러 주세요.'); return }
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth; canvas.height = video.videoHeight
    canvas.getContext('2d')?.drawImage(video, 0, 0)
    canvas.toBlob((blob) => { if (blob) selectFile(new File([blob], 'portrait.jpg', { type: 'image/jpeg' })) }, 'image/jpeg', .92)
  }

  async function runAnalysis() {
    const image = imageRef.current
    if (!image || !image.complete || !image.naturalWidth) { setError('사진이 아직 준비되지 않았어요. 잠시 후 다시 시도해 주세요.'); return }
    setBusy(true); setError('')
    try {
      const result = await analyzeImage(image)
      setAnalysis(result); setObservations(result.observations); setSelected([]); setCompare(null)
      setScreen('results'); window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (cause) { setError(cause instanceof Error ? cause.message : '분석 중 문제가 생겼어요. 다시 시도해 주세요.') }
    finally { setBusy(false) }
  }

  function chooseManual() {
    setAnalysis(null); setObservations(emptyObservations); setScreen('results'); setTab('palette')
    setTemperature('neutral'); setClarity('soft')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function updatePart(part: Part, hex: string | null) {
    setObservations((prev) => ({ ...prev, [part]: { hex, source: hex ? 'manual' : 'unavailable', quality: hex ? '직접 선택' : '분석 제외' } }))
  }

  function pickFromImage(event: React.MouseEvent<HTMLImageElement>) {
    if (!picking || !imageRef.current) return
    const rect = imageRef.current.getBoundingClientRect()
    const imageScale = Math.min(rect.width / imageRef.current.naturalWidth, rect.height / imageRef.current.naturalHeight)
    const shownWidth = imageRef.current.naturalWidth * imageScale
    const shownHeight = imageRef.current.naturalHeight * imageScale
    const x = (event.clientX - rect.left - (rect.width - shownWidth) / 2) / shownWidth
    const y = (event.clientY - rect.top - (rect.height - shownHeight) / 2) / shownHeight
    if (x < 0 || x > 1 || y < 0 || y > 1) return
    const hex = sampleAt(imageRef.current, x, y, Math.max(4, imageRef.current.naturalWidth / 120))
    if (hex) updatePart(picking, hex)
    setPicking(null)
  }

  function toggleSelected(hex: string) { setSelected((current) => current.includes(hex) ? current.filter((item) => item !== hex) : [...current, hex]) }

  function downloadPalette() {
    const chosen = collection.palette.filter((swatch) => selected.length === 0 || selected.includes(swatch.hex))
    const canvas = document.createElement('canvas'); canvas.width = 1200; canvas.height = 900
    const ctx = canvas.getContext('2d'); if (!ctx) return
    ctx.fillStyle = '#F8F5F1'; ctx.fillRect(0, 0, 1200, 900)
    ctx.fillStyle = '#64516C'; ctx.font = 'bold 26px sans-serif'; ctx.fillText('ONSEK  /  PERSONAL COLOR NOTES', 80, 90)
    ctx.fillStyle = '#25212A'; ctx.font = 'bold 72px sans-serif'; ctx.fillText(collection.title, 80, 190)
    ctx.fillStyle = '#625C64'; ctx.font = '28px sans-serif'; ctx.fillText(`${collection.english}  ·  ${collection.tone}`, 80, 240)
    chosen.forEach((swatch, index) => {
      const cols = 3, col = index % cols, row = Math.floor(index / cols)
      const x = 80 + col * 360, y = 300 + row * 170
      ctx.fillStyle = swatch.hex; ctx.fillRect(x, y, 300, 105)
      ctx.fillStyle = '#25212A'; ctx.font = 'bold 24px sans-serif'; ctx.fillText(swatch.name, x, y + 136)
      ctx.fillStyle = '#625C64'; ctx.font = '20px sans-serif'; ctx.fillText(swatch.hex, x + 190, y + 136)
    })
    ctx.fillStyle = '#807981'; ctx.font = '19px sans-serif'; ctx.fillText('사진 기반 탐색용 추천 · 화면색은 실제 제품 발색과 다를 수 있습니다.', 80, 858)
    const link = document.createElement('a'); link.download = 'onsek-palette.png'; link.href = canvas.toDataURL('image/png'); link.click()
  }

  async function copyColor(hex: string) { try { await navigator.clipboard.writeText(hex) } catch { setError('색상 코드를 복사하지 못했어요. 화면의 HEX 값을 직접 선택해 주세요.') } }

  return <div className="site-shell">
    <header className="site-header">
      <a className="brand" href="#home" onClick={(event) => { event.preventDefault(); reset() }} aria-label="온색 홈"><span className="brand-mark"><i /><i /><i /></span><span>온색<span className="brand-dot">.</span></span></a>
      <nav className={showMenu ? 'site-nav open' : 'site-nav'} aria-label="주 메뉴">
        <button onClick={() => { reset(); setShowMenu(false) }}>서비스 소개</button>
        <button onClick={() => { setScreen('capture'); setShowMenu(false) }}>컬러 찾기</button>
        <a href="#about" onClick={() => setShowMenu(false)}>분석 안내</a>
      </nav>
      <button className="header-cta" onClick={() => { setScreen('capture'); setShowMenu(false) }}>내 컬러 찾기 <ArrowUpRightIcon /></button>
      <button className="mobile-menu" onClick={() => setShowMenu(!showMenu)} aria-label="메뉴 열기">{showMenu ? <X size={23} /> : <Menu size={23} />}</button>
    </header>

    {screen === 'home' && <main id="home">
      <section className="hero">
        <div className="hero__content">
          <div className="overline"><span className="sparkle-small">✳</span> A LITTLE COLOR, A LOT MORE YOU</div>
          <h1>나를 가장 나답게<br /><em>빛내는 색</em>을 찾아요.</h1>
          <p>사진 한 장에서 시작하는 나만의 컬러 탐색. 피부와 헤어, 눈동자색을 살펴보고 오늘의 옷부터 메이크업, 헤어까지 어울리는 색을 제안해요.</p>
          <div className="hero__actions"><button className="button button--primary" onClick={() => setScreen('capture')}>내 컬러 발견하기 <ArrowRight size={18} /></button><button className="button button--text" onClick={() => document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' })}>어떻게 찾나요? <ArrowDownRight size={17} /></button></div>
          <div className="hero__proof"><div className="proof-avatars"><span>✦</span><span>✧</span><span>✳</span></div><span>취향의 시작은 나를 관찰하는 것부터</span></div>
        </div>
        <div className="hero__visual" aria-hidden="true">
          <div className="hero-art"><div className="hero-art__halo" /><div className="hero-art__face"><div className="face-hair" /><div className="face-shape"><div className="face-eyes"><i /><i /></div><div className="face-nose"/><div className="face-mouth"/></div><div className="face-neck"/><div className="face-shirt"/></div><div className="floating-card floating-card--top"><span className="floating-card__mini"><i style={{ background: '#A698A7' }} /><i style={{ background: '#D3A69A' }} /><i style={{ background: '#DBBD83' }} /></span> YOUR COLOR MOOD</div><div className="floating-card floating-card--bottom"><Sparkles size={17} fill="currentColor"/> 당신의 색을 만나보세요</div></div>
          <span className="vertical-caption">COLOR IS A WAY OF FEELING</span>
        </div>
      </section>

      <section className="benefit-strip" aria-label="서비스 특징"><div><ScanFace size={22}/><span>피부 · 헤어 · 눈동자 컬러</span></div><i/><div><Droplets size={22}/><span>PCCS 톤 기반 팔레트</span></div><i/><div><WandSparkles size={22}/><span>뷰티 & 헤어 추천</span></div></section>

      <section className="how-section" id="about"><div className="section-heading"><span className="eyebrow">THE PROCESS</span><h2>컬러를 찾는<br />세 가지 작은 단계</h2><p>사진 속 색을 관찰하고, 직접 확인한 뒤, 나에게 맞는 조합을 탐색합니다.</p></div><div className="steps-grid"><div className="step-card"><span className="step-number">01</span><div className="step-icon"><Camera size={27}/></div><h3>사진 준비하기</h3><p>고른 자연광에서 정면 사진을 찍거나 업로드해 주세요. 웹캠도 사용할 수 있어요.</p></div><div className="step-card"><span className="step-number">02</span><div className="step-icon"><Eye size={27}/></div><h3>색 확인하기</h3><p>사진에서 찾은 피부·헤어·눈동자색을 보고 다르면 직접 바꿀 수 있어요.</p></div><div className="step-card"><span className="step-number">03</span><div className="step-icon"><Sparkles size={27}/></div><h3>새로운 색 만나기</h3><p>팔레트와 메이크업, 염색 후보를 비교하고 마음에 드는 색을 저장해 보세요.</p></div></div></section>
      <section className="privacy-banner"><div><LockKeyhole size={20}/><span>내 사진은 내 브라우저 안에서 분석돼요. 서버로 전송하거나 저장하지 않습니다.</span></div><button onClick={() => setScreen('capture')}>지금 시작하기 <ArrowRight size={17}/></button></section>
    </main>}

    {screen === 'capture' && <main className="inner-page"><div className="page-top"><button className="back-button" onClick={reset}><ArrowLeft size={18}/> 돌아가기</button><span>STEP 01 / 03</span></div><div className="capture-heading"><span className="eyebrow">LET'S BEGIN</span><h1>당신의 색을<br /><em>보여주세요.</em></h1><p>얼굴이 잘 보이는 사진 한 장이면 충분해요. 색은 분석 후 직접 수정할 수 있습니다.</p></div>
      <div className="capture-layout"><div className="capture-main">
        <div className={`photo-area ${photoUrl ? 'has-photo' : ''}`}>
          {photoUrl ? <><img ref={imageRef} src={photoUrl} alt="분석할 얼굴 사진"/><button className="remove-photo" onClick={() => { if (photoUrlRef.current) URL.revokeObjectURL(photoUrlRef.current); photoUrlRef.current = null; setPhotoUrl(null); setAnalysis(null) }} aria-label="사진 삭제"><X size={18}/></button></> : cameraOpen ? <><video ref={(node) => { videoRef.current = node; if (node && streamRef.current) node.srcObject = streamRef.current }} autoPlay playsInline muted aria-label="카메라 미리보기"/><span className="face-guide"/></> : <div className="photo-placeholder"><div className="placeholder-orbit"><ScanFace size={53} strokeWidth={1.2}/></div><strong>사진을 올리거나 촬영해 주세요</strong><span>얼굴이 정면에 또렷하게 보이면 좋아요</span></div>}
        </div>
        {cameraOpen && !photoUrl && <button className="button button--primary wide" onClick={capture}><Camera size={18}/> 이 모습으로 촬영하기</button>}
        {!photoUrl && !cameraOpen && <div className="input-actions"><button className="input-action" onClick={() => fileRef.current?.click()}><span><UploadCloud size={25}/></span><strong>사진 업로드</strong><small>JPG, PNG, WebP · 최대 10MB</small><ArrowRight size={18}/></button><button className="input-action" onClick={openCamera}><span><Camera size={25}/></span><strong>웹캠 촬영</strong><small>카메라 접근 권한이 필요해요</small><ArrowRight size={18}/></button></div>}
        {photoUrl && <div className="photo-actions"><button onClick={() => fileRef.current?.click()}><RefreshCw size={16}/> 다른 사진 선택</button><button className="button button--primary" onClick={runAnalysis} disabled={busy}>{busy ? '사진을 분석하고 있어요…' : '이 사진 분석하기'} {!busy && <ArrowRight size={18}/>}</button></div>}
        {(error || cameraError) && <p role="alert" className="error-box">{error || cameraError}</p>}
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(event) => { selectFile(event.target.files?.[0]); event.target.value = '' }} />
      </div><aside className="capture-aside"><div className="tip-card"><div className="tip-icon"><Sun size={22}/></div><span className="eyebrow">PHOTO TIPS</span><h3>이렇게 찍으면<br />더 좋아요</h3><ul><li><Check size={16}/> 자연광 아래에서 정면을 바라보기</li><li><Check size={16}/> 필터와 강한 색조명 끄기</li><li><Check size={16}/> 얼굴과 머리카락이 잘 보이게</li></ul><p>메이크업·염색·렌즈가 있다면 현재 모습의 색으로 분석돼요.</p></div><div className="manual-entry"><CircleHelp size={20}/><div><strong>사진 사용이 어려우신가요?</strong><p>직접 색을 고르면서 팔레트를 탐색할 수도 있어요.</p><button onClick={chooseManual}>직접 선택하기 <ArrowRight size={15}/></button></div></div></aside></div>
      <div className="input-notes"><label><input type="checkbox" checked={makeup} onChange={(e) => setMakeup(e.target.checked)}/> 색조 화장을 했어요</label><label><input type="checkbox" checked={hairTreated} onChange={(e) => setHairTreated(e.target.checked)}/> 현재 염색한 머리예요</label><label><input type="checkbox" checked={lenses} onChange={(e) => setLenses(e.target.checked)}/> 컬러렌즈를 착용했어요</label></div>
    </main>}

    {screen === 'results' && <main className="inner-page result-page"><div className="page-top"><button className="back-button" onClick={() => setScreen('capture')}><ArrowLeft size={18}/> 사진 다시 선택</button><span>STEP 03 / 03</span></div><div className="result-heading"><div><span className="eyebrow">YOUR COLOR STORY</span><h1>당신을 닮은<br /><em>색의 이야기.</em></h1><p>관찰된 색과 선택한 취향을 바탕으로 만든 탐색용 제안이에요.</p></div><button className="restart-button" onClick={reset}><RefreshCw size={16}/> 처음부터</button></div>
      <div className="result-grid"><aside className="result-aside"><div className="observation-card"><div className="card-header"><span className="eyebrow">01 / OBSERVED COLORS</span><h2>사진에서 찾은 색</h2><p>색이 다르게 보이면 직접 고쳐 주세요.</p></div>{photoUrl && <div className={`result-photo ${picking ? 'is-picking' : ''}`}><img ref={imageRef} src={photoUrl} alt="분석에 사용한 얼굴 사진" onClick={pickFromImage}/>{picking && <div className="pick-hint">{partLabels[picking]}색을 선택할 지점을 눌러주세요</div>}</div>}
        <div className="observations">{(['skin', 'hair', 'eyes'] as Part[]).map((part) => <div className="observation" key={part}><span className="observation__swatch" style={{ background: observations[part].hex ?? '#ECE8E6' }}/><div><strong>{partLabels[part]}</strong><small>{observations[part].hex ?? '미선택'} · {observations[part].quality}</small></div><label className="color-input-label" title={`${partLabels[part]} 색 직접 선택`}><span>수정</span><input type="color" value={observations[part].hex ?? '#A58379'} onChange={(e) => updatePart(part, e.target.value)} aria-label={`${partLabels[part]} 색 직접 선택`}/></label>{photoUrl && <button className="sample-button" title="사진에서 다시 고르기" aria-label={`${partLabels[part]} 사진에서 다시 고르기`} onClick={() => setPicking(picking === part ? null : part)}><ImagePlus size={16}/></button>}</div>)}</div>
        {analysis?.warnings.length ? <div className="warning-note"><CircleHelp size={17}/><div>{analysis.warnings.map((warning) => <p key={warning}>{warning}</p>)}</div></div> : null}
        {(makeup || hairTreated || lenses) && <p className="current-look-note">{[makeup && '화장', hairTreated && '염색', lenses && '렌즈'].filter(Boolean).join('·')} 상태의 현재 색을 참고했어요.</p>}
      </div><div className="preference-card"><span className="eyebrow">02 / FINE TUNE</span><h3>원하는 분위기로 조정</h3><label>색감 경향 <ChevronDown size={14}/><select value={temperature} onChange={(e) => setTemperature(e.target.value as Temperature | 'auto')}><option value="auto">사진에서 자동 제안</option><option value="warm">따뜻한 색</option><option value="neutral">중립적인 색</option><option value="cool">차가운 색</option></select></label><label>색의 선명함 <ChevronDown size={14}/><select value={clarity} onChange={(e) => setClarity(e.target.value as 'soft' | 'clear' | 'auto')}><option value="auto">사진에서 자동 제안</option><option value="soft">부드럽고 차분하게</option><option value="clear">선명하고 또렷하게</option></select></label><p>선택을 바꾸면 추천 팔레트가 바로 달라집니다.</p></div></aside>
      <section className="recommend-main"><div className="feature-card" style={{ background: collection.background }}><div className="feature-card__copy"><span className="eyebrow">YOUR PALETTE MOOD</span><div className="mood-symbol">✳</div><h2>{collection.title}</h2><p className="feature-card__english">{collection.english}</p><p>{collection.description}</p><div className="tone-tag">{recommendation.provisional ? '임시 톤' : '추천 톤'} · {collection.tone}</div></div><div className="feature-card__composition" aria-hidden="true"><span style={{ background: collection.palette[3].hex }}/><span style={{ background: collection.palette[1].hex }}/><span style={{ background: collection.palette[4].hex }}/><span style={{ background: collection.palette[6].hex }}/></div></div>
        <div className="explain-bar"><Sparkles size={18}/><div><strong>이 색을 제안한 이유</strong><p>{recommendation.reasons.join(' ')}</p></div></div>
        <div className="result-tabs" role="tablist" aria-label="추천 종류"><button role="tab" aria-selected={tab === 'palette'} className={tab === 'palette' ? 'active' : ''} onClick={() => setTab('palette')}>컬러 팔레트</button><button role="tab" aria-selected={tab === 'makeup'} className={tab === 'makeup' ? 'active' : ''} onClick={() => setTab('makeup')}>메이크업</button><button role="tab" aria-selected={tab === 'hair'} className={tab === 'hair' ? 'active' : ''} onClick={() => setTab('hair')}>헤어 컬러</button></div>
        {tab === 'palette' && <div className="tab-panel"><div className="panel-heading"><div><span className="eyebrow">CURATED FOR YOU</span><h2>일상에 더해볼 색들</h2><p>마음에 드는 색을 선택해 팔레트로 저장하세요.</p></div><button className="download-button" onClick={downloadPalette}><Download size={17}/> 팔레트 저장</button></div><div className="color-grid">{collection.palette.map((swatch) => <ColorChip key={swatch.hex} {...swatch} selected={selected.includes(swatch.hex)} onClick={() => { toggleSelected(swatch.hex); setCompare(swatch.hex) }}/>)}</div><div className="compare-panel"><div><span className="eyebrow">COLOR PREVIEW</span><h3>어떤 느낌인가요?</h3><p>색 카드를 눌러 사진 옆에서 비교해 보세요.</p></div><div className="compare-preview"><span style={{ background: compare ?? collection.palette[4].hex }} />{photoUrl && <img src={photoUrl} alt="선택한 색상과 비교할 얼굴"/>}<span style={{ background: compare ?? collection.palette[4].hex }} /></div><button className="copy-button" onClick={() => copyColor(compare ?? collection.palette[4].hex)}><Copy size={15}/>{compare ?? collection.palette[4].hex} 복사</button></div><p className="subtle-note">함께 볼 대안 톤: {collection.alternate}. 이 팔레트는 PCCS 톤 개념을 참고한 자체 근사 색상이며 공식 PCCS 색표가 아닙니다.</p></div>}
        {tab === 'makeup' && <div className="tab-panel makeup-panel"><div className="panel-heading"><div><span className="eyebrow">BEAUTY COLOR NOTES</span><h2>얼굴에 더하는 색</h2><p>평소에는 얇게, 변화를 주고 싶을 땐 한 겹 더해 보세요.</p></div></div><BeautyList title="립 컬러" subtitle="입술에 가장 먼저 닿는 색" items={collection.lips}/><BeautyList title="블러셔" subtitle="얼굴에 자연스럽게 퍼지는 생기" items={collection.blush}/><BeautyList title="아이섀도" subtitle="눈가에 균형을 만드는 색" items={collection.eyeshadow}/><p className="subtle-note">색상군 제안입니다. 실제 제품은 제형·피부 위 발색에 따라 달라질 수 있어요. 파운데이션 호수는 추천하지 않습니다.</p></div>}
        {tab === 'hair' && <div className="tab-panel hair-panel"><div className="panel-heading"><div><span className="eyebrow">HAIR COLOR NOTES</span><h2>머리카락에 어울리는 색</h2><p>지금의 분위기를 살리거나 새로운 대비를 만들어 보세요.</p></div></div><div className="hair-options">{collection.dye.map((item, index) => <div className="hair-option" key={item.name}><div className="hair-option__color" style={{ background: item.hex }}><span>0{index + 1}</span></div><div><h3>{item.name}</h3><p>{item.note}</p><span className="mono">{item.hex}</span></div></div>)}</div><div className="hair-caution"><CircleHelp size={18}/><p>현재 머리색과 염색 이력에 따라 결과가 달라져요. 탈색 횟수나 최종 발색은 시술 전문가와 상의해 주세요.</p></div></div>}
      </section></div><div className="disclaimer"><LockKeyhole size={18}/><p>사진과 분석 결과는 서버로 전송되지 않아요. 추천은 색을 탐색하는 참고 제안이며, 조명·화장·화면 설정에 따라 달라질 수 있습니다.</p></div>
    </main>}
    <footer className="site-footer"><a className="brand" href="#home" onClick={(event) => { event.preventDefault(); reset() }}><span className="brand-mark"><i/><i/><i/></span><span>온색<span className="brand-dot">.</span></span></a><p>색을 통해 조금 더 나다운 하루.</p><small>© 2026 ONSEK · Personal color exploration</small></footer>
  </div>
}

function ArrowUpRightIcon() { return <ArrowRight size={16} style={{ transform: 'rotate(-45deg)' }} /> }
