import type { ProjectContext, BOQLineItem, LineItemFormula } from "../domain/types";
import { ssotItems, type SSOTItem } from "../ssot/items";

// Tight loop용 수식 평가기 - SSOT만 신뢰
// 지원: SQRT, CEIL, FLOOR, IF, MAX, MIN, +, -, *, /, 비교
export function evalFormula(formula: string, ctx: ProjectContext): number {
  const SQRT = Math.sqrt;
  const CEIL = Math.ceil;
  const FLOOR = Math.floor;
  const MAX = Math.max;
  const MIN = Math.min;
  const IF = (cond: boolean, t: number, f: number) => (cond ? t : f);
  const {
    대지면적,
    연면적,
    지상층수,
    지하층수,
    최고높이,
    공사기간,
    건물외주 = 0,
  } = ctx;
  try {
    // eslint-disable-next-line no-eval
    return eval(formula);
  } catch (e) {
    console.warn(`Formula eval failed: ${formula}`, e);
    return NaN;
  }
}

export function calculateAll(
  ctx: ProjectContext,
  items: SSOTItem[] = ssotItems,
  formulaOverrides: Record<string, LineItemFormula> = {},
): BOQLineItem[] {
  return items.map((item) => {
    const formula = formulaOverrides[item.id] ?? item.산출식;
    const val = evalFormula(formula.formula, ctx);
    let detail = "";
    let qty = 1;
    let 규격 = item.규격;
    let 비고 = item.비고;
    if (item.id === "TEMP-001" || item.id === "TEMP-003") {
      // 컨테이너 혼합배치: 3.0*6.0(18㎡) + 3.0*9.0(27㎡), 직접 입력
      const c6 = ctx.컨테이너6수 ?? 0;
      const c9 = ctx.컨테이너9수 ?? 0;
      const totalArea = c6 * 18 + c9 * 27;
      규격 = `3.0*6.0 ×${c6} + 3.0*9.0 ×${c9} (totalArea=${totalArea}㎡)`;
      if (Number.isNaN(val)) qty = 0;
      else qty = Math.max(0, Math.round(val));
      return {
        ...item,
        규격,
        산출식: formula,
        수량: { value: qty, logic: formula.logic, detail },
        비고,
        source: "items.ssot.yaml",
      } as BOQLineItem;
    }
    if (item.id === "TEMP-007") {
      detail = `L=${Number.isNaN(val) ? 0 : Math.round(val)}m`;
      qty = 1; // 식으로 표기, 연장은 비고에
    } else if (Number.isNaN(val)) {
      qty = 0;
    } else if (item.id === "TEMP-002" || item.id === "TEMP-004") {
      // 0이면 미해당
      qty = val === 0 ? 0 : Math.max(1, Math.round(val));
    } else {
      qty = Math.max(0, Math.round(val) || 1);
    }
    return {
      ...item,
      산출식: formula,
      수량: { value: qty, logic: formula.logic, detail },
      비고: detail ? `${item.비고} ${detail}`.trim() : item.비고,
      source: "items.ssot.yaml",
    } as BOQLineItem;
  });
}
