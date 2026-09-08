import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import {
  Building2,
  Calculator,
  Download,
  Pencil,
  ShieldAlert,
  ShieldCheck,
  FileSpreadsheet,
  History,
} from "lucide-react";
import type { ProjectContext, LineItemFormula, BOQLineItem } from "../domain/types";
import {
  determineGradeByArea,
  determineGradeByBudget,
  finalGrade,
} from "../domain/types";
import { calculateAll } from "../calc/quantityEngine";
import { validate, ratchetCheck, snapshot } from "../validation/ratchet";
import { exportSummarySheet } from "../io/excelExporter";
import ItemDetailModal from "../components/ItemDetailModal";
import {
  areaBreakdown,
  containerCost,
  requiredArea,
  resolveCounts,
  specLabel,
} from "../calc/containerPlan";



export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "가설공사 자동산출 — SSOT 견적 시스템" },
      {
        name: "description",
        content:
          "items.ssot.yaml 단일 진실 공급원 기반 가설공사 수량 자동산출 및 Summary Sheet 출력",
      },
      { property: "og:title", content: "가설공사 자동산출 — SSOT 견적 시스템" },
      {
        property: "og:description",
        content:
          "items.ssot.yaml 단일 진실 공급원 기반 가설공사 수량 자동산출 및 Summary Sheet 출력",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

const BUILDING_USES = ["업무시설", "공동주택", "공장", "판매시설", "교육연구시설"];
const STRUCTURES = ["철근콘크리트조", "SRC조", "철골조", "철골철근콘크리트조"];

const DEFAULT_CTX: ProjectContext = {
  대지면적: 3500,
  연면적: 10000,
  건물용도: "업무시설",
  구조: "철근콘크리트조",
  지상층수: 15,
  지하층수: 3,
  최고높이: 60,
  공사기간: 12,
  총공사비: 0,
  컨테이너6수: 0,
  컨테이너9수: 0,
  임대료6: 350000,
  임대료9: 550000,
  설치해체비: 1000000,
  운반비: 1200000,
  배치방식: "임대형",
  기타항목: [],
};


interface FormulaEdit {
  formula: LineItemFormula;
}

function Index() {
  const [ctx, setCtx] = useState<ProjectContext>(DEFAULT_CTX);
  const [overrides, setOverrides] = useState<Record<string, LineItemFormula>>({});
  const [editing, setEditing] = useState<FormulaEdit | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const prevSnapshot = useRef<BOQLineItem[] | null>(null);
  const [changes, setChanges] = useState<
    ReturnType<typeof ratchetCheck>
  >([]);

  const items = useMemo(() => calculateAll(ctx, undefined, overrides), [ctx, overrides]);
  const validation = useMemo(() => validate(ctx, items), [ctx, items]);

  // 내역서 요약시트(Excel 동결 포맷) — TEMP-001/003 전용
  const freezeRows = useMemo(
    () =>
      items
        .filter((it) => it.id === "TEMP-001" || it.id === "TEMP-003")
        .map((it, i) => {
          const { need, label } = areaBreakdown(it.id, ctx.연면적);
          const { count6, count9 } = resolveCounts(
            need,
            ctx.컨테이너6수 ?? 0,
            ctx.컨테이너9수 ?? 0,
          );
          const c = containerCost(ctx, count6, count9);
          return {
            no: i + 1,
            item: it,
            name: it.id === "TEMP-001" ? "감독자용 사무실" : "도급자용 사무실",
            spec: `3.0*6.0 x${count6} + 3.0*9.0 x${count9} (${c.totalArea}㎡)`,
            specSub: `요구 ${need}㎡ / ${label}`,
            mat: 0,
            labor: c.install,
            exp: c.rentTotal + c.transport + c.etc,
            total: c.totalCost,
          };
        }),
    [items, ctx],
  );
  const freezeTotal = freezeRows.reduce((s, r) => s + r.total, 0);
  const won = (n: number) => `${Math.round(n).toLocaleString("ko-KR")}원`;


  const areaGrade = determineGradeByArea(ctx.연면적);
  const budgetGrade = determineGradeByBudget(ctx.총공사비 ?? 0);
  const grade = finalGrade(areaGrade, budgetGrade);

  const recalcWithRatchet = (nextCtx: ProjectContext, nextOverrides = overrides) => {
    const next = calculateAll(nextCtx, undefined, nextOverrides);
    if (prevSnapshot.current) {
      setChanges(ratchetCheck(prevSnapshot.current, next));
    }
    prevSnapshot.current = next;
    setCtx(nextCtx);
    setOverrides(nextOverrides);
  };

  const setField = <K extends keyof ProjectContext>(key: K, value: ProjectContext[K]) => {
    recalcWithRatchet({ ...ctx, [key]: value });
  };

  const openEditor = (item: BOQLineItem) => {
    if (item.id === "TEMP-001" || item.id === "TEMP-003") {
      setDetailId(item.id);
      return;
    }
    setEditingId(item.id);
    setEditing({ formula: { ...item.산출식 } });
  };

  const saveFormula = () => {
    if (!editingId || !editing) return;
    const stamped: LineItemFormula = {
      ...editing.formula,
      edited_by: "사용자",
      edited_at: new Date().toISOString(),
    };
    recalcWithRatchet(ctx, { ...overrides, [editingId]: stamped });
    setEditingId(null);
    setEditing(null);
  };

  const downloadXlsx = async () => {
    const blob = await exportSummarySheet(
      items.map((it) => {
        const isContainer = it.id === "TEMP-001" || it.id === "TEMP-003";
        if (isContainer) {
          const need = requiredArea(it.id, ctx.연면적);
          const { count6, count9 } = resolveCounts(
            need,
            ctx.컨테이너6수 ?? 0,
            ctx.컨테이너9수 ?? 0,
          );
          const c = containerCost(ctx, count6, count9);
          return {
            code: it.id,
            name: it.품명,
            spec: specLabel(count6, count9),
            unit: it.단위,
            quantity: 1,
            matUnit: 0,
            laborUnit: c.install,
            expUnit: c.rentTotal + c.transport + c.etc,
            totalCost: c.totalCost,
            formula: it.산출식.formula,
            remark:
              `${it.비고} ${ctx.배치방식 ?? "임대형"} · 임대료 ${c.monthlyRent.toLocaleString("ko-KR")}원/월 × ${ctx.공사기간}개월`.trim(),
          };
        }
        return {
          code: it.id,
          name: it.품명,
          spec: it.규격,
          unit: it.단위,
          quantity:
            it.id === "TEMP-007" && it.수량.detail
              ? Number(it.수량.detail.replace(/[^0-9.]/g, "")) || it.수량.value
              : it.수량.value,
          matUnit: it.재료비?.단가 ?? 0,
          laborUnit: it.노무비?.단가 ?? 0,
          expUnit: it.경비?.단가 ?? 0,
          formula: it.산출식.formula,
          remark: it.비고,
        };
      }),


      {
        projectName: "Lab Estimate",
        siteArea: ctx.대지면적,
        grossArea: ctx.연면적,
        buildingUse: ctx.건물용도,
        structure: ctx.구조,
        groundFloors: ctx.지상층수,
        undergroundFloors: ctx.지하층수,
        durationMonths: ctx.공사기간,
      },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "가설공사_SummarySheet.xlsx";
    a.click();
    URL.revokeObjectURL(url);
  };

  const numInput = (
    label: string,
    key: keyof ProjectContext,
    suffix: string,
  ) => (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <input
          type="number"
          value={(ctx[key] as number) ?? 0}
          onChange={(e) => setField(key, Number(e.target.value))}
          className="h-9 w-full rounded-md border border-input bg-card px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
        />
        <span className="shrink-0 text-xs text-muted-foreground">{suffix}</span>
      </div>
    </label>
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
              <Building2 className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-base font-semibold text-foreground">
                가설공사 자동산출
              </h1>
              <p className="text-xs text-muted-foreground">
                SSOT: src/ssot/items.ssot.yaml · v3
              </p>
            </div>
          </div>
          <button
            onClick={downloadXlsx}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Download className="h-4 w-4" />
            Summary Sheet (XLSX)
          </button>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-6 px-6 py-6 lg:grid-cols-[320px_1fr]">
        {/* 입력 패널 */}
        <section className="space-y-6">
          <div className="rounded-xl border border-border bg-card p-5">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-foreground">
              <Calculator className="h-4 w-4 text-muted-foreground" />
              프로젝트 조건 (ProjectContext)
            </h2>
            <div className="space-y-4">
              {numInput("대지면적", "대지면적", "㎡")}
              {numInput("연면적", "연면적", "㎡")}
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-muted-foreground">건물용도</span>
                <select
                  value={ctx.건물용도}
                  onChange={(e) => setField("건물용도", e.target.value)}
                  className="h-9 rounded-md border border-input bg-card px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
                >
                  {BUILDING_USES.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-muted-foreground">구조</span>
                <select
                  value={ctx.구조}
                  onChange={(e) => setField("구조", e.target.value)}
                  className="h-9 rounded-md border border-input bg-card px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
                >
                  {STRUCTURES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </label>
              <div className="grid grid-cols-2 gap-3">
                {numInput("지상층수", "지상층수", "층")}
                {numInput("지하층수", "지하층수", "층")}
              </div>
              {numInput("최고높이", "최고높이", "m")}
              {numInput("공사기간", "공사기간", "개월")}
              {numInput("총공사비 (VAT별도)", "총공사비", "원")}
              <div className="grid grid-cols-2 gap-3">
                {numInput("컨테이너 3.0×6.0 (18㎡)", "컨테이너6수", "동")}
                {numInput("컨테이너 3.0×9.0 (27㎡)", "컨테이너9수", "동")}
              </div>
              <p className="rounded-md bg-muted px-2.5 py-1.5 text-[11px] text-muted-foreground">
                혼합배치 totalArea ={" "}
                {(ctx.컨테이너6수 ?? 0) * 18 + (ctx.컨테이너9수 ?? 0) * 27}㎡
              </p>
            </div>
          </div>

          {/* 등급 판정 */}
          <div className="rounded-xl border border-border bg-card p-5">
            <h2 className="mb-3 text-sm font-semibold text-foreground">등급 판정</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">STEP 01 연면적 가산정</span>
                <span className="font-medium text-foreground">{areaGrade}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">STEP 02 총공사비 재확인</span>
                <span className="font-medium text-foreground">{budgetGrade}</span>
              </div>
              <div className="mt-3 flex items-center justify-between rounded-lg bg-secondary px-3 py-2">
                <span className="font-medium text-secondary-foreground">최종 등급</span>
                <span className="text-lg font-bold text-foreground">{grade}</span>
              </div>
            </div>
          </div>

          {/* 검증 / Ratchet */}
          <div className="rounded-xl border border-border bg-card p-5">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
              {validation.valid ? (
                <ShieldCheck className="h-4 w-4 text-chart-2" />
              ) : (
                <ShieldAlert className="h-4 w-4 text-destructive" />
              )}
              Tight Loop 검증
            </h2>
            {validation.valid ? (
              <p className="text-sm text-muted-foreground">모든 검증 통과</p>
            ) : (
              <ul className="space-y-1 text-sm text-destructive">
                {validation.errors.map((e) => (
                  <li key={e}>· {e}</li>
                ))}
              </ul>
            )}
            {changes.length > 0 && (
              <div className="mt-4 border-t border-border pt-3">
                <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-foreground">
                  <History className="h-3.5 w-3.5" />
                  Ratchet 변경 감지
                </h3>
                <ul className="space-y-1.5">
                  {changes.map((c, i) => (
                    <li
                      key={`${c.id}-${i}`}
                      className="flex items-center justify-between rounded-md bg-muted px-2.5 py-1.5 text-xs"
                    >
                      <span className="font-mono text-foreground">{c.id}</span>
                      <span
                        className={
                          c.type === "DOWNGRADE"
                            ? "font-medium text-destructive"
                            : "font-medium text-chart-2"
                        }
                      >
                        {c.diff > 0 ? `+${c.diff}` : c.diff}
                        {c.requiresApproval && " · 승인 필요"}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </section>

        {/* Summary Sheet */}
        <section className="rounded-xl border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
              가설공사 Summary Sheet
            </h2>
            <span className="text-xs text-muted-foreground">
              {items.length}개 Line Item · SSOT 기반 렌더
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50 text-left text-xs text-muted-foreground">
                  <th className="px-4 py-3 font-medium">ID</th>
                  <th className="px-4 py-3 font-medium">품명</th>
                  <th className="px-4 py-3 font-medium">규격</th>
                  <th className="px-4 py-3 font-medium">단위</th>
                  <th className="px-4 py-3 text-right font-medium">수량</th>
                  <th className="px-4 py-3 font-medium">산출식</th>
                  <th className="px-4 py-3 font-medium">비고</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const isEdited = Boolean(overrides[item.id]);
                  return (
                    <tr
                      key={item.id}
                      className="border-b border-border last:border-0 hover:bg-muted/30"
                    >
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                        {item.id}
                      </td>
                      <td className="px-4 py-3 font-medium text-foreground">
                        {item.품명}
                        {item.수량.value === 0 && (
                          <span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                            미해당
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{item.규격 || "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{item.단위}</td>
                      <td className="px-4 py-3 text-right font-semibold tabular-nums text-foreground">
                        {item.수량.value}
                      </td>
                      <td className="max-w-56 px-4 py-3">
                        <code className="block truncate rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] text-foreground">
                          {item.산출식.formula}
                        </code>
                        <span className="mt-0.5 block text-[10px] text-muted-foreground">
                          {item.산출식.description}
                          {item.산출식.edited_at && (
                            <>
                              {" "}
                              · {item.산출식.edited_by} 편집{" "}
                              {new Date(item.산출식.edited_at).toLocaleString("ko-KR")}
                            </>
                          )}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{item.비고 || "—"}</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => openEditor(item)}
                          className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs transition-colors ${
                            isEdited
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-input text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                          }`}
                        >
                          <Pencil className="h-3 w-3" />
                          {isEdited ? "편집됨" : "산출식"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      {/* TEMP-001/003 상세 산출 모달 */}
      {detailId &&
        (() => {
          const target = items.find((i) => i.id === detailId);
          if (!target) return null;
          return (
            <ItemDetailModal
              item={target}
              ctx={ctx}
              onChange={(patch) => recalcWithRatchet({ ...ctx, ...patch })}
              onClose={() => setDetailId(null)}
            />
          );
        })()}



      {/* 산출식 편집 모달 */}
      {editingId && editing && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4"
          onClick={() => setEditingId(null)}
        >
          <div
            className="w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-semibold text-foreground">
              산출식 편집 — <span className="font-mono text-sm">{editingId}</span>
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              지원 함수: SQRT, CEIL, FLOOR, IF, MAX, MIN · 변수: 대지면적, 연면적,
              지상층수, 지하층수, 최고높이, 공사기간, 건물외주
            </p>
            <div className="mt-4 space-y-4">
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-muted-foreground">산출식</span>
                <input
                  value={editing.formula.formula}
                  onChange={(e) =>
                    setEditing({
                      formula: { ...editing.formula, formula: e.target.value },
                    })
                  }
                  className="h-10 rounded-md border border-input bg-background px-3 font-mono text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-muted-foreground">설명</span>
                <input
                  value={editing.formula.description}
                  onChange={(e) =>
                    setEditing({
                      formula: { ...editing.formula, description: e.target.value },
                    })
                  }
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-muted-foreground">로직 메모</span>
                <input
                  value={editing.formula.logic}
                  onChange={(e) =>
                    setEditing({
                      formula: { ...editing.formula, logic: e.target.value },
                    })
                  }
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
                />
              </label>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setEditingId(null)}
                className="rounded-md border border-input px-4 py-2 text-sm font-medium text-foreground hover:bg-accent"
              >
                취소
              </button>
              <button
                onClick={saveFormula}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                저장 (edited_by/at 기록)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
