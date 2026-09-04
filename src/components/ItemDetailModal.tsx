import { Minus, Plus, X } from "lucide-react";
import type { BOQLineItem, ProjectContext } from "../domain/types";

export function requiredArea(id: string, 연면적: number): number {
  const set =
    id === "TEMP-003" ? [12, 48, 100, 120, 200] : [6, 30, 63, 76, 130];
  if (연면적 <= 200) return set[0]!;
  if (연면적 <= 1000) return set[1]!;
  if (연면적 <= 3000) return set[2]!;
  if (연면적 <= 6000) return set[3]!;
  return set[4]!;
}

const won = (n: number) => `${Math.round(n).toLocaleString("ko-KR")}원`;

interface Props {
  item: BOQLineItem;
  ctx: ProjectContext;
  onChange: (patch: Partial<ProjectContext>) => void;
  onClose: () => void;
}

export default function ItemDetailModal({ item, ctx, onChange, onClose }: Props) {
  const c6 = ctx.컨테이너6수 ?? 0;
  const c9 = ctx.컨테이너9수 ?? 0;
  const r6 = ctx.임대료6 ?? 0;
  const r9 = ctx.임대료9 ?? 0;
  const install = ctx.설치해체비 ?? 0;
  const transport = ctx.운반비 ?? 0;

  const totalArea = c6 * 18 + c9 * 27;
  const need = requiredArea(item.id, ctx.연면적);
  const monthlyRent = c6 * r6 + c9 * r9;
  const rentTotal = monthlyRent * ctx.공사기간;
  const grandTotal = rentTotal + install + transport;

  const steps: Array<[string, string, boolean]> = [
    ["연면적 ≤ 200", `${requiredArea(item.id, 200)}㎡`, ctx.연면적 <= 200],
    ["연면적 ≤ 1,000", `${requiredArea(item.id, 1000)}㎡`, ctx.연면적 > 200 && ctx.연면적 <= 1000],
    ["연면적 ≤ 3,000", `${requiredArea(item.id, 3000)}㎡`, ctx.연면적 > 1000 && ctx.연면적 <= 3000],
    ["연면적 ≤ 6,000", `${requiredArea(item.id, 6000)}㎡`, ctx.연면적 > 3000 && ctx.연면적 <= 6000],
    ["연면적 > 6,000", `${requiredArea(item.id, 999999)}㎡`, ctx.연면적 > 6000],
  ];

  const counter = (
    label: string,
    area: number,
    count: number,
    rent: number,
    countKey: "컨테이너6수" | "컨테이너9수",
    rentKey: "임대료6" | "임대료9",
  ) => (
    <div className="rounded-lg border border-border p-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-foreground">{label}</p>
          <p className="text-[11px] text-muted-foreground">{area}㎡ / 동</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onChange({ [countKey]: Math.max(0, count - 1) })}
            className="flex h-7 w-7 items-center justify-center rounded-md border border-input text-muted-foreground hover:bg-accent"
          >
            <Minus className="h-3.5 w-3.5" />
          </button>
          <span className="w-8 text-center text-sm font-semibold tabular-nums text-foreground">
            {count}
          </span>
          <button
            onClick={() => onChange({ [countKey]: count + 1 })}
            className="flex h-7 w-7 items-center justify-center rounded-md border border-input text-muted-foreground hover:bg-accent"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      <label className="mt-2 flex items-center gap-2">
        <span className="text-[11px] text-muted-foreground">월 임대료</span>
        <input
          type="number"
          value={rent}
          onChange={(e) => onChange({ [rentKey]: Number(e.target.value) })}
          className="h-8 w-full rounded-md border border-input bg-card px-2 text-right text-xs tabular-nums text-foreground outline-none focus:ring-2 focus:ring-ring"
        />
        <span className="text-[11px] text-muted-foreground">원</span>
      </label>
    </div>
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-border bg-card p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-base font-semibold text-foreground">
              상세 산출 — <span className="font-mono text-sm">{item.id}</span> {item.품명}
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              2020 표준품셈 2-1-2 · 컨테이너 혼합배치
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground hover:bg-accent"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* 상단: ProjectContext */}
        <div className="mt-4 grid grid-cols-3 gap-3">
          {[
            ["연면적", `${ctx.연면적.toLocaleString("ko-KR")}㎡`],
            ["건물용도", ctx.건물용도],
            ["공사기간", `${ctx.공사기간}개월`],
          ].map(([k, v]) => (
            <div key={k} className="rounded-lg bg-muted px-3 py-2">
              <p className="text-[11px] text-muted-foreground">{k}</p>
              <p className="text-sm font-semibold text-foreground">{v}</p>
            </div>
          ))}
        </div>

        {/* 중단: requiredArea 계산 과정 */}
        <div className="mt-5 rounded-lg border border-border p-4">
          <h4 className="text-sm font-semibold text-foreground">필요 면적 산출 과정</h4>
          <code className="mt-2 block rounded bg-muted px-2 py-1.5 font-mono text-[11px] text-foreground">
            {item.산출식.formula}
          </code>
          <ul className="mt-3 space-y-1">
            {steps.map(([cond, val, active]) => (
              <li
                key={cond}
                className={`flex justify-between rounded-md px-2.5 py-1.5 text-xs ${
                  active
                    ? "bg-primary/10 font-semibold text-primary"
                    : "text-muted-foreground"
                }`}
              >
                <span>{cond}</span>
                <span className="tabular-nums">{val}</span>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex items-center justify-between border-t border-border pt-3 text-sm">
            <span className="text-muted-foreground">requiredArea</span>
            <span className="font-bold text-foreground">{need}㎡</span>
          </div>
        </div>

        {/* 하단: 컨테이너 혼합배치 */}
        <div className="mt-5 space-y-3">
          <h4 className="text-sm font-semibold text-foreground">컨테이너 혼합배치</h4>
          <div className="grid gap-3 sm:grid-cols-2">
            {counter("3.0 × 6.0", 18, c6, r6, "컨테이너6수", "임대료6")}
            {counter("3.0 × 9.0", 27, c9, r9, "컨테이너9수", "임대료9")}
          </div>
          <div
            className={`rounded-lg px-3 py-2 text-xs ${
              totalArea >= need
                ? "bg-chart-2/10 text-chart-2"
                : "bg-destructive/10 text-destructive"
            }`}
          >
            totalArea = {c6}×18 + {c9}×27 = <b>{totalArea}㎡</b> / 필요 {need}㎡{" "}
            {totalArea >= need ? "· 충족" : "· 부족"}
          </div>

          <table className="w-full text-sm">
            <tbody>
              {[
                ["월 임대료 합계 (monthlyRent)", won(monthlyRent)],
                [`임대료 총액 (× ${ctx.공사기간}개월)`, won(rentTotal)],
              ].map(([k, v]) => (
                <tr key={k} className="border-b border-border">
                  <td className="py-2 text-muted-foreground">{k}</td>
                  <td className="py-2 text-right font-medium tabular-nums text-foreground">
                    {v}
                  </td>
                </tr>
              ))}
              <tr className="border-b border-border">
                <td className="py-2 text-muted-foreground">설치·해체비</td>
                <td className="py-2 text-right">
                  <input
                    type="number"
                    value={install}
                    onChange={(e) => onChange({ 설치해체비: Number(e.target.value) })}
                    className="h-8 w-40 rounded-md border border-input bg-card px-2 text-right text-xs tabular-nums text-foreground outline-none focus:ring-2 focus:ring-ring"
                  />
                </td>
              </tr>
              <tr className="border-b border-border">
                <td className="py-2 text-muted-foreground">운반비</td>
                <td className="py-2 text-right">
                  <input
                    type="number"
                    value={transport}
                    onChange={(e) => onChange({ 운반비: Number(e.target.value) })}
                    className="h-8 w-40 rounded-md border border-input bg-card px-2 text-right text-xs tabular-nums text-foreground outline-none focus:ring-2 focus:ring-ring"
                  />
                </td>
              </tr>
            </tbody>
          </table>

          <div className="rounded-xl bg-foreground px-4 py-4 text-background">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs opacity-70">최종 합계 (임대료 + 설치해체 + 운반)</p>
                <p className="mt-0.5 text-[11px] opacity-60">
                  3.0*6.0 x{c6} + 3.0*9.0 x{c9} (totalArea {totalArea}㎡)
                </p>
              </div>
              <p className="text-xl font-bold tabular-nums">{won(grandTotal)}</p>
            </div>
          </div>
        </div>

        <div className="mt-5 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            확인
          </button>
        </div>
      </div>
    </div>
  );
}
