import { useState } from "react";
import { Lock, Minus, Plus, Sparkles, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import type { BOQLineItem, ProjectContext } from "../domain/types";
import {
  AREA6,
  AREA9,
  LINE_CODE,
  PHASE1_FORMULA,
  PHASE1_STEPS,
  PHASE2_KEY,
  PHASE2_TABLE,
  autoMixContainers,
  getPhase1Area,
  getPhase2Row,
  planFor,
  type ContainerItemId,
} from "../lib/standardEstimate";

const won = (n: number) => `${Math.round(n).toLocaleString("ko-KR")}원`;
const KEY_LABEL = { supervisor: "감독", contractor: "수급", warehouse: "창고" } as const;

interface Props {
  item: BOQLineItem;
  ctx?: ProjectContext;
  projectContext?: ProjectContext;
  itemType?: ContainerItemId;
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
  const ctx = (ctxProp ?? projectContext)!;
  const id = (itemType ?? item.id) as ContainerItemId;
  const phase = ctx.산출단계 ?? "1단계";
  const [mode] = useState<"임대형">("임대형"); // 설치형은 추후 구현 — 활성화 금지
  const p = planFor(id, { ...ctx, 배치방식: mode });
  const key = PHASE2_KEY[id];
  const labor = ctx.직접노무비 ?? 0;
  const p2Row = getPhase2Row(labor);
  const etcRows = ctx.기타항목 ?? [];
  const r6 = ctx.임대료6 ?? 350000;
  const r9 = ctx.임대료9 ?? 550000;

  const setMix = (count6: number, count9: number) =>
    onChange({
      컨테이너배치: {
        ...ctx.컨테이너배치,
        [id]: { count6: Math.max(0, Math.min(20, count6)), count9: Math.max(0, Math.min(20, count9)) },
      },
    });
  const autoOptimize = () => {
    const m = autoMixContainers(p.need, r6, r9);
    setMix(m.count6, m.count9);
    toast.success(`자동최적화: 3.0x6.0 ${m.count6}동 + 3.0x9.0 ${m.count9}동 (${m.totalArea}㎡)`);
  };

  const inputCls =
    "h-8 rounded-md border border-input bg-card px-2 text-right text-xs tabular-nums text-foreground outline-none focus:ring-2 focus:ring-ring";

  const counter = (label: string, area: number, count: number, rent: number, which: 6 | 9) => (
    <div className="rounded-lg border border-border p-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-foreground">{label}</p>
          <p className="text-[11px] text-muted-foreground">{area}㎡ / 동</p>
        </div>
        <div className="flex items-center gap-2">
          {[-1, 1].map((d) => (
            <button
              key={d}
              onClick={() =>
                which === 6 ? setMix(p.count6 + d, p.count9) : setMix(p.count6, p.count9 + d)
              }
              className="flex h-7 w-7 items-center justify-center rounded-md border border-input text-muted-foreground hover:bg-accent"
            >
              {d < 0 ? <Minus className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
            </button>
          )).reduce<React.ReactNode[]>((acc, el, i) => {
            if (i === 1)
              acc.push(
                <span key="n" className="w-8 text-center text-sm font-semibold tabular-nums text-foreground">
                  {count}
                </span>,
              );
            acc.push(el);
            return acc;
          }, [])}
        </div>
      </div>
      <label className="mt-2 flex items-center gap-2">
        <span className="whitespace-nowrap text-[11px] text-muted-foreground">월 임대료</span>
        <input
          type="number"
          value={rent}
          onChange={(e) => onChange({ [which === 6 ? "임대료6" : "임대료9"]: Number(e.target.value) })}
          className={`${inputCls} w-full`}
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
              상세 산출 — <span className="font-mono text-sm">{LINE_CODE[id]}</span> {item.품명}
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              SSOT v4 · 표준품셈 2-1-2 · 컨테이너 혼합배치
            </p>
          </div>
          <button onClick={onClose} className="rounded-md p-1 text-muted-foreground hover:bg-accent">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* 상단 READ-ONLY */}
        <div className="mt-4 grid grid-cols-3 gap-3">
          {[
            ["연면적", `${ctx.연면적.toLocaleString("ko-KR")}㎡`],
            ["건물용도", ctx.건물용도],
            ["공사기간", `${ctx.공사기간}개월`],
          ].map(([k, v]) => (
            <div key={k} className="rounded-lg bg-muted px-3 py-2">
              <p className="text-[11px] text-muted-foreground">{k} · READ-ONLY</p>
              <p className="text-sm font-semibold text-foreground">{v}</p>
            </div>
          ))}
        </div>

        {/* 1/2단계 탭 */}
        <div className="mt-5 flex rounded-lg bg-muted p-1">
          {(
            [
              ["1단계", "1단계 · 연면적 가견적"],
              ["2단계", "2단계 · 직접노무비 품셈"],
            ] as const
          ).map(([v, label]) => (
            <button
              key={v}
              onClick={() => onChange({ 산출단계: v })}
              className={`flex-1 rounded-md px-3 py-2 text-xs font-medium ${
                phase === v ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="mt-3 rounded-lg border border-border p-4">
          {phase === "1단계" ? (
            <>
              <code className="block rounded bg-muted px-2 py-1.5 font-mono text-[11px] text-foreground">
                {PHASE1_FORMULA}
              </code>
              <ul className="mt-3 space-y-1">
                {PHASE1_STEPS.map(([cond, , val]) => {
                  const active = getPhase1Area(ctx.연면적) === val;
                  return (
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
                  );
                })}
              </ul>
            </>
          ) : (
            <>
              <label className="flex items-center justify-between gap-2 text-xs">
                <span className="text-muted-foreground">직접노무비 (가설물 제외)</span>
                <span className="flex items-center gap-1">
                  <input
                    type="number"
                    value={labor}
                    onChange={(e) => onChange({ 직접노무비: Number(e.target.value) })}
                    className={`${inputCls} w-44`}
                  />
                  <span className="text-muted-foreground">원</span>
                </span>
              </label>
              <table className="mt-3 w-full text-xs">
                <thead>
                  <tr className="text-muted-foreground">
                    <th className="py-1 text-left font-medium">직접노무비</th>
                    {(["supervisor", "contractor", "warehouse"] as const).map((k) => (
                      <th
                        key={k}
                        className={`py-1 text-right font-medium ${k === key ? "text-foreground" : ""}`}
                      >
                        {KEY_LABEL[k]}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {PHASE2_TABLE.map((r, i) => (
                    <tr
                      key={r.label}
                      className={i === p2Row ? "bg-primary/10 font-semibold text-primary" : "text-muted-foreground"}
                    >
                      <td className="px-1 py-1">
                        {r.label} {i === p2Row && "← 현재"}
                      </td>
                      {(["supervisor", "contractor", "warehouse"] as const).map((k) => (
                        <td key={k} className={`px-1 py-1 text-right tabular-nums ${k === key ? "underline" : ""}`}>
                          {r[k]}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
          <div className="mt-3 flex items-center justify-between border-t border-border pt-3 text-sm">
            <span className="text-muted-foreground">
              required ({phase === "1단계" ? "연면적" : `table.${key}`})
            </span>
            <span className="font-bold text-foreground">{p.need}㎡</span>
          </div>
        </div>

        {/* 컨테이너 혼합배치 */}
        <div className="mt-5 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-foreground">컨테이너 혼합배치</h4>
            <div className="flex gap-1 rounded-md border border-input p-0.5">
              <button
                onClick={() =>
                  toast("설치형은 추후 구현 예정입니다. 현재는 임대형만 사용 가능합니다.")
                }
                className="inline-flex items-center gap-1 rounded border border-dashed border-muted-foreground/50 px-3 py-1 text-xs text-muted-foreground opacity-50"
              >
                <Lock className="h-3 w-3" /> 설치형
                <span className="rounded-full bg-muted px-1.5 text-[10px]">준비중</span>
              </button>
              <button className="rounded bg-foreground px-3 py-1 text-xs font-medium text-background">
                임대형 <span className="opacity-70">· 사용중</span>
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                p.ok ? "bg-chart-2/10 text-chart-2" : "bg-destructive/10 text-destructive"
              }`}
            >
              {p.ok ? "충족" : "부족"} · totalArea {p.count6}×18 + {p.count9}×27 = {p.totalArea}㎡ / 필요{" "}
              {p.need}㎡{p.auto && " (자동)"}
            </span>
            <button
              onClick={autoOptimize}
              className="inline-flex items-center gap-1 rounded-full bg-foreground px-3 py-1.5 text-xs font-medium text-background hover:opacity-85"
            >
              <Sparkles className="h-3.5 w-3.5" /> 자동최적화
            </button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {counter("3.0 × 6.0", AREA6, p.count6, r6, 6)}
            {counter("3.0 × 9.0", AREA9, p.count9, r9, 9)}
          </div>

          <table className="w-full text-sm">
            <tbody>
              <tr className="border-b border-border">
                <td className="py-2 text-muted-foreground">월 임대료 합계</td>
                <td className="py-2 text-right font-medium tabular-nums">{won(p.monthlyRent)}</td>
              </tr>
              <tr className="border-b border-border">
                <td className="py-2 text-muted-foreground">임대료 총액 (× {ctx.공사기간}개월)</td>
                <td className="py-2 text-right font-medium tabular-nums">{won(p.rentTotal)}</td>
              </tr>
              {(
                [
                  ["설치·해체비", "설치해체비"],
                  ["운반비", "운반비"],
                ] as const
              ).map(([label, k]) => (
                <tr key={k} className="border-b border-border">
                  <td className="py-2 text-muted-foreground">{label}</td>
                  <td className="py-2 text-right">
                    <input
                      type="number"
                      value={ctx[k] ?? 0}
                      onChange={(e) => onChange({ [k]: Number(e.target.value) })}
                      className={`${inputCls} w-40`}
                    />
                  </td>
                </tr>
              ))}
              {etcRows.map((row, i) => (
                <tr key={i} className="border-b border-border">
                  <td className="py-2">
                    <input
                      value={row.name}
                      placeholder="기타 항목명"
                      onChange={(e) =>
                        onChange({
                          기타항목: etcRows.map((r, j) => (j === i ? { ...r, name: e.target.value } : r)),
                        })
                      }
                      className="h-8 w-full rounded-md border border-input bg-card px-2 text-xs outline-none focus:ring-2 focus:ring-ring"
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
                        className={`${inputCls} w-40`}
                      />
                      <button
                        onClick={() => onChange({ 기타항목: etcRows.filter((_, j) => j !== i) })}
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
                <p className="text-xs opacity-70">최종 합계 (임대료 + 설치해체 + 운반 + 기타)</p>
                <p className="mt-0.5 text-[11px] opacity-60">
                  3.0*6.0 x{p.count6} + 3.0*9.0 x{p.count9} (totalArea {p.totalArea}㎡)
                </p>
              </div>
              <p className="text-xl font-bold tabular-nums">{won(p.totalCost)}</p>
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
