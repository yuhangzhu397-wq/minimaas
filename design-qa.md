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

final result: passed
