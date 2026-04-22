# 02. 2026년 4월 모바일 Three.js 기술 스택

> 리서치일: 2026-04-20
> 출처: threejs.org release notes, bundlephobia, caniuse, WebKit 블로그

---

## 1. 최종 권장 스택

| 레이어 | 선택 | 버전 (2026-04) | 이유 |
|--------|------|---------------|------|
| **3D 엔진** | Three.js | **r184** | 2026-04-16 최신, WebGPU 기본 import path 안정화 |
| **React 렌더러** | @react-three/fiber | **v9.6.0** | R3F v9 ShaderMaterial uniform HMR 안정화 |
| **헬퍼 라이브러리** | @react-three/drei | **v10.7.7** | OrbitControls/PivotControls/useGLTF, 트리셰이킹 필수 |
| **후처리** | @react-three/postprocessing | 최신 | bloom + tone mapping만, SSAO/SSR 금지 |
| **물리 (선택)** | 자체 AABB + raycasting | - | 가구 배치엔 Rapier 과잉, 필요시 @react-three/rapier v2.2.0 lazy-load |
| **빌드 도구** | Vite 6 + vite-plugin-pwa | - | Next.js 15 불필요 (SEO/SSR 필요 없음) |
| **렌더러 초기화** | `import { WebGPURenderer } from 'three/webgpu'` | r171+ | WebGPU 자동, WebGL2 fallback |

## 2. Three.js r184 (2026-04-16) 핵심 변경

- **WebGPU 기본화**: `three/webgpu` import path 공식화 (r171+). 기존 WebGLRenderer도 유지되지만 NodeMaterial/TSL이 primary.
- **TSL 컴파일 3배 빠름** (#33120)
- **FSR 1 업스케일러** 포함 (#33339) — 모바일 동적 해상도에 활용 가능
- **TAAUNode** (TAA + upsampling, #33368)
- **LightProbeGrid** (확산 GI)
- **compileAsync()** 진정 논블로킹 (#32984)
- **HTMLTexture** 신규 — UI 텍스처로 3D 오버레이 가능
- **BatchedMesh** deprecated 경로 제거 — r160 기반 코드면 업그레이드 시 체크

## 3. WebGPU vs WebGL2 현황

| 플랫폼 | 지원 |
|--------|------|
| iOS Safari 26+ (iOS 26, 2025-09~) | WebGPU 기본 활성 |
| iOS 17/18/25 | WebGPU 없음 → WebGL2 fallback |
| Android Chrome 113+ | 대부분 지원 |
| 글로벌 커버리지 | WebGL2 ~97%, WebGPU ~85% |

**결론**: `three/webgpu` 쓰되 WebGL2 fallback 자동 적용. iOS 25 이하 유저는 조용히 WebGL2로 fallback.

## 4. 번들 크기 (실측, 2026-04)

| 패키지 | 버전 | minified | **gzipped** |
|--------|------|----------|-------------|
| three | 0.184.0 | 724 KB | **182 KB** |
| @react-three/fiber | 9.6.0 | 159 KB | **51 KB** |
| @react-three/drei (전체) | 10.7.7 | 1,604 KB | 496 KB |
| @react-three/drei (tree-shaken 실사용) | - | - | **~80-120 KB** |
| rapier WASM (lazy) | 2.2.0 | - | 1.2MB uncompressed |

**최소 실사용 번들**: three + R3F + 선택적 Drei imports ≈ **~330-380 KB gzipped**.
PWA 초기 로드 타겟 < 400 KB gzip 달성 가능 (Rapier 제외, lazy).

Drei는 반드시 **sub-path import** 사용:
```ts
// BAD
import { OrbitControls, useGLTF } from '@react-three/drei'
// GOOD
import { OrbitControls } from '@react-three/drei/core/OrbitControls'
import { useGLTF } from '@react-three/drei/core/useGLTF'
```

## 5. 빌드 체인: Vite + PWA

결정 이유:
- **SEO/SSR 불필요**: 에디터는 로그인 뒤. Next 15 RSC 혜택 없음.
- **Vite HMR < 1s**, Turbopack은 2026-04 기준 여전히 cold start 3-5s.
- **PWA**: `vite-plugin-pwa` (Workbox 기반) — 오프라인 캐싱, 설치 프롬프트.

예시 `vite.config.ts`:
```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,glb,ktx2}'],
        runtimeCaching: [{
          urlPattern: /\.(?:glb|ktx2|hdr)$/,
          handler: 'CacheFirst',
          options: {
            cacheName: 'assets',
            expiration: { maxEntries: 200, maxAgeSeconds: 30*24*60*60 }
          }
        }]
      }
    })
  ],
  build: {
    target: 'es2022',
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three'],
          r3f: ['@react-three/fiber', '@react-three/drei'],
        }
      }
    }
  }
})
```

## 6. 물리 / 인터랙션 — 필요 없음 (MVP)

**가구 드래그 앤 드롭 = raycasting + AABB**, 물리 엔진 불필요.

```ts
// pseudocode
onPointerMove(e) {
  const intersect = raycaster.intersectObject(floorMesh)
  if (!intersect) return
  const proposed = intersect.point.clone()
  // AABB check against other placements
  const collision = placements.some(p => aabbOverlap(bboxOf(selected, proposed), bboxOf(p, p.position)))
  if (!collision) selected.position.copy(proposed)
}
```

Rapier 필요할 때: 가구 스택(예: 선반 위 책), 실시간 낙하 시뮬, 문 스윙 애니메이션. v1에선 불필요.

Gizmo: `@react-three/drei/core/PivotControls` — 터치 지원, Y축 회전만 제한 가능.

## 7. 후처리 — 모바일 허용 리스트

| 이펙트 | 모바일 | 비고 |
|--------|--------|------|
| ACESFilmicToneMapping | YES (무료) | 기본 ON |
| Bloom (pmndrs) | OK (0.5배 해상도) | 감성 조명 용 |
| FXAA/SMAA | YES | MSAA보다 선호 |
| SSAO | **NO (풀해상도)** | 0.25배 또는 베이크 |
| SSR | **NO** | 금지 |
| DOF | **NO** | 금지 |
| MotionBlur | **NO** | 금지 |

쉐이더 precision: 모바일은 `mediump` (iOS GPU 2배 빠름, 텍스처 LOD 이슈 주의).

## 8. 대안 검토 결과 (선택하지 않은 이유)

- **Babylon.js**: 전체 엔진, 번들 큼. React 생태계 약함.
- **PlayCanvas**: Entity-component 에디터 중심, React 통합 부자연스러움.
- **TresJS (Vue)**: Vue-native 팀이면 OK, 우린 React 고정.
- **Needle Engine**: Unity → Web export, 디자이너 파이프라인 좋지만 프로토타입 과잉.

## 9. 설치 명령

```bash
pnpm create vite@latest room-planner --template react-ts
cd room-planner
pnpm add three@0.184.0 @react-three/fiber@9.6.0 @react-three/drei@10.7.7
pnpm add @react-three/postprocessing zustand immer
pnpm add -D vite-plugin-pwa @types/three @gltf-transform/cli
# 선택
pnpm add @react-three/rapier @dimforge/rapier3d-compat
```

## 10. 타깃 성능

- iPhone 12 / Galaxy A54에서 60fps
- 초기 JS < 400KB gzip
- 첫 가구 렌더 < 2.5s (좋은 4G)
- Draw call < 100/frame

---

**참조**:
- [Three.js r184 Release](https://github.com/mrdoob/three.js/releases/tag/r184)
- [R3F v9](https://github.com/pmndrs/react-three-fiber)
- [WebKit Safari 26 WWDC25](https://webkit.org/blog/16993/)
- [Can I Use: WebGPU](https://caniuse.com/webgpu)
- [Bundlephobia: three, R3F, Drei](https://bundlephobia.com/)
- [pmndrs/postprocessing](https://github.com/pmndrs/postprocessing)
