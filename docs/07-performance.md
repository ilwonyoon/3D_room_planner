# 07. 모바일 웹 3D 성능 최적화 체크리스트

> 타깃: iPhone 12 (A14) / Galaxy A-series (SD 6xx), 375×812, WebGL 2.0 / WebGPU
> 리서치일: 2026-04-20

---

## 1. 프레임 예산 (60fps = 16.6ms)

| 구간 | 모바일 타겟 |
|------|-----------|
| JS (React + 상태) | < 4ms |
| 씬 업데이트/레이캐스트 | < 2ms |
| 지오메트리/머티리얼 업로드 | < 2ms |
| 렌더 패스 (draw + post) | < 6ms |
| 여유분 | 2ms |

## 2. Draw Call 예산

| 상황 | Draw calls |
|------|-----------|
| **Hard ceiling (60fps)** | **< 100** |
| 250 넘으면 A-시리즈 Android 저크 | 300 |
| 500+ 데스크톱도 흔들림 | - |

**감시**: 개발 모드에서 `renderer.info.render.calls` 매 프레임 로깅.

### Canvas 초기화 (숨은 비용 제거)
```ts
// Vanilla
const renderer = new THREE.WebGLRenderer({
  antialias: false,      // FXAA 후처리로 대체
  alpha: false,
  stencil: false,
  powerPreference: 'high-performance',
})

// R3F
<Canvas
  gl={{ antialias: false, alpha: false, stencil: false, powerPreference: 'high-performance' }}
  dpr={[1, 1.5]}
  frameloop="demand"      // 중요: 정적 씬은 render-on-demand
/>
```

## 3. 지오메트리 압축: **Meshopt 선호**

| | Draco | **Meshopt (EXT_meshopt_compression)** |
|---|---|---|
| 디코더 WASM | ~400KB | **~27KB** |
| 디코드 속도 | 느림 (엔트로피) | **빠름 (GPU 레이아웃)** |
| 애니메이션/모프 | X | O |
| 크기 감소 | 90-95% | 60-80% |

**가구는 static rigid — Meshopt 최적**.

### 커맨드
```bash
# Meshopt (권장)
gltf-transform meshopt in.glb out.glb

# 양자화 (meshopt 전에)
gltf-transform quantize in.glb quantized.glb

# 올인원 (static furniture)
gltf-transform optimize in.glb out.glb \
  --compress meshopt \
  --texture-compress etc1s \
  --simplify 0.75
```

### 양자화 비트 (가구)
- position: **14-bit**
- normal: **10-bit**
- texcoord: **12-bit**
- color: **8-bit**

(캐릭터는 position 16-bit 필요, 가구는 14로 충분)

### 디코더 로딩
```ts
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js'
const loader = new GLTFLoader()
loader.setMeshoptDecoder(MeshoptDecoder)
```

## 4. 텍스처: **KTX2 BasisU** 단일 파일 전략

- KTX2는 ASTC/ETC2로 **트랜스코딩** → 한 파일로 모든 기기 대응
- ETC1S (작음, 색상 텍스처) vs UASTC (크고 고퀄, 노말맵)

### 사이즈 타깃
| 용도 | 해상도 |
|------|--------|
| Hero 가구 (침대, 소파) 정면 | 1024² |
| 배경 가구 | 512² |
| 바닥/벽 타일 | 512² (타일링됨) |
| **절대 금지** | > 1024² on mobile |

4096² PNG = GPU 90MB (+mipmap) vs 1024² KTX2 = ~170KB.

### 커맨드
```bash
gltf-transform etc1s in.glb out.glb    # diffuse
gltf-transform uastc in.glb out.glb    # normal/roughness
```

### 밉맵: **항상 ON**
- 누락 시 zoom-out 시 shimmering
- Three.js는 POT 텍스처에 자동 생성

## 5. 인스턴싱 룰

```ts
if (사용된 같은 furniture geometry 인스턴스 ≥ 3)   → InstancedMesh
if (재질은 같지만 지오메트리 다른 2-20 종류)        → BatchedMesh (r156+)
if (인스턴스 수 > 100000)                          → InstancedMesh 승 (BatchedMesh multiDraw overhead)
```

```ts
// InstancedMesh 기본 패턴
const chairsMesh = new THREE.InstancedMesh(chairGeom, chairMat, 8)
chairsMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
for (let i = 0; i < 8; i++) {
  dummy.position.set(...positions[i])
  dummy.rotation.y = rotations[i]
  dummy.updateMatrix()
  chairsMesh.setMatrixAt(i, dummy.matrix)
}
chairsMesh.instanceMatrix.needsUpdate = true
```

룸플래너 패턴 예시: 한 부동산 데모가 9000 → 300 draw calls (instancing) 로 모바일 안정 60fps.

## 6. LOD: **스킵**

Three.js 포럼 컨센서스: LOD는 >6M triangles/frame, 광활한 오픈월드에만 유의미.
**인테리어 룸 40K-200K 삼각형 / 1-10m 거리**에선 오버헤드가 저장하는 것보다 큼.

**대신**: **소스 폴리 500-2000 tri/furniture로 모델링**. 1500tri + 512² 베이크드 텍스처는 15K tri와 실질 구분 불가 (룸플래너 시야 기준).

## 7. 라이팅: 베이크 우선

### Blender 워크플로
1. UV0 (material) + UV1 (lightmap) 언랩
2. Cycles `Combined` 베이크 (direct + indirect + AO) → 1024² 또는 2048² 아틀라스
3. GLB export (KHR_lights_punctual 제거)

### Three.js 로드
```tsx
<mesh geometry={geo}>
  <meshStandardMaterial 
    map={albedo}
    aoMap={aoTex}              // uv1 자동
    aoMapIntensity={1.0}
    lightMap={lightmap}        // uv1 자동
    lightMapIntensity={1.0}
  />
</mesh>
```

### 런타임 라이팅 (정적 룸)
- 1× `AmbientLight` (intensity 0.1~0.3)
- 1× `HemisphereLight` (앰비언트 fill)
- `EnvMap`은 pre-baked PMREM cubemap (`Environment` drei + preset or HDR)
- `DirectionalLight` **0**개

비용: **~2ms** GPU (vs 3× dynamic lights + shadow = 8~15ms).

## 8. 그림자: **Contact Shadow Plane trick**

PointLight 그림자 = 6번 shadowmap 렌더 → **금지**.
1024² DirLight shadow = 4~8ms Adreno 610 → **수용 불가**.

### Contact Shadow (drei)
```tsx
<ContactShadows 
  position={[0, 0.01, 0]} 
  opacity={0.4} 
  blur={2.5}
  width={10}
  height={10}
  far={1.5}
/>
```
비용 ~0.1ms. 룸플래너엔 이게 정답.

### 정말 필요한 경우 (한 hero 오브젝트만)
```ts
renderer.shadowMap.autoUpdate = false     // 매 프레임 업데이트 금지
renderer.shadowMap.needsUpdate = true     // 가구 이동 후에만 true
dirLight.shadow.mapSize.set(512, 512)     // 1024 대신
```

## 9. Pixel Ratio 전략

iPhone 12 native DPR = 3.0, Galaxy A52 ≈ 2.75.

**DPR 3.0 → 1.0 시 한 기기에서 27fps → 57fps 측정된 사례**.

### 클램프
```ts
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))
```

### 동적 DPR (R3F PerformanceMonitor)
```tsx
<PerformanceMonitor
  onIncline={() => setDpr(2)}
  onDecline={() => setDpr(1)}
  flipflops={3}
  onFallback={() => { setDpr(1); setPostProcessOff(true) }}
>
  <Canvas dpr={dpr}>...</Canvas>
</PerformanceMonitor>
```

모바일 기본 DPR 1.5, 후처리 있으면 1.0.

## 10. Thermal Throttling 대응

iPhone Safari: 연속 60fps WebGL 3-5분 뒤 thermal throttle 시작.

### Detection
```ts
// rolling 30-frame avg
const frameTimes: number[] = []
clock.getDelta() 매 프레임 push
if (avg > 22ms) → quality down
```

### Render-on-demand (가장 큰 단일 최적화)
```tsx
// R3F
<Canvas frameloop="demand">

// vanilla
let needsRender = true
controls.addEventListener('change', () => { needsRender = true })
function animate() {
  requestAnimationFrame(animate)
  if (!needsRender) return
  renderer.render(scene, camera)
  needsRender = false
}
```

**정적 룸플래너는 가구 이동 외에 렌더 불필요** → 이것만 지켜도 배터리/발열 압도적 감소.

### Quality Tiers
1. **Full**: DPR 1.5 + contact shadows + envMap + AO
2. **Medium**: DPR 1.0 + no AO + envMap 작은 해상도
3. **Low**: DPR 1.0 + `MeshLambertMaterial` fallback + no post + antialias off

## 11. 메모리 한계

- **iOS Safari 탭 메모리 한계**: ~1.2-1.4GB (OOM crash)
- Apple Silicon = 공유 CPU+GPU 메모리 → 텍스처 바이트 두 번 카운트
- **WebGL 컨텍스트 한계**: 기기 세션당 ~16개

### 룸 1개 (가구 15개) 예산
- KTX2/ETC2 1024² × 15 ≈ **15MB** ← 매우 안전
- 2048² 비압축 PNG × 15 = **240MB** ← 위험

### Dispose 필수
```ts
function disposeFurniture(mesh: THREE.Mesh) {
  mesh.geometry.dispose()
  const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
  mats.forEach(m => {
    if ('map' in m) (m as any).map?.dispose()
    if ('normalMap' in m) (m as any).normalMap?.dispose()
    if ('roughnessMap' in m) (m as any).roughnessMap?.dispose()
    m.dispose()
  })
  mesh.parent?.remove(mesh)
}
```

### 피할 것: Canvas resize (WebKit bug #219780)
- init 후 `canvas.width/height` 재설정 금지 (메모리 리크)
- 대안: CSS `transform: scale()` / viewport meta

## 12. 시작 성능

### 우선순위 로드
```
1. Room shell (벽, 바닥)
2. Hero furniture (초기 뷰에 보이는 3-5개)
3. 나머지 가구 (idle 시)
```

### Preload
```tsx
// 모듈 레벨 (React 트리 마운트 전 시작)
useGLTF.preload('/assets/furniture/bed_double.glb')
```

### Nested Suspense
```tsx
<Suspense fallback={<RoomShell />}>
  <HeroFurniture />
  <Suspense fallback={null}>
    <BackgroundFurniture />
  </Suspense>
</Suspense>
```

### GLB 분할
- >2MB 단일 GLB 피하기 (HTTP range request 미지원)
- 가구별 개별 파일, 필요시 on-demand

타겟: **초기 로드 < 2.5s on 4G**, 룸 + 핵심 가구 < 2MB.

## 13. 모바일 KILL 안티패턴 테이블

| 안티패턴 | 왜 죽이나 | 수정 |
|---------|---------|-----|
| `transparent: true` 많은 오브젝트 | depth-sort, batching 깨짐, overdraw | `alphaTest: 0.5` cutout; 유리 이펙트 피하기 |
| 동적 라이트 >3 | shader permutation 폭발 | 베이크 + hemi + envMap |
| 비최적화 normal map 2048² | 32MB GPU, upload 스톨 | 512² 베이크, KTX2/UASTC |
| `antialias: true` 캔버스 | MSAA × DPR 2+ fill 배수 | 끄고 FXAA 후처리 (high tier) |
| PointLight shadow | 6× shadowmap | Contact shadow plane |
| 연속 RAF 루프 정적 씬 | thermal throttle 3분 | render-on-demand |
| iPhone native DPR 3.0 | 9× pixel fill | 1.5 클램프 |
| 모든 메시 MeshStandardMaterial | PBR fragment cost | 비 hero는 MeshLambertMaterial |
| dispose 미호출 | Safari GPU leak, 탭 크래시 (5-10 스왑) | geometry+material+textures 모두 dispose |
| Canvas width/height 변경 | WebKit bug #219780 leak | CSS transform scale |

## 14. 단일 체크리스트 (구현 시 참조)

- [ ] Draw call < 100 (dev HUD)
- [ ] Triangles < 200K total
- [ ] 모든 GLB: Meshopt + KTX2 파이프라인 통과
- [ ] DPR 클램프 ≤ 1.5, 동적 조정
- [ ] `antialias: false` (FXAA only on high)
- [ ] `frameloop="demand"` R3F
- [ ] Contact shadows (no real shadows)
- [ ] 1× AmbientLight + 1× HemisphereLight + envMap (no directional)
- [ ] 인스턴스 ≥3 → InstancedMesh 자동
- [ ] 가구 삭제 시 dispose 전체
- [ ] PerformanceMonitor → 3-tier fallback
- [ ] `useGLTF.preload()` hero 파일
- [ ] Nested Suspense

---

**참조**:
- [100 Three.js Tips 2026](https://www.utsubo.com/blog/threejs-best-practices-100-tips)
- [Codrops Efficient Three.js Scenes](https://tympanus.net/codrops/2025/02/11/building-efficient-three-js-scenes-optimize-performance-while-maintaining-quality/)
- [R3F Scaling Performance](https://r3f.docs.pmnd.rs/advanced/scaling-performance)
- [Don McCurdy Texture Formats](https://www.donmccurdy.com/2024/02/11/web-texture-formats/)
- [glTF Transform CLI](https://gltf-transform.dev/cli)
- [LOD Three.js Forum](https://discourse.threejs.org/t/when-is-it-actually-beneficial-to-use-lod-in-three-js-for-performance/87697)
- [BatchedMesh issue #28776](https://github.com/mrdoob/three.js/issues/28776)
- [WebKit Canvas Resize Bug #219780](https://bugs.webkit.org/show_bug.cgi?id=219780)
