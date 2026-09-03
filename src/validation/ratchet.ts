
import { BOQLineItem, ProjectContext } from "../domain/types";

// Tight Loop 검증
export function validate(ctx: ProjectContext, items: BOQLineItem[]) {
  const errors: string[] = [];
  if (ctx.연면적 <= 0) errors.push("연면적 0 이하");
  if (ctx.대지면적 <= 0) errors.push("대지면적 0 이하");
  items.forEach(it => {
    if (it.수량.value < 0) errors.push(`${it.id} 수량 음수`);
    if (it.수량.value === 0 && !["TEMP-002","TEMP-004"].includes(it.id)) {
      // TEMP-002,004는 0 허용 (조건 미충족)
      errors.push(`${it.id} 수량 0`);
    }
  });
  return { valid: errors.length===0, errors };
}

// Ratchet - 변경 감지
export function ratchetCheck(prev: BOQLineItem[], curr: BOQLineItem[]) {
  const changes = [];
  for (let i = 0; i < curr.length; i++) {
    const p = prev[i];
    const c = curr[i];
    if (!c) continue;
    if (p?.수량.value !== c.수량.value) {
      const diff = c.수량.value - (p?.수량.value || 0);
      if (diff < 0) {
        changes.push({ id: c.id, type: "DOWNGRADE" as const, diff, requiresApproval: true });
      } else {
        changes.push({ id: c.id, type: "UPGRADE" as const, diff, requiresApproval: false });
      }
    }
  }
  return changes;
}

// Golden Excel 비교용 스냅샷
export function snapshot(items: BOQLineItem[]) {
  return JSON.stringify(items.map(i=>({id:i.id, 품명:i.품명, 규격:i.규격, 단위:i.단위, 수량:i.수량.value, 비고:i.비고})), null, 2);
}
