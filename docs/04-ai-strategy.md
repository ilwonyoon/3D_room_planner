# 04. AI Floor Plan 전략 (LLM 기반)

> 리서치일: 2026-04-20
> Vision deck (D3): "LLM(대규모 언어모델)을 활용" — Key Leverage Point

---

## 1. 핵심 결론

**MVP 4주에 shippable한 접근**: 전용 AI 모델 **X**, **Claude/GPT + JSON schema enforcement + 후처리 constraint solver**.

### 1.1 왜 전용 모델 대신 LLM?
| 옵션 | API | 상태 | MVP |
|------|-----|------|-----|
| LayoutGPT, DiffuScene, Holodeck, ATISS | 없음 | 연구 코드, self-host | ❌ |
| Chat2Layout 패턴 (GPT-4V + CoT + JSON) | 자기 호스트 | 논문 있음 | ✅ 복제 가능 |
| FlairGPT (constraint extraction + optimizer) | 자기 호스트 | CGF 2025 | ⚠️ 시간 부족 |
| **Claude Sonnet 4.7 + structured_outputs** | Anthropic API | 프로덕션 | **✅ 선택** |

## 2. 2단계 아키텍처

```
┌────────────────────────────────────────────┐
│ Stage 1: LLM Constraint Extraction         │
│                                             │
│  Input:  room dims + user need + style     │
│  LLM:    Claude Sonnet 4.7 (JSON schema)   │
│  Output: placements[] with (x,z,rotY,id)   │
└────────────┬───────────────────────────────┘
             │
             ▼
┌────────────────────────────────────────────┐
│ Stage 2: Local Constraint Solver           │
│                                             │
│  - AABB collision resolve                  │
│  - Wall snap (5cm grid)                    │
│  - Clearance enforcement (door swing 등)   │
│  - Korean convention rules                 │
└────────────┬───────────────────────────────┘
             │
             ▼
       Scene update (streaming)
```

## 3. 프롬프트 설계 (Chain-of-Thought + Role Priming)

```
[SYSTEM]
You are an expert Korean interior designer AI. Output ONLY valid JSON.

ROOM:
  width_m: 4.2, depth_m: 5.0, height_m: 2.4
  entrance: { wall: 'south', x: 2.0 }
  windows: [{ wall: 'east', x: 2.5, width: 1.2 }]

CATALOG (candidates, style-filtered):
  [{ id: 'bed_double_01', name: '더블 침대', w: 1.6, d: 2.0, price: 450000 },
   { id: 'desk_modern_01', ... }, ... 30 items]

KOREAN CONVENTIONS:
  - TV wall = opposite of entrance
  - 신발장 adjacent to entrance, depth < 0.4
  - Bed head against exterior wall
  - 60cm clearance in front of bed
  - Respect door swing arc
  - Furniture with legs preferred (온돌 floor heating)

USER NEED: "예산 300만원, 자는 공간과 공부 공간 분리, 모던 블랙&화이트"

REASONING (think step by step, internal):
  1. Zone plan: split room into sleep (north) and work (south)
  2. Anchor: bed head against north exterior wall
  3. Separator: bookshelf or rug boundary
  4. Work: desk at window (east) for natural light
  5. Style filter: B&W items only, no warm wood
  6. Budget: sum must ≤ 3_000_000

OUTPUT SCHEMA:
{
  "narration": "string, 한국어, 2-3 sentences",
  "placements": [
    { "catalogId": "string", "x": number, "z": number, "rotationY": number, "note": "string" }
  ],
  "totalBudget": number,
  "confidence": number (0-1)
}
```

### 3.1 Structured Outputs 강제
Claude API: `tool_use` with JSON schema → 99.8%+ schema compliance.
대안: Gemini 2.5 Pro (`response_schema`), GPT-5.2 (`response_format: json_schema`).

## 4. 비용 예산

| 모델 | Input/1M | Output/1M | 세션당 예상 |
|------|----------|-----------|------------|
| Claude Sonnet 4.7 | $3.00 | $15.00 | $0.03~0.05 |
| Gemini 2.5 Pro | $1.25 | $10.00 | $0.02~0.03 |
| Gemini 2.5 Flash | $0.15 | $0.60 | $0.003~0.005 |
| GPT-5.2 | $1.75 | $14.00 | $0.02~0.04 |

**초기 생성**: Sonnet 4.7 (품질 우선, $0.03~0.05)
**Chat refinement turns** ("좀 더 따뜻하게"): Gemini Flash ($0.003)
**전체 세션 (생성 1 + 수정 5)**: **$0.05~0.15**

## 5. Streaming UX

```
User submits → Claude streams JSON
  ├─ "narration": "..." (표시)
  ├─ placement[0] 닫힘 → 3D scene에 침대 fade-in
  ├─ placement[1] 닫힘 → 책상 fade-in
  ├─ ... 
  └─ totalBudget 닫힘 → 예산 바 애니메이션
```

가구가 하나씩 나타나는 **"fade-in staggered"** 애니메이션이 2-5초 생성 시간을 premium feel로 전환.

구현:
```ts
async function streamLayout(req: LayoutRequest) {
  const stream = await anthropic.messages.stream({ ... })
  let partialJson = ''
  for await (const chunk of stream) {
    partialJson += chunk.delta.text
    const placement = tryParseLastClosedPlacement(partialJson)
    if (placement) {
      dispatch({ type: 'ADD_PLACEMENT', placement })  // 3D 추가
    }
  }
}
```

## 6. 후처리 Constraint Solver (Stage 2)

```ts
// domain/constraints.ts

export function resolveLayout(
  proposed: PlacedFurniture[],
  room: Room,
  catalog: FurnitureCatalogItem[]
): PlacedFurniture[] {
  // 1. Wall snap (10cm threshold → round to 5cm grid)
  let resolved = proposed.map(p => snapToWalls(p, room, catalog))
  
  // 2. AABB collision resolve (SAT-based)
  for (let i = 0; i < resolved.length; i++) {
    for (let j = i+1; j < resolved.length; j++) {
      if (aabbOverlap(resolved[i], resolved[j], catalog)) {
        resolved[j] = pushAway(resolved[j], resolved[i], catalog)
      }
    }
  }
  
  // 3. Clearance (sofa front 60cm, bed front 60cm, etc.)
  resolved = enforceClearance(resolved, room, catalog)
  
  // 4. Door swing arc
  resolved = resolveDoorSwing(resolved, room.entrance, catalog)
  
  return resolved
}
```

라이브러리:
- `sat-js` (JavaScript) for SAT collision
- 자체 클리어런스 룰 (~200줄)

## 7. 한국 특화 규칙 (Hard-coded)

```ts
// domain/koreanConventions.ts

export const KOREAN_RULES = {
  tvWall: (room: Room) => oppositeWall(room.entrance.wall),
  shoeRack: (room: Room) => ({ nearEntrance: true, maxDepth: 0.4 }),
  bedHead: 'exterior_wall',
  floorHeating: true,   // 다리 있는 가구 선호
  pyeongToM2: (py: number) => py * 3.3058,
}
```

프롬프트에 주입:
```
IF 아파트 24평 (79 m²):
  add note "typical 거실 4m×5m, 안방 3.5m×3.5m, 작은방 2.5m×3m"
```

## 8. 이미지 → 3D 방 (v2)

### 8.1 사진 1장 → 치수
**MoGe** (Microsoft, CVPR 2025): 60ms on A100 (서버), iPhone 15 Pro NE 1-3s.
- MVP: **서버사이드 Replicate API** (~$0.003~0.01/inf)
- 유저 업로드 사진 → MoGe → metric depth → 바닥 평면 fit → 방 크기 추정

### 8.2 여러 사진 → 정확한 3D
**MASt3R** (NAVER Labs): 3-4장 → metric 3D. 더 정확하지만 UX 복잡.

### 8.3 2D 평면도 PNG → 벽 추출
**RoomFormer** (CVPR 2023) + AI-Hub 한국 아파트 48K fine-tuning.
- 아파트 평면도 스크린샷 → 벽 폴리곤 → 3D extrude (2.4m 높이)
- 구현 시간: 3-5일

### 8.4 v1에선?
**건너뛰기.** 수동 치수 입력(가로/세로/높이 슬라이더)이 3분 onboarding에 맞음.

## 9. 스타일 임베딩 (MVP 간단 버전)

```ts
// domain/styles.ts
export const STYLE_PROMPTS: Record<StyleTag, string> = {
  modern_bw: 'White/black/grey palette. Matte metal, marble, lacquer. NO warm wood.',
  warm_nordic: 'Light oak, cream linen, sage green. Wool, rattan, natural textures.',
  minimal_japandi: 'Off-white, black, pale wood. Low furniture. Minimal decoration.',
  retro_70s: 'Earth tones, velvet, chrome. Round shapes.',
  // ... 5-8 preset
}
```

LLM 프롬프트에 style fragment 삽입 + 카탈로그 필터 (furniture.tags includes style).

v2: CLIP embedding으로 참조 이미지 → 가장 가까운 스타일 벡터.

## 10. Chat Refinement

```
[USER] 좀 더 따뜻하게 바꿔줘.
[SYSTEM → Claude]
  previous: <기존 placements JSON>
  change request: warm tones
  ACTION: update styleHint + replace mismatched items
[CLAUDE OUTPUT]
  { diffs: [
    { op: 'remove', instanceId: 'abc' },
    { op: 'add', catalogId: 'sofa_oak_02', x: 1.2, z: 2.0, ... },
    ...
  ], narration: "따뜻한 오크 소파로 교체했어요..." }
```

Gemini Flash로 $0.003/turn 가능. 전체 재생성 피하고 diff만.

## 11. 로드맵

### Week 1-2 (MVP core)
- [ ] 수동 방 치수 입력
- [ ] Claude Sonnet 4.7 + JSON schema
- [ ] Stage 1 프롬프트 (CoT + Role + Korean rules)
- [ ] Stage 2 AABB + wall snap + clearance
- [ ] Three.js 3D scene streaming update

### Week 3-4 (Chat + Constraints)
- [ ] Chat refinement loop (Gemini Flash)
- [ ] 5-8 스타일 preset
- [ ] 도어 스윙 + 창문 회피
- [ ] 예산 추적 UI

### Week 5-6 (Polish)
- [ ] 30+ 가구 카탈로그 태깅
- [ ] "AI는 이렇게 배치한 이유" 내러이션 표시
- [ ] 언두/리두

### Week 7-8 (선택: photo scan)
- [ ] MoGe via Replicate ($0.003/inf)
- [ ] RoomFormer ko-finetune 실험 (AI-Hub)

## 12. 열린 리스크

- **Claude JSON schema 100% 준수?** → 실측 ~99.8%, 0.2% fallback retry 로직 필요
- **배치된 가구 카탈로그 ID 환각?** → 허용 id 리스트를 system에 강제 + validate 후 드롭
- **한국어 narration 품질** → Sonnet 4.7은 충분, Flash는 검증 필요
- **치수 단위 혼동 (m vs cm)** → schema에 단위 명시 필수
- **윈도우 가림 배치** → Stage 2에서 window AABB 체크

---

**참조**:
- [FlairGPT arxiv 2501.04648](https://arxiv.org/abs/2501.04648)
- [Chat2Layout arxiv 2407.21333](https://arxiv.org/html/2407.21333v1)
- [Co-Layout arxiv 2511.12474](https://arxiv.org/abs/2511.12474)
- [DiffuScene GitHub](https://github.com/tangjiapeng/DiffuScene)
- [Holodeck Allen AI](https://github.com/allenai/Holodeck)
- [MoGe Microsoft CVPR 2025](https://github.com/microsoft/MoGe)
- [RoomFormer CVPR 2023](https://github.com/ywyue/RoomFormer)
- [AI-Hub 한국 건축도면](https://aihub.or.kr/aihubdata/data/view.do?dataSetSn=71465)
- [Anthropic SDK](https://docs.anthropic.com/en/api/)
