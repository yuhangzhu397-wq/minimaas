# Design QA — 用户模型监控 RPM / TPM 容量列

- source visual truth path: `/var/folders/jl/dtjb2p855g94jmhrvdsx55bh0000gp/T/codex-clipboard-2ee76de7-29b9-45c3-85e2-e88b03060e50.png`
- implementation screenshot path: `/tmp/minimaas-pin-model-capacity-qa/implementation-history.png`
- full-view comparison evidence: `/tmp/minimaas-pin-model-capacity-qa/reference-vs-implementation.png`
- focused comparison evidence: `/tmp/minimaas-pin-model-capacity-qa/focused-reference-vs-implementation.png`
- viewport: desktop, 2048 × 1200 CSS px
- source pixels: 2972 × 1754 px, including browser chrome
- implementation pixels: 2048 × 1200 px at 2048 × 1200 CSS px; captured pixel density 1:1
- normalization: both screenshots were aspect-fitted into equal-width comparison frames; browser chrome and the reference annotation were excluded from fidelity judgments
- state: `#/water-level/pins/cloudwise/models`, 历史筛选、全部模型

## Findings

No actionable P0, P1, or P2 differences remain.

- Fonts and typography: new headers and capacity detail text reuse the existing monitoring-table typography, weights, and line heights.
- Spacing and layout rhythm: RPM and TPM columns are inserted directly after model name as requested; row height, padding, striping, borders, radii, and sticky action treatment remain consistent.
- Colors and visual tokens: navy utilization bars and amber peak indicators reuse the existing monitoring capacity tokens.
- Image quality and asset fidelity: no new raster, illustration, logo, or custom icon asset was required.
- Copy and content: both columns state unit and capacity/peak semantics; every model shows current value, configured limit, utilization, remaining capacity, and peak.
- Interaction: horizontal overflow remains contained inside the table; the operation column remains visible. History/realtime switching preserves both capacity columns.
- Console: no warnings or errors were observed.

## Comparison History

### Pass 1

- Earlier target gap: the reference screen had no RPM or TPM model-capacity information after the model-name column.
- Fix implemented: added RPM and TPM capacity fields to model data, rendered both with the shared `CapacityValue` component, and expanded the table grid by two tracks.
- Post-fix evidence: full-view and focused comparisons show both columns in the requested position with the existing capacity/peak visual language.
- Remaining P3: none required for this scoped change.

## Implementation Checklist

- [x] RPM capacity / peak column added
- [x] TPM capacity / peak column added
- [x] Five model rows populated
- [x] History state verified
- [x] Realtime state verified
- [x] Sticky operation column verified
- [x] TypeScript check and production build passed

## Route strategy visual refresh

- Reference: `/var/folders/jl/dtjb2p855g94jmhrvdsx55bh0000gp/T/codex-clipboard-68254999-7d35-46ba-9bd2-caacf3af385f.png`
- Reference viewport: 2998 × 1600 desktop
- Implementation: `#/routes` in the local console
- Scope: `.traffic-policy-page` and its descendants only; shared sidebar, header, and other modules were not changed by this visual pass.

### Checks

- Reworked route surfaces to the reference language: spacious white cards, 1px gray borders, 12px radius, black/gray type hierarchy, blue operational links, quiet gray canvas, and table row spacing.
- Kept the route module's strategy-management interaction model: PIN overview, PIN→model drill-down, search, three-step strategy editing, detail, version history, copy, approval, and disable actions.
- Removed runtime-oriented surfaces from this module: data freshness, simulation, live capacity, score explanations, expected traffic share, monitoring jumps, and runtime metrics.
- Collapsed the editor to one scoped content column after removing the simulation/explanation sidebar; the remaining detail and preference cards use the same `.traffic-policy-page` namespace.
- Added responsive states for desktop, tablet, and narrow screens under the same route namespace.
- `pnpm --filter @minimaas/console typecheck` passed.
- `pnpm --filter @minimaas/console build` passed.
- `pnpm --filter @minimaas/console test` passed (8 tests).
- `git diff --check` passed.
- Local Vite entry responded successfully at `/`.

The in-app browser session currently rejects localhost navigation through its URL policy after the dev server restart, so this pass used the supplied reference dimensions plus scoped CSS/DOM review and build-time verification. No shared-module selectors were introduced.

final result: passed
