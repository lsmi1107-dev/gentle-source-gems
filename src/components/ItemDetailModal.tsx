import { Minus, Plus, Trash2, X } from "lucide-react";
import type { BOQLineItem, ProjectContext } from "../domain/types";
import {
  AREA6,
  AREA9,
  containerCost,
  requiredArea,
  resolveCounts,
} from "../calc/containerPlan";

export { requiredArea };

const won = (n: number) => `${Math.round(n).toLocaleString("ko-KR")}원`;

interface Props {
  item: BOQLineItem;
  ctx: ProjectContext;
  /** ctx 별칭 (Drop-in 용) */
  projectContext?: ProjectContext;
  /** TEMP-001 | TEMP-003 */
  itemType?: "TEMP-001" | "TEMP-003";
  onChange: (patch: Partial<ProjectContext>) => void;
  onClose: () => void;
}

export default function ItemDetailModal({
  item,
  ctx: ctxProp,
  projectContext,
  itemType,
  onChange,
  onClose,
}: Props) {
  const ctx = ctxProp ?? projectContext!;
  const itemId = itemType ?? item.id;
  const need = requiredArea(itemId, ctx.연면적);
  const { count6, count9, auto } = resolveCounts(
    need,
    ctx.컨테이너6수 ?? 0,
    ctx.컨테이너9수 ?? 0,
  );

  const r6 = ctx.임대료6 ?? 350000;
  const r9 = ctx.임대료9 ?? 550000;
  const mode = ctx.배치방식 ?? "임대형";
  const etcRows = ctx.기타항목 ?? [];
  const cost = containerCost(
    { ...ctx, 임대료6: r6, 임대료9: r9, 배치방식: mode },
    count6,
    count9,
  );

  const setCount = (key: "컨테이너6수" | "컨테이너9수", v: number) =>
    onChange({ 컨테이너6수: count6, 컨테이너9수: count9, [key]: Math.max(0, v) });

  const isT3 = item.id === "TEMP-003";
  const set = isT3 ? [12, 48, 100, 120, 200] : [6, 30, 63, 76, 130];
  const steps: Array<[string, number, boolean]> = [
    ["연면적 ≤ 200", set[0]!, ctx.연면적 <= 200],
    ["연면적 ≤ 1,000", set[1]!, ctx.연면적 > 200 && ctx.연면적 <= 1000],
    ["연면적 ≤ 3,000", set[2]!, ctx.연면적 > 1000 && ctx.연면적 <= 3000],
    ["연면적 ≤ 6,000", set[3]!, ctx.연면적 > 3000 && ctx.연면적 <= 6000],
    ["연면적 > 6,000", set[4]!, ctx.연면적 > 6000],
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
            onClick={() => setCount(countKey, count - 1)}
            className="flex h-7 w-7 items-center justify-center rounded-md border border-input text-muted-foreground hover:bg-accent"
          >
            <Minus className="h-3.5 w-3.5" />
          </button>
          <span className="w-8 text-center text-sm font-semibold tabular-nums text-foreground">
            {count}
          </span>
          <button
            onClick={() => setCount(countKey, count + 1)}
            className="flex h-7 w-7 items-center justify-center rounded-md border border-input text-muted-foreground hover:bg-accent"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      <label className="mt-2 flex items-center gap-2">
        <span className="whitespace-nowrap text-[11px] text-muted-foreground">월 임대료</span>
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

        {/* 상단 읽기전용 */}
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

        {/* 중단 수식 */}
        <div className="mt-5 rounded-lg border border-border p-4">
          <h4 className="text-sm font-semibold text-foreground">필요 면적 산출 과정</h4>
          <code className="mt-2 block rounded bg-muted px-2 py-1.5 font-mono text-[11px] leading-relaxed text-foreground">
            {isT3
              ? "IF(연면적 <= 200, 12, IF(<=1000, 48, IF(<=3000, 100, IF(<=6000, 120, 200))))"
              : "IF(연면적 <= 200, 6, IF(<=1000, 30, IF(<=3000, 63, IF(<=6000, 76, 130))))"}
          </code>
          <ul className="mt-3 space-y-1">
            {steps.map(([cond, val, active]) => (
              <li
                key={cond}
                className={`flex justify-between rounded-md px-2.5 py-1.5 text-xs ${
                  active ? "bg-primary/10 font-semibold text-primary" : "text-muted-foreground"
                }`}
              >
                <span>
                  {cond} {active && "← 현재"}
                </span>
                <span className="tabular-nums">{val}㎡</span>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex items-center justify-between border-t border-border pt-3 text-sm">
            <span className="text-muted-foreground">
              requiredArea(연면적 {ctx.연면적.toLocaleString("ko-KR")})
            </span>
            <span className="font-bold text-foreground">{need}㎡</span>
          </div>
        </div>

        {/* 하단 편집 */}
        <div className="mt-5 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-foreground">컨테이너 혼합배치</h4>
            <div className="flex rounded-md border border-input p-0.5">
              {(["설치형", "임대형"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => onChange({ 배치방식: m })}
                  className={`rounded px-3 py-1 text-xs font-medium ${
                    mode === m
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {counter("3.0 × 6.0", AREA6, count6, r6, "컨테이너6수", "임대료6")}
            {counter("3.0 × 9.0", AREA9, count9, r9, "컨테이너9수", "임대료9")}
          </div>

          <div
            className={`rounded-lg px-3 py-2 text-xs ${
              cost.totalArea >= need
                ? "bg-chart-2/10 text-chart-2"
                : "bg-destructive/10 text-destructive"
            }`}
          >
            totalArea = {count6}×18 + {count9}×27 = <b>{cost.totalArea}㎡</b> / 필요 {need}㎡{" "}
            {cost.totalArea >= need ? "· 충족" : "· 부족"}
            {auto && " (자동배치)"}
          </div>

          <table className="w-full text-sm">
            <tbody>
              <tr className="border-b border-border">
                <td className="py-2 text-muted-foreground">월 임대료 합계</td>
                <td className="py-2 text-right font-medium tabular-nums text-foreground">
                  {won(cost.monthlyRent)}
                </td>
              </tr>
              <tr className="border-b border-border">
                <td className="py-2 text-muted-foreground">
                  임대료 총액 {mode === "설치형" ? "(설치형 · 미적용)" : `(× ${ctx.공사기간}개월)`}
                </td>
                <td className="py-2 text-right font-medium tabular-nums text-foreground">
                  {won(cost.rentTotal)}
                </td>
              </tr>
              <tr className="border-b border-border">
                <td className="py-2 text-muted-foreground">설치·해체비</td>
                <td className="py-2 text-right">
                  <input
                    type="number"
                    value={ctx.설치해체비 ?? 1000000}
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
                    value={ctx.운반비 ?? 1200000}
                    onChange={(e) => onChange({ 운반비: Number(e.target.value) })}
                    className="h-8 w-40 rounded-md border border-input bg-card px-2 text-right text-xs tabular-nums text-foreground outline-none focus:ring-2 focus:ring-ring"
                  />
                </td>
              </tr>
              {etcRows.map((row, i) => (
                <tr key={i} className="border-b border-border">
                  <td className="py-2">
                    <input
                      value={row.name}
                      placeholder="기타 항목명"
                      onChange={(e) =>
                        onChange({
                          기타항목: etcRows.map((r, j) =>
                            j === i ? { ...r, name: e.target.value } : r,
                          ),
                        })
                      }
                      className="h-8 w-full rounded-md border border-input bg-card px-2 text-xs text-foreground outline-none focus:ring-2 focus:ring-ring"
                    />
                  </td>
                  <td className="py-2 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <input
                        type="number"
                        value={row.amount}
                        onChange={(e) =>
                          onChange({
                            기타항목: etcRows.map((r, j) =>
                              j === i ? { ...r, amount: Number(e.target.value) } : r,
                            ),
                          })
                        }
                        className="h-8 w-40 rounded-md border border-input bg-card px-2 text-right text-xs tabular-nums text-foreground outline-none focus:ring-2 focus:ring-ring"
                      />
                      <button
                        onClick={() =>
                          onChange({ 기타항목: etcRows.filter((_, j) => j !== i) })
                        }
                        className="rounded-md p-1 text-muted-foreground hover:bg-accent"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <button
            onClick={() => onChange({ 기타항목: [...etcRows, { name: "", amount: 0 }] })}
            className="inline-flex items-center gap-1 rounded-md border border-input px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-accent"
          >
            <Plus className="h-3.5 w-3.5" /> 항목추가
          </button>

          <div className="rounded-xl bg-foreground px-4 py-4 text-background">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs opacity-70">
                  최종 합계 (임대료 + 설치해체 + 운반 + 기타)
                </p>
                <p className="mt-0.5 text-[11px] opacity-60">
                  3.0*6.0 x{count6} + 3.0*9.0 x{count9} (totalArea {cost.totalArea}㎡)
                </p>
              </div>
              <p className="text-xl font-bold tabular-nums">{won(cost.totalCost)}</p>
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
