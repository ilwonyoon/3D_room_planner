# 06. 경쟁/레퍼런스 서비스 기술 분석

> 리서치일: 2026-04-20

---

## 1. 우리가 복제할 가장 가까운 모델: **오늘의집 3D 방꾸미기**

**기술 스택 (확인)**: Three.js + WebGL. Mobile-first React. GLB 가구 라이브러리. AR은 웹 아닌 **네이티브 앱 쪽 딥링크**.

**지표**:
- 3D 방꾸미기 feature 전용 90,000 MAU (2025-01)
- AR 사용 시 구매 전환 +79%
- 만족도 88%

**아키텍처 교훈**:
1. 웹 에디터는 Three.js + GLB — **복제 대상**
2. AR은 절대 **웹 브라우저에서 시도 X** — 네이티브 앱 연동
3. 소셜 공유 루프가 성장 동력 (내 방 공유 → 타인 쇼핑)

증거: [Wishket 채용공고](https://www.wishket.com/project/10824/) - "WebGL 및 Three.js 등을 이용한 3D 방꾸미기 웹 페이지 개발"

## 2. 비주얼 스타일: **Altroom3d (TikTok)** - 포켓룸 미학

**특성**: Blender 렌더링 기반 **오쏘그래픽** 룸, 한 벽 컷어웨이, 따뜻한 소프트 그림자, low-to-medium poly, 파스텔/무드 컬러. 닌텐도 게임 다이오라마 느낌.

**Three.js 재현 방식**:
```ts
// scene/Camera.tsx
const aspect = viewport.width / viewport.height
const d = 10
const camera = new THREE.OrthographicCamera(
  -d * aspect, d * aspect, d, -d, 0.1, 1000
)
// 진짜 isometric: 45° Y + ~35.26° X
camera.position.set(10, 10, 10)
camera.lookAt(0, 0, 0)
```

**재료**: `MeshToonMaterial` 또는 `MeshLambertMaterial` + 따뜻한 directional light 45°.
**그림자**: AO 텍스처에 베이크 (PBR 실시간 대신).
**벽 컷어웨이**: 카메라가 바라보는 방향 **반대쪽 벽만 렌더** (나머지 2-3면 cutaway).

이 조합은 **PBR보다 훨씬 싸고**, 시각적 정체성이 강함. 60fps 모바일 여유.

## 3. 경쟁사 총정리

| 서비스 | 엔진 | 모바일 웹 품질 | 복제할 것 | 피할 것 |
|--------|------|---------------|-----------|---------|
| **오늘의집** | Three.js + GLB | 4/5 | Three.js 스택, GLB, 소셜 공유 | (없음) |
| **IKEA Kreativ** | Vue + Three.js (Demodern 구현), 서버사이드 AI 스캔 | 4/5 | 사진→3D 클라우드 파이프라인 | LiDAR 의존 (30% 유저만) |
| **Planner 5D** | 자체 WebGL 엔진 | 3/5 | 2D↔3D 토글, 스냅 로직 | 데스크톱 포트 → 모바일 웹 (2-4MB 번들) |
| **HomeByMe** | Dassault 3DEXPERIENCE | 2/5 | (기업 B2B) | 데스크톱 우선 UX |
| **Roomstyler/Homestyler/Coohom** | 자체 WebGL, Alibaba 클라우드 | 2-3/5 | Homestyler AR preview (79% 전환 리프트) | Roomstyler UI 구식 |
| **Altroom3d TikTok** | Blender (웹 X) | - | 비주얼 스타일 | (제품 아님) |
| **Shapespark** | 자체 WebGL + 베이크드 라이트맵 | 4/5 | **라이트맵 베이크** (런타임 비용 0) | - |
| **Matterport** | Three.js | 3/5 | Dollhouse view 오버뷰→디테일 전환 | 대용량 포인트클라우드 |

## 4. 핵심 채택 기술

### 4.1 Shapespark의 **Baked Lightmaps**
- Blender에서 ambient occlusion + 그림자 + 간접광을 텍스처(lightmap UV2)로 베이크
- GLB 내부에 lightmap 텍스처 포함
- Three.js에서 `aoMap` / `lightMap` 슬롯에 연결
- 런타임 비용 ≈ 0, 모바일 60fps + photoreal 느낌

방법:
```blender
# Blender
# 1. UV2 unwrap (Smart UV)
# 2. Cycles bake: Combined or Shadow/AO
# 3. Export GLB with lightmap texture
```

Three.js:
```tsx
<meshStandardMaterial aoMap={aoTex} aoMapIntensity={1.0} lightMap={lightmapTex} />
```

### 4.2 Matterport의 **Dollhouse Navigation**
- 기본 오버뷰 (방 전체)
- 가구 탭 → 카메라가 그 가구 근처로 줌인
- "detail 모드" → orbit focus, 구매 버튼 표시

구현: Drei의 `CameraControls` + animated `setLookAt(x,y,z, tx,ty,tz, true)`

### 4.3 오늘의집의 **웹-앱 분리**
- 웹: 편집 (Three.js)
- 앱: AR try-on
- 연동: 딥링크 `ohou://ar?roomId=xxx`

우리 프로토타입은 웹만 타겟이지만 아키텍처는 이 모델을 따름: AR 기능은 **"앱에서 열기"** 버튼으로.

## 5. 경쟁사로부터 배운 것 Summary

### 5.1 DO
- [ ] Three.js + GLB + 모바일 first (오늘의집)
- [ ] Orthographic 카메라 + 벽 cutaway (Altroom3d)
- [ ] 베이크된 라이트맵으로 photoreal at near-0 cost (Shapespark)
- [ ] 2D 평면도 ↔ 3D 뷰 토글 (Planner 5D)
- [ ] 수동 방 치수 입력으로 시작 — 복잡한 스캔 나중에 (IKEA는 스캔 복잡도 감당 가능한 조직)
- [ ] 소셜 공유 루프 (오늘의집 → 구매 전환)

### 5.2 DON'T
- [ ] 웹에서 WebXR/AR 시도 (iOS 2026 여전히 미지원)
- [ ] 데스크톱 에디터를 모바일 웹에 그대로 포트 (Planner 5D, HomeByMe 실수)
- [ ] LiDAR 필수 의존 (유저 베이스 너무 좁음)
- [ ] 실시간 PBR + SSAO + 복잡한 라이팅 (모바일 GPU 폭파)
- [ ] 풀스크린 3D만 — UI 레이어 (React DOM) 분리 필수

## 6. "포켓룸" 스타일 구현 가이드 (prototype 채택)

```tsx
// scene/IsometricScene.tsx
<Canvas
  camera={{ position: [10, 10, 10], zoom: 40, near: 0.1, far: 1000 }}
  orthographic
  gl={{ antialias: true, powerPreference: 'high-performance' }}
>
  {/* 벽 cutaway: front/right 벽은 숨김, back/left만 렌더 */}
  <Wall side="back" />
  <Wall side="left" />
  <Floor />
  
  {/* 따뜻한 directional light */}
  <directionalLight position={[5, 10, 5]} intensity={1.2} castShadow color="#ffd9a0" />
  <ambientLight intensity={0.35} />
  
  {/* HDRI (약하게) */}
  <Environment preset="apartment" intensity={0.3} />
  
  {/* Contact shadow plane trick (cheap) */}
  <ContactShadows position={[0,0.01,0]} opacity={0.4} blur={2.5} />
  
  {/* Furniture */}
  {placements.map(p => <Furniture key={p.instanceId} {...p} />)}
</Canvas>
```

컨트롤:
```tsx
<OrbitControls
  makeDefault
  enablePan={false}           // 모바일에서 혼동
  minPolarAngle={Math.PI/6}   // 30°
  maxPolarAngle={Math.PI/3}   // 60°
  minZoom={20}
  maxZoom={80}
/>
```

## 7. RoomPlan iOS 브릿지 (v2+)

**2026 현실**: iOS Safari에 WebXR 미지원. 네이티브 RoomPlan → USDZ → 서버 → glTF 변환 → 웹 로드.

**MVP 건너뛰기**. v2 프리미엄 기능으로 "내 방 스캔해오기" 버튼만.

---

**참조**:
- [오늘의집 3D](https://ohou.se/interior3ds)
- [Wishket Ohou 채용](https://www.wishket.com/project/10824/)
- [Demodern IKEA 사례](https://www.demodern.de/en/blog/ikea-wallspace-planner-insights)
- [IKEA Kreativ](https://www.ikea.com/us/en/home-design/)
- [Shapespark](https://www.shapespark.com/)
- [Matterport](https://matterport.com/)
- [Apple RoomPlan](https://developer.apple.com/augmented-reality/roomplan/)
- [Three.js OrthographicCamera](https://threejs.org/docs/#api/en/cameras/OrthographicCamera)
