import type { ProjectContext } from "../domain/types";

export const AREA6 = 18;
export const AREA9 = 27;

export function requiredArea(id: string, 연면적: number): number {
  const set =
    id === "TEMP-003" ? [12, 48, 100, 120, 200] : [6, 30, 63, 76, 130];
  if (연면적 <= 200) return set[0]!;
  if (연면적 <= 1000) return set[1]!;
  if (연면적 <= 3000) return set[2]!;
  if (연면적 <= 6000) return set[3]!;
  return set[4]!;
}

// count6/count9가 모두 0이면 필요면적 기준 자동 배치
export function resolveCounts(need: number, c6 = 0, c9 = 0) {
  if (c6 > 0 || c9 > 0) return { count6: c6, count9: c9, auto: false };
  const count9 = 1;
  const count6 = Math.max(0, Math.ceil((need - AREA9) / AREA6));
  return { count6, count9, auto: true };
}

export function specLabel(count6: number, count9: number) {
  const totalArea = count6 * AREA6 + count9 * AREA9;
  return `3.0*6.0 x${count6} + 3.0*9.0 x${count9} (totalArea ${totalArea}㎡)`;
}

export function containerCost(ctx: ProjectContext, count6: number, count9: number) {
  const monthlyRent = count6 * (ctx.임대료6 ?? 0) + count9 * (ctx.임대료9 ?? 0);
  const rentTotal =
    ctx.배치방식 === "설치형" ? 0 : monthlyRent * ctx.공사기간;
  const install = ctx.설치해체비 ?? 0;
  const transport = ctx.운반비 ?? 0;
  const etc = (ctx.기타항목 ?? []).reduce((s, e) => s + (e.amount || 0), 0);
  return {
    monthlyRent,
    rentTotal,
    install,
    transport,
    etc,
    totalCost: rentTotal + install + transport + etc,
    totalArea: count6 * AREA6 + count9 * AREA9,
  };
}
