# 03. 3D 가구 에셋 전략 (2026-04)

> 리서치일: 2026-04-20

---

## 1. 요약: 에셋 소싱 의사결정

| 소스 | 라이선스 | 포맷 | 용도 | 즉시 사용 |
|------|---------|------|------|----------|
| **Kenney Furniture Kit** | **CC0** | GLB 140개 | 베이스라인 | YES — ZIP 하나로 끝 |
| **Poly Pizza** | CC-BY/CC0 | GLB | 공백 보충 | YES — 아이템별 |
| **Quaternius Ultimate Furniture Pack** | CC0 | OBJ/FBX → 변환필요 | 추가 20개 | YES (변환 후) |
| **Sketchfab CC0 필터** | CC0 | GLB | 고퀄리티 | YES (압축 필수) |
| **Meshy.ai Pro ($10/월)** | 상업용 OK | GLB | 한국 특화 (신발장, 에어컨 등) | YES — 100개/월 |
| **IKEA 공식 GLB (스크립트)** | 개인 사용만 | GLB | **프로토타입 참조만** | **배포 금지** |
| **Poly Haven** | CC0 | glTF/GLB, HDRI | 고퀄 가구 테스트, HDRI 조명 | YES |
| **CGTrader 무료** | 상업용 여부 불명 | - | 개별 확인 필요 | NO (기본) |

## 2. 최소 실행 가능 에셋 리스트 — 40개 (한국 원룸/투룸)

### 2.1 침실 (5)
- 싱글 침대 (프레임+매트)
- 더블/퀸 침대
- 베개 (재사용)
- 이불 (draped)
- 화장대

### 2.2 좌석 (6)
- 2인 소파, 3인 소파
- 암체어
- 좌방석 (BoxGeometry 가능)
- 식탁 의자 (인스턴싱)
- 오피스 체어

### 2.3 테이블 (5)
- 커피 테이블
- 식탁 2인
- 식탁 4인
- 책상
- 사이드 테이블

### 2.4 수납 (7) — **한국 특화**
- 옷장
- 책장
- TV장
- 주방 상부장
- 주방 하부장
- 작은 선반
- **신발장** (Meshy 필요)

### 2.5 주방/가전 (6)
- 냉장고
- 세탁기
- 전자레인지
- 싱크대
- 가스/인덕션
- **전기밥솥** (Meshy/프로시저)

### 2.6 전자 (5) — **한국 특화**
- TV (벽걸이/스탠드)
- 모니터+데스크 셋업
- **벽걸이 에어컨** (한국 필수, Meshy)
- 선풍기
- 공기청정기

### 2.7 조명 (3)
- 천장등 (디스크+스피어 프로시저)
- 플로어 램프
- 데스크 램프

### 2.8 데코 (3)
- 화분 (작은)
- 화분 (큰 스탠드)
- 러그 (평면 + 텍스처)

**총 40개**. 이 중 ~10은 Poly Haven/Sketchfab CC0의 고퀄 hero asset, ~20은 Kenney/Poly Pizza 베이스라인, ~5는 Meshy AI 같은 한국 특화 모델, ~5는 BoxGeometry 프로시저로 시작한다.

## 3. 에셋 파이프라인 (build-time)

### 3.1 설치
```bash
pnpm add -g @gltf-transform/cli
# KTX-Software (toktx) for KTX2
brew install --cask ktx-software   # macOS
```

### 3.2 개별 최적화
```bash
gltf-transform inspect raw/bed_single.glb            # 사이즈 진단
gltf-transform optimize raw/bed_single.glb \
  public/assets/furniture/bed_single.glb \
  --compress draco \
  --texture-compress webp \
  --simplify 0.7
```

### 3.3 배치 처리 (npm script)
```json
// package.json
"scripts": {
  "assets:setup": "pnpm assets:fetch && pnpm assets:prepare",
  "assets:inspect": "gltf-transform inspect public/assets/models/sheen-chair.optimized.glb public/assets/models/polyhaven/*.glb"
}
```

```js
// scripts/optimize-assets.mjs
import { readdirSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { join } from 'node:path'

const SRC = 'raw/furniture'
const DST = 'public/assets/furniture'

for (const f of readdirSync(SRC).filter(f => f.endsWith('.glb'))) {
  const src = join(SRC, f)
  const dst = join(DST, f)
  console.log('→', f)
  execSync(`gltf-transform optimize "${src}" "${dst}" --compress draco --texture-compress webp --simplify 0.75`, { stdio: 'inherit' })
}
```

### 3.4 타깃 파일 크기 (압축 후)
- 간단 가구 (책상, 의자): **50~150KB**
- 복잡 가구 (소파, 침대+쿠션): **200~500KB**
- 식물, 램프: **30~100KB**

**전체 40개 × 평균 200KB ≈ 8MB**. lazy load + IndexedDB 캐시 전략.

## 4. IKEA 에셋 (주의)

**용도**: 내부 프로토타입 시각화 참조 **ONLY**.
**금지**: 상업 배포, 재배포, 제품 포함.

도구 (개인 참조용):
- Chrome 확장: https://chromewebstore.google.com/detail/ikea-3d-model-downloader/cfejhlbbbknglhfhgamjoimnanmoopje
- Tampermonkey (1.1k stars): https://github.com/apinanaivot/IKEA-3D-Model-Download-Button
- 배치 다운로드: https://github.com/apinanaivot/IKEA-3d-model-batch-downloader

IKEA 모델은 **KHR_Texture_Transform** 확장 사용. Three.js에서 지원하나 복잡한 UV 변환 있음.

## 5. 프로시저럴 가구 (코드로 만드는 것)

Kenney/Poly Pizza에 없는 단순 박스형은 **BoxGeometry**로 직접 생성:

```tsx
// scene/furniture/ProceduralSimpleTable.tsx
export function ProceduralSimpleTable({ w=1.4, d=0.8, h=0.74 }) {
  return (
    <group>
      {/* top */}
      <mesh position={[0, h-0.02, 0]}>
        <boxGeometry args={[w, 0.04, d]} />
        <meshStandardMaterial color="#d9bd95" roughness={0.7} />
      </mesh>
      {/* 4 legs */}
      {[[-w/2+0.04, -d/2+0.04], [w/2-0.04, -d/2+0.04], [-w/2+0.04, d/2-0.04], [w/2-0.04, d/2-0.04]].map(([x,z],i) =>
        <mesh key={i} position={[x, (h-0.04)/2, z]}>
          <boxGeometry args={[0.05, h-0.04, 0.05]} />
          <meshStandardMaterial color="#8b6a3c" />
        </mesh>
      )}
    </group>
  )
}
```

- **러그**, **신발장**, **책장**, **TV장**, **선반** 등 박스형은 이 방식으로 0KB.
- Kenney 등 GLB 다운로드를 **40% 줄일 수 있음**.

## 6. AI 생성 (Meshy)

**사용처**: 한국 특화 아이템 (신발장, 전기밥솥, 벽걸이 에어컨, 좌방석).
**비용**: Pro $10/월 (1000 credits ≈ 100개). 이미지→3D가 텍스트→3D보다 좋음.
**퀄리티**: 소파/의자는 30~50% 수동 Blender 정리 예상. 박스형은 거의 완성.

## 7. 로컬 이미지→3D (선택)

`TripoSR`, `Stable Fast 3D`, `InstantMesh` 모두 로컬 가능:
- TripoSR: 가장 빠름 (GPU 3-8초), 가구 복잡형 부족
- SF3D: UV + PBR 추가, 텍스처 품질 좋음
- InstantMesh: 12GB VRAM 필요, 의자/소파 제일 좋음

**결론**: 포괄적 사용 금지. 5~10개 공백 채우기 용도로만.

## 8. 다운로드 액션 리스트 (내일 실행)

```bash
# 1. Kenney Furniture Kit (140 GLB, CC0)
mkdir -p raw/furniture
curl -L -o kenney.zip "https://kenney.nl/media/pages/assets/furniture-kit/e56d2a9828-1677580847/kenney_furniture-kit.zip"
unzip kenney.zip -d kenney-raw

# 2. Poly Pizza 수동 검색 (한국 특화 키워드)
#   - "shoe cabinet", "rice cooker", "air conditioner wall", "zabuton"
#   열어 CC0/CC-BY 확인 후 GLB 저장

# 3. Meshy 가입 → 카탈로그 사진 업로드 → Image-to-3D
#   (상업 라이선스 확인 - Pro tier)

# 4. 파이프라인
pnpm run assets:build
```

## 9. 에셋 메타데이터 스키마

각 GLB와 함께 JSON 메타파일:
```json
// public/assets/furniture/bed_single.json
{
  "id": "bed_single_01",
  "name": "싱글 침대",
  "nameEn": "Single Bed",
  "category": "sleeping",
  "tags": ["모던", "우드", "원룸"],
  "glbUrl": "/assets/furniture/bed_single.glb",
  "thumbnail": "/assets/thumbnails/bed_single.webp",
  "dimensions": { "x": 1.0, "y": 0.6, "z": 2.0 },
  "placement": "floor",
  "snapToWall": true,
  "clearance": { "front": 0.4, "sides": 0.2 },
  "priceKRW": 299000,
  "source": "kenney",
  "license": "CC0"
}
```

전체 카탈로그는 `src/domain/catalog.ts`로 컴파일 (40개 × ~500B = ~20KB JSON 번들).

---

**참조**:
- [Kenney Furniture Kit (CC0)](https://kenney.nl/assets/furniture-kit)
- [Poly Pizza](https://poly.pizza/)
- [Quaternius Ultimate Furniture](https://quaternius.com/packs/ultimatefurniture.html)
- [Sketchfab CC0](https://sketchfab.com/3d-models?features=downloadable&license=cc0&q=furniture)
- [Meshy.ai](https://www.meshy.ai/)
- [gltf-transform CLI](https://gltf-transform.dev/cli)
- [awesome-cc0](https://github.com/madjin/awesome-cc0)
