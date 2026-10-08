import type { ProjectContext } from "../domain/types";

export const AREA6 = 18;
export const AREA9 = 27;
export const CONTAINER_ITEMS = ["TEMP-001", "TEMP-002", "TEMP-003"] as const;
export type ContainerItemId = (typeof CONTAINER_ITEMS)[number];
export type Phase2Key = "supervisor" | "contractor" | "warehouse";

export const isContainerItem = (id: string): id is ContainerItemId =>
  (CONTAINER_ITEMS as readonly string[]).includes(id);

/** 표시용 Line Item 코드 */
export const LINE_CODE: Record<ContainerItemId, string> = {
  "TEMP-001": "TEMP-B01",
  "TEMP-002": "TEMP-B02",
  "TEMP-003": "TEMP-B03",
};
export const PHASE2_KEY: Record<ContainerItemId, Phase2Key> = {
  "TEMP-001": "supervisor",
  "TEMP-002": "warehouse",
  "TEMP-003": "contractor",
};

/** 1단계 (연면적 가견적) */
export const PHASE1_FORMULA =
  "IF(연면적<=200, 6, IF(연면적<=1000, 30, IF(연면적<=3000, 63, IF(연면적<=6000, 76, 130))))";
export const PHASE1_STEPS: Array<[string, number, number]> = [
  ["연면적 ≤ 200", 200, 6],
  ["연면적 ≤ 1,000", 1000, 30],
  ["연면적 ≤ 3,000", 3000, 63],
  ["연면적 ≤ 6,000", 6000, 76],
  ["연면적 > 6,000", Infinity, 130],
];
export function getPhase1Area(연면적: number): number {
  return PHASE1_STEPS.find(([, max]) => 연면적 <= max)![2];
}

/** 2단계: 표준품셈 2-1-2 (직접노무비 기준, 가설물 제외) — 상한(억원) */
export const PHASE2_TABLE: Array<{
  label: string;
  maxEok: number;
  supervisor: number;
  contractor: number;
  warehouse: number;
}> = [
  { label: "0 ~ 1.5억", maxEok: 1.5, supervisor: 30, contractor: 30, warehouse: 27 },
  { label: "1.5 ~ 3억", maxEok: 3, supervisor: 40, contractor: 50, warehouse: 30 },
  { label: "3 ~ 9억", maxEok: 9, supervisor: 50, contractor: 70, warehouse: 40 },
  { label: "9 ~ 30억", maxEok: 30, supervisor: 70, contractor: 90, warehouse: 50 },
  { label: "30 ~ 90억", maxEok: 90, supervisor: 100, contractor: 140, warehouse: 70 },
  { label: "90 ~ 150억", maxEok: 150, supervisor: 140, contractor: 210, warehouse: 80 },
  { label: "150 ~ 300억", maxEok: 300, supervisor: 180, contractor: 300, warehouse: 90 },
  { label: "300 ~ 500억", maxEok: 500, supervisor: 190, contractor: 330, warehouse: 95 },
  { label: "500억 이상", maxEok: Infinity, supervisor: 210, contractor: 360, warehouse: 100 },
];
export function getPhase2Row(직접노무비: number) {
  const eok = 직접노무비 / 100_000_000;
  return PHASE2_TABLE.findIndex((r) => eok < r.maxEok || r.maxEok === Infinity);
}
export function getPhase2Area(직접노무비: number, key: Phase2Key): number {
  return PHASE2_TABLE[getPhase2Row(직접노무비)]![key];
}

/** 0~20동 전수탐색: 필요면적 이상 중 waste 최소, 동점 시 비용 최소 */
export function autoMixContainers(need: number, rent6 = 350000, rent9 = 550000) {
  let best = { count6: 20, count9: 20, waste: Infinity, cost: Infinity };
  for (let a = 0; a <= 20; a++) {
    for (let b = 0; b <= 20; b++) {
      const area = a * AREA6 + b * AREA9;
      if (area < need || a + b === 0) continue;
      const waste = area - need;
      const cost = a * rent6 + b * rent9;
      if (waste < best.waste || (waste === best.waste && cost < best.cost)) {
        best = { count6: a, count9: b, waste, cost };
      }
    }
  }
  return { count6: best.count6, count9: best.count9, totalArea: best.count6 * AREA6 + best.count9 * AREA9 };
}

export function requiredAreaFor(id: ContainerItemId, ctx: ProjectContext): number {
  return (ctx.산출단계 ?? "1단계") === "2단계"
    ? getPhase2Area(ctx.직접노무비 ?? 0, PHASE2_KEY[id])
    : getPhase1Area(ctx.연면적);
}

/** 항목별 배치 계획 (수동값 없으면 자동최적화) — 현재 임대형만 사용 */
export function planFor(id: ContainerItemId, ctx: ProjectContext) {
  const need = requiredAreaFor(id, ctx);
  const r6 = ctx.임대료6 ?? 350000;
  const r9 = ctx.임대료9 ?? 550000;
  const manual = ctx.컨테이너배치?.[id];
  const mix = manual ?? autoMixContainers(need, r6, r9);
  const { count6, count9 } = mix;
  const totalArea = count6 * AREA6 + count9 * AREA9;
  const monthlyRent = count6 * r6 + count9 * r9;
  const rentTotal = monthlyRent * ctx.공사기간;
  const install = ctx.설치해체비 ?? 0;
  const transport = ctx.운반비 ?? 0;
  const etc = (ctx.기타항목 ?? []).reduce((s, e) => s + (e.amount || 0), 0);
  return {
    need,
    count6,
    count9,
    auto: !manual,
    totalArea,
    ok: totalArea >= need,
    monthlyRent,
    rentTotal,
    install,
    transport,
    etc,
    totalCost: rentTotal + install + transport + etc,
  };
}

export const specOf = (p: { count6: number; count9: number; totalArea: number }) =>
  `3.0*6.0 x${p.count6} + 3.0*9.0 x${p.count9} (totalArea ${p.totalArea}㎡)`;
