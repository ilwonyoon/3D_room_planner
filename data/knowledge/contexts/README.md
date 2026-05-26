# Knowledge contexts

One subfolder per Axis-1 site (see `docs/bond-demo/15-AGENT-ARCHITECTURE.md`).
Each subfolder is a self-contained knowledge base that the RAG layer
(`scripts/rag.mjs`) reads when the active appContext matches.

## Layout

```
contexts/
  lowes-consumer/      ← live, ships in demo
    bundles.json
    style-guide.json
    design-rules.json
    persona-design.json
  msi-designer/        ← planned, Part 2 scaffold
    bundles.json
    style-guide.json
    design-rules.json
    persona-design.json
  masterbrand-designer/ ← planned, Part 2 scaffold
    ...
```

## Adding a new context

1. Copy `lowes-consumer/` as the template.
2. Replace contents — bundles get manufacturer-specific SKU patterns,
   style guide narrows to that manufacturer's line vocabulary, persona
   pool shifts (designers/contractors instead of consumers), design
   rules become spec/install rules.
3. Add the `AppContextConfig` entry in `src/agent/appContext.ts`.
4. Add the prompt layer in `src/agent/systemPrompt.ts` (e.g.
   `MSI_DESIGNER_LAYER`) and update `assemblePrompt(contextId)`.
5. Update `deriveAppContext()` URL routing if a new param is needed.

No retrieval-layer code changes required — `rag.mjs` reads from
`contexts/<id>/` by path.
