
// 1급 시민 - SSOT 기반 도메인
export interface ProjectContext {
  대지면적: number; // m²
  연면적: number; // m²
  건물용도: "업무시설" | "공동주택" | "공장" | "판매시설" | "교육연구시설" | string;
  구조: "철근콘크리트조" | "SRC조" | "철골조" | "철골철근콘크리트조" | string;
  지상층수: number;
  지하층수: number;
  최고높이: number; // m
  공사기간: number; // 개월
  건물외주?: number; // m
  총공사비?: number; // VAT별도
  컨테이너6수?: number; // 3.0*6.0 (18㎡) 컨테이너 동수
  컨테이너9수?: number; // 3.0*9.0 (27㎡) 컨테이너 동수
}

export interface LineItemFormula {
  formula: string; // e.g. "4 * SQRT(대지면적)"
  inputs: string[]; // ["대지면적"]
  description: string;
  logic: string;
  edited_by?: string;
  edited_at?: string;
}

export interface BOQLineItem {
  id: string; // TEMP-001
  품명: string;
  규격: string;
  단위: "식" | "m" | "개소" | string;
  산출식: LineItemFormula;
  수량: { value: number; logic: string; detail?: string }; // detail = "L=195m"
  재료비?: { 단가: number; 금액: number };
  노무비?: { 단가: number; 금액: number };
  경비?: { 단가: number; 금액: number };
  합계?: { 단가: number; 금액: number };
  비고: string;
  source: "items.ssot.yaml";
}

// 등급 판정 SSOT (기존 로직 유지)
export function determineGradeByArea(area: number): string {
  if (area >= 30000) return "특급";
  if (area >= 10000) return "1급";
  if (area >= 5000) return "2급";
  return "3급";
}
export function determineGradeByBudget(budget: number): string {
  if (budget >= 50000000000) return "특급";
  if (budget >= 10000000000) return "1급";
  if (budget >= 5000000000) return "2급";
  if (budget > 0) return "3급";
  return "미입력";
}
export function finalGrade(areaGrade: string, budgetGrade: string): string {
  const order = ["미입력", "3급", "2급", "1급", "특급"];
  const a = order.indexOf(areaGrade);
  const b = order.indexOf(budgetGrade);
  if (b === 0) return areaGrade; // 예산 미입력이면 면적 가등급
  return order[Math.max(a, b)] ?? "미입력";
}
