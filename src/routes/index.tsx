import { createFileRoute } from "@tanstack/react-router";
import React, { useState, useMemo } from 'react';
import { X, Plus, Minus, ArrowLeft, Building2, FileSpreadsheet } from 'lucide-react';

const BUILDING_USES = [
  "단독주택","공동주택","제1종근린생활시설","제2종근린생활시설","문화및집회시설","종교시설","판매시설","운수시설","의료시설","교육연구시설","노유자시설","수련시설","운동시설","업무시설","숙박시설","위락시설","공장","창고시설","위험물저장및처리시설","자동차관련시설","동물및식물관련시설","자원순환관련시설","교정및군사시설","방송통신시설","발전시설","묘지관련시설","관광휴게시설","그밖의시설"
];
const STRUCTURES = ["철근콘크리트조","철골조","철골철근콘크리트조","조적조","목조","기타구조"];

type TempCode = 'TEMP-001' | 'TEMP-002' | 'TEMP-003' | 'TEMP-004' | 'TEMP-005' | 'TEMP-006' | 'TEMP-007' | 'TEMP-008';
type TempState = { c6:number; c9:number; rent6:number; rent9:number; install:number; transport:number; };

function getRequiredArea(gfa:number, code:'TEMP-001'|'TEMP-003'){
  if(code==='TEMP-001'){
    if(gfa<=200) return { required:6, formula:'6㎡ ≤200' };
    if(gfa<=1000) return { required:30, formula:'30㎡ ≤1,000' };
    if(gfa<=3000) return { required:63, formula:'25+38=63㎡@3,000' };
    if(gfa<=6000) return { required:76, formula:'76㎡ ≤6,000' };
    return { required:130, formula:'50+80=130㎡@6,000초과' };
  } else {
    if(gfa<=200) return { required:12, formula:'12㎡ ≤200' };
    if(gfa<=1000) return { required:48, formula:'48㎡ ≤1,000' };
    if(gfa<=3000) return { required:100, formula:'50+50=100㎡@3,000' };
    if(gfa<=6000) return { required:120, formula:'120㎡ ≤6,000' };
    return { required:200, formula:'100+100=200㎡@6,000초과' };
  }
}

function App(){
  // ProjectContext v3
  const [siteArea, setSiteArea] = useState(3500);
  const [gfa, setGfa] = useState(10000);
  const [buildingUse, setBuildingUse] = useState('업무시설');
  const [structure, setStructure] = useState('철근콘크리트조');
  const [groundFloors, setGroundFloors] = useState(15);
  const [basementFloors, setBasementFloors] = useState(3);
  const [maxHeight, setMaxHeight] = useState(60);
  const [duration, setDuration] = useState(12);
  const [totalCost, setTotalCost] = useState(0);
  const [cont6, setCont6] = useState(0);
  const [cont9, setCont9] = useState(0);

  const leftTotalArea = cont6*18 + cont9*27;

  // TEMP detailed states - screenshot matched
  const [t001, setT001] = useState<TempState>({ c6:6, c9:1, rent6:320000, rent9:475000, install:5000000, transport:4000000 });
  const [t003, setT003] = useState<TempState>({ c6:10, c9:1, rent6:320000, rent9:475000, install:2500000, transport:1640000 });

  const [selectedId, setSelectedId] = useState<TempCode|null>(null);
  const [xlsxMsg, setXlsxMsg] = useState<string|null>(null);

  const selectedIsOffice = selectedId==='TEMP-001' || selectedId==='TEMP-003';
  const currentTemp = selectedId==='TEMP-001' ? t001 : t003;
  const setCurrentTemp = selectedId==='TEMP-001' ? setT001 : setT003;
  const totalAreaCurrent = selectedIsOffice ? currentTemp.c6*18 + currentTemp.c9*27 : 0;
  const rentTotalCurrent = selectedIsOffice ? (currentTemp.c6*currentTemp.rent6 + currentTemp.c9*currentTemp.rent9)*duration : 0;
  const totalCostCurrent = selectedIsOffice ? rentTotalCurrent + currentTemp.install + currentTemp.transport : 0;
  const currentReq = useMemo(()=>{
    if(selectedId==='TEMP-001') return getRequiredArea(gfa,'TEMP-001');
    if(selectedId==='TEMP-003') return getRequiredArea(gfa,'TEMP-003');
    return null;
  },[selectedId,gfa]);

  // Dynamic quantities
  const qty002 = gfa >= 10000 ? 2 : 1;
  const qty004 = gfa >= 5000 ? 1 : 0;
  const qty005 = Math.max(1, Math.ceil(gfa/2000) + (groundFloors>=10?1:0));
  const qty006 = 1;
  const fenceLength = 4 * Math.sqrt(siteArea);
  const qty007 = 1;
  const qty008 = 1;

  const items = useMemo(()=>[
    {
      id:'TEMP-001' as TempCode,
      name:'조립식가설사무소/감리,감독자',
      spec:`3.0*6.0 x${t001.c6} + 3.0*9.0 x${t001.c9} (totalArea ${t001.c6*18 + t001.c9*27}㎡)`,
      unit:'식',
      qty:1,
      formula:'IF(연면적 <= 200, 6, IF(연면적 <= 1000, 30, IF(연면적 <= 3000, 63, IF(연면적 <= 6000, 76, 130)))) / 2020 표준품셈 2-1-2 간격 38+기계 25=63 (3000 이하), 80+50=130 (6000 초과)',
      note:'감리/감독자용'
    },
    {
      id:'TEMP-002' as TempCode,
      name:'조립식가설창고',
      spec:'—',
      unit:'식',
      qty:qty002,
      formula:'IF(연면적>=10000, 2, 1) / 연면적 10000㎡ 이상 2식',
      note:'—'
    },
    {
      id:'TEMP-003' as TempCode,
      name:'조립식가설사무소 / 도급자용',
      spec:`3.0*6.0 x${t003.c6} + 3.0*9.0 x${t003.c9} (totalArea ${t003.c6*18 + t003.c9*27}㎡)`,
      unit:'식',
      qty:1,
      formula:'IF(연면적 <= 200, 12, IF(연면적 <= 1000, 48, IF(연면적 <= 3000, 100, IF(연면적 <= 6000, 120, 200)))) / 2020 표준품셈 2-1-2 간격 50+기계 50=100 (3000 이하), 100+100=200 (6000 초과)',
      note:'—'
    },
    {
      id:'TEMP-004' as TempCode,
      name:'조립식가설실험실',
      spec:'—',
      unit:'식',
      qty:qty004,
      formula:'IF(연면적>=5000, 1, 0) / 연면적 5000㎡ 이상 1식',
      note:'—'
    },
    {
      id:'TEMP-005' as TempCode,
      name:'이동식화장실 (대소변겸용)',
      spec:'—',
      unit:'식',
      qty:qty005,
      formula:'MAX(1, CEIL(연면적/2000) + CEIL(지상층수/10)) / 연면적+층수 기준 최소 1식 (현장근로자수 산정 제외)',
      note:'—'
    },
    {
      id:'TEMP-006' as TempCode,
      name:'자동세륜기 설치 및 해체 - 8륜',
      spec:'8륜',
      unit:'식',
      qty:qty006,
      formula:'IF(지하층수>=1, 1, 1) / 지하층 있으면 필수 1식',
      note:'—'
    },
    {
      id:'TEMP-007' as TempCode,
      name:'조립식가설울타리',
      spec:'EGI철판, H6.0',
      unit:'식',
      qty:qty007,
      formula:`4 * SQRT(대지면적) / 연장(m)=4*SQRT(${siteArea.toLocaleString()})=${fenceLength.toFixed(1)}m, 형상보정계수 삭제`,
      note:`L=자동계산 L=${Math.round(fenceLength)}m`
    },
    {
      id:'TEMP-008' as TempCode,
      name:'조립식가설출입문',
      spec:'EGI철판, W6.0*H6.0',
      unit:'식',
      qty:qty008,
      formula:'IF(대지면적>=3000, 1, 1) / 대지면적 3000㎡ 이상 1식 (공장은 W8.0)',
      note:'—'
    },
  ],[t001,t003,qty002,qty004,qty005,qty006,qty007,qty008,fenceLength,siteArea]);

  return (
    <div className="min-h-screen bg-[#f7f5f1] text-[#1a1a18] overflow-x-hidden">
      <style>{`
        *{font-family: 'Pretendard', 'Noto Sans KR', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif}
        .mono{font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace}
        input::-webkit-outer-spin-button,input::-webkit-inner-spin-button{-webkit-appearance:none;margin:0}
        input[type=number]{-moz-appearance:textfield}
      `}</style>

      {/* Header */}
      <div className="sticky top-0 z-20 bg-[#f7f5f1]/95 backdrop-blur-xl border-b border-[#e9e6e0]">
        <div className="mx-auto max-w-[1440px] px-4 md:px-6 h-[56px] flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-7 h-7 bg-[#111] text-white rounded-[8px] flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
            <div className="flex items-center gap-2 text-[13px] font-semibold tracking-tight truncate">
              <span className="truncate">가설공사 자동산출</span>
              <span className="hidden md:inline font-normal text-[#8a8883] text-[12px] mono">SSOT: src/ssot/items.ssot.yaml • v3</span>
            </div>
          </div>
          <button onClick={()=>{setXlsxMsg('Summary Sheet XLSX 내보내기 준비됨 — SSOT 기반 8개 항목 • GFA '+gfa.toLocaleString()+'㎡ • SITE '+siteArea.toLocaleString()+'㎡'); setTimeout(()=>setXlsxMsg(null), 3500);}} className="shrink-0 h-[32px] px-4 bg-[#111] text-white rounded-full text-[12px] font-semibold flex items-center gap-1.5 hover:bg-black transition-colors shadow-sm">
            <FileSpreadsheet className="w-3.5 h-3.5" /> Summary Sheet (XLSX)
          </button>
        </div>
        <div className="md:hidden px-4 pb-2 text-[11px] mono text-[#8a8883]">SSOT: src/ssot/items.ssot.yaml • v3</div>
        {xlsxMsg && (
          <div className="px-4 md:px-6 pb-3">
            <div className="mx-auto max-w-[1440px] bg-[#111] text-white rounded-[12px] px-4 py-2.5 text-[11px] mono flex items-center justify-between gap-3">
              <span>{xlsxMsg}</span>
              <button onClick={()=>setXlsxMsg(null)} className="shrink-0 w-6 h-6 bg-white/15 rounded-full flex items-center justify-center hover:bg-white/25"><X className="w-3 h-3" /></button>
            </div>
          </div>
        )}
      </div>

      <div className="mx-auto max-w-[1440px] px-4 md:px-6 py-5 md:py-6 grid grid-cols-1 lg:grid-cols-[360px_minmax(0,1fr)] gap-5 items-start">
        {/* Left ProjectContext */}
        <div className="lg:sticky lg:top-[72px] rounded-[18px] border border-[#e8e6e0] bg-white shadow-[0_1px_4px_rgba(0,0,0,0.04)] overflow-hidden w-full max-w-full">
          <div className="px-5 py-4 border-b border-[#f0eeea] flex items-center justify-between">
            <div className="text-[12px] font-bold tracking-[0.02em]">ProjectContext</div>
            <span className="text-[10px] px-2 py-1 bg-[#f5f3ef] border border-[#e8e6e0] rounded-full text-[#8a8883]">v3 • SSOT 기반</span>
          </div>
          <div className="p-4 space-y-3.5">
            <div className="space-y-1.5">
              <div className="text-[11px] font-medium text-[#6b6a66]">대지면적</div>
              <div className="flex items-center gap-2">
                <input type="number" value={siteArea} onChange={e=>setSiteArea(Number(e.target.value)||0)} className="flex-1 bg-[#fbfaf8] border border-[#e8e6e0] rounded-[10px] px-3 py-2 text-[13px] font-bold mono focus:outline-none focus:border-[#111] focus:bg-white" />
                <span className="text-[12px] text-[#6b6a66] shrink-0">㎡</span>
              </div>
            </div>
            <div className="space-y-1.5">
              <div className="text-[11px] font-medium text-[#6b6a66]">연면적</div>
              <div className="flex items-center gap-2">
                <input type="number" value={gfa} onChange={e=>setGfa(Number(e.target.value)||0)} className="flex-1 bg-[#fbfaf8] border border-[#e8e6e0] rounded-[10px] px-3 py-2 text-[13px] font-bold mono focus:outline-none focus:border-[#111] focus:bg-white" />
                <span className="text-[12px] text-[#6b6a66]">㎡</span>
              </div>
            </div>
            <div className="space-y-1.5">
              <div className="text-[11px] font-medium text-[#6b6a66]">건물용도</div>
              <select value={buildingUse} onChange={e=>setBuildingUse(e.target.value)} className="w-full bg-[#fbfaf8] border border-[#e8e6e0] rounded-[10px] px-3 py-2.5 text-[12.5px] font-semibold focus:outline-none focus:border-[#111] focus:bg-white">
                {BUILDING_USES.map(u=><option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <div className="text-[11px] font-medium text-[#6b6a66]">구조</div>
              <select value={structure} onChange={e=>setStructure(e.target.value)} className="w-full bg-[#fbfaf8] border border-[#e8e6e0] rounded-[10px] px-3 py-2.5 text-[12.5px] font-semibold focus:outline-none focus:border-[#111] focus:bg-white">
                {STRUCTURES.map(s=><option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <div className="text-[11px] font-medium text-[#6b6a66]">지상층수</div>
                <div className="flex items-center gap-1.5">
                  <input type="number" value={groundFloors} onChange={e=>setGroundFloors(Math.max(0, Number(e.target.value)||0))} className="w-full bg-[#fbfaf8] border border-[#e8e6e0] rounded-[10px] px-3 py-2 text-[13px] font-bold mono focus:outline-none focus:border-[#111]" />
                  <span className="text-[12px] text-[#6b6a66]">층</span>
                </div>
              </div>
              <div className="space-y-1.5">
                <div className="text-[11px] font-medium text-[#6b6a66]">지하층수</div>
                <div className="flex items-center gap-1.5">
                  <input type="number" value={basementFloors} onChange={e=>setBasementFloors(Math.max(0, Number(e.target.value)||0))} className="w-full bg-[#fbfaf8] border border-[#e8e6e0] rounded-[10px] px-3 py-2 text-[13px] font-bold mono focus:outline-none focus:border-[#111]" />
                  <span className="text-[12px] text-[#6b6a66]">층</span>
                </div>
              </div>
            </div>
            <div className="space-y-1.5">
              <div className="text-[11px] font-medium text-[#6b6a66]">최고높이</div>
              <div className="flex items-center gap-2">
                <input type="number" value={maxHeight} onChange={e=>setMaxHeight(Number(e.target.value)||0)} className="flex-1 bg-[#fbfaf8] border border-[#e8e6e0] rounded-[10px] px-3 py-2 text-[13px] font-bold mono focus:outline-none focus:border-[#111]" />
                <span className="text-[12px] text-[#6b6a66]">m</span>
              </div>
            </div>
            <div className="space-y-1.5">
              <div className="text-[11px] font-medium text-[#6b6a66]">공사기간</div>
              <div className="flex items-center gap-2">
                <input type="number" value={duration} onChange={e=>setDuration(Math.max(1, Number(e.target.value)||1))} className="w-[90px] bg-[#fbfaf8] border border-[#e8e6e0] rounded-[10px] px-3 py-2 text-[13px] font-bold mono focus:outline-none focus:border-[#111]" />
                <span className="text-[12px] text-[#6b6a66]">개월</span>
              </div>
            </div>
            <div className="space-y-1.5">
              <div className="text-[11px] font-medium text-[#6b6a66]">총공사비 (VAT별도)</div>
              <div className="flex items-center gap-2">
                <input type="number" value={totalCost} onChange={e=>setTotalCost(Number(e.target.value)||0)} className="flex-1 bg-[#fbfaf8] border border-[#e8e6e0] rounded-[10px] px-3 py-2 text-[13px] font-bold mono focus:outline-none focus:border-[#111]" />
                <span className="text-[12px] text-[#6b6a66]">원</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <div className="text-[11px] font-medium text-[#6b6a66]">컨테이너 3.0×6.0 (18㎡)</div>
                <div className="flex items-center gap-1.5">
                  <input type="number" value={cont6} onChange={e=>setCont6(Math.max(0, Number(e.target.value)||0))} className="w-full bg-[#fbfaf8] border border-[#e8e6e0] rounded-[10px] px-3 py-2 text-[13px] font-bold mono focus:outline-none focus:border-[#111]" />
                  <span className="text-[12px] text-[#6b6a66]">동</span>
                </div>
              </div>
              <div className="space-y-1.5">
                <div className="text-[11px] font-medium text-[#6b6a66]">컨테이너 3.0×9.0 (27㎡)</div>
                <div className="flex items-center gap-1.5">
                  <input type="number" value={cont9} onChange={e=>setCont9(Math.max(0, Number(e.target.value)||0))} className="w-full bg-[#fbfaf8] border border-[#e8e6e0] rounded-[10px] px-3 py-2 text-[13px] font-bold mono focus:outline-none focus:border-[#111]" />
                  <span className="text-[12px] text-[#6b6a66]">동</span>
                </div>
              </div>
            </div>
            <div className="pt-2">
              <span className="inline-flex px-3 py-1.5 bg-[#f2f0ec] border border-[#e8e6e0] rounded-full text-[11px] mono text-[#6b6a66]">혼합배치 totalArea = {leftTotalArea}㎡</span>
            </div>
          </div>
        </div>

        {/* Right Summary Sheet */}
        <div className="rounded-[18px] border border-[#e8e6e0] bg-white shadow-[0_1px_4px_rgba(0,0,0,0.04)] overflow-hidden">
          <div className="px-5 md:px-6 py-4 flex items-center justify-between border-b border-[#f0eeea] gap-3">
            <div>
              <div className="text-[14px] font-bold tracking-tight">가설공사 Summary Sheet</div>
              <div className="text-[11px] text-[#8a8883] mt-1">8개 Line Item - SSOT 기반 렌더</div>
            </div>
            <div className="hidden md:flex items-center gap-2 text-[11px] text-[#8a8883]">
              <span className="px-2.5 py-1 bg-[#f7f5f1] border border-[#e8e6e0] rounded-full mono">GFA {gfa.toLocaleString()}㎡</span>
              <span className="px-2.5 py-1 bg-[#f7f5f1] border border-[#e8e6e0] rounded-full mono">SITE {siteArea.toLocaleString()}㎡</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-[12px] border-collapse min-w-[1060px]">
              <thead>
                <tr className="bg-[#f9f7f3] border-b border-[#ece9e3] text-[11px] text-[#8a8883] font-medium">
                  <th className="w-[84px] py-2.5 px-3 text-left font-medium border-r border-[#f0eeea]">ID</th>
                  <th className="w-[168px] py-2.5 px-3 text-left font-medium border-r border-[#f0eeea]">품명</th>
                  <th className="w-[220px] py-2.5 px-3 text-left font-medium border-r border-[#f0eeea]">규격</th>
                  <th className="w-[44px] py-2.5 px-2 text-center font-medium border-r border-[#f0eeea]">단위</th>
                  <th className="w-[44px] py-2.5 px-2 text-center font-medium border-r border-[#f0eeea]">수량</th>
                  <th className="py-2.5 px-3 text-left font-medium border-r border-[#f0eeea] min-w-[300px]">산출식</th>
                  <th className="w-[120px] py-2.5 px-3 text-left font-medium border-r border-[#f0eeea]">비고</th>
                  <th className="w-[76px] py-2.5 px-2 text-center font-medium"></th>
                </tr>
              </thead>
              <tbody className="text-[12.5px]">
                {items.map((it)=>(
                  <tr key={it.id} className="border-b border-[#f2f0ec] hover:bg-[#fdfcfa] transition-colors group">
                    <td className="py-3 px-3 mono text-[11px] font-semibold text-[#6b6a66] border-r border-[#f5f3ef]">{it.id}</td>
                    <td className="py-3 px-3 border-r border-[#f5f3ef] font-semibold leading-[1.35] text-[12.5px]">{it.name}</td>
                    <td className="py-3 px-3 border-r border-[#f5f3ef] mono text-[11.5px] leading-[1.4] text-[#3a3a38]">{it.spec}</td>
                    <td className="py-3 px-2 text-center border-r border-[#f5f3ef] text-[12px]">{it.unit}</td>
                    <td className="py-3 px-2 text-center mono font-bold border-r border-[#f5f3ef]">{it.qty}</td>
                    <td className="py-2.5 px-3 border-r border-[#f5f3ef]">
                      <div className="bg-[#f5f3ef] border border-[#ece9e3] rounded-[8px] px-2.5 py-1.5 text-[10.5px] leading-[1.45] mono text-[#6b6a66] line-clamp-2 group-hover:bg-[#f2f0ec] transition-colors">
                        {it.formula}
                      </div>
                    </td>
                    <td className="py-3 px-3 border-r border-[#f5f3ef] text-[11px] text-[#6b6a66]">{it.note}</td>
                    <td className="py-3 px-2 text-center">
                      <button onClick={()=>setSelectedId(it.id)} className="px-3 py-1.5 bg-[#111] text-white rounded-full text-[11px] font-semibold hover:bg-black transition-colors shadow-[0_1px_2px_rgba(0,0,0,0.12)]">산출식</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="px-5 md:px-6 py-3 bg-[#fcfbfa] border-t border-[#f0eeea] flex flex-wrap gap-2 text-[11px] text-[#6b6a66]">
            <span className="px-2.5 py-1 bg-white border border-[#e8e6e0] rounded-full">근거: 2020 표준품셈 2-1-2</span>
            <span className="px-2.5 py-1 bg-white border border-[#e8e6e0] rounded-full mono">TEMP-001: 38+25=63@3,000 / 80+50=130@6,000초과</span>
            <span className="px-2.5 py-1 bg-white border border-[#e8e6e0] rounded-full mono">TEMP-003: 50+50=100@3,000 / 100+100=200@6,000초과</span>
            <span className="px-2.5 py-1 bg-[#111] text-white rounded-full mono">합계 {items.reduce((s,i)=>s+i.qty,0)}식 • L={Math.round(fenceLength)}m</span>
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6">
          <div className="absolute inset-0 bg-[#111]/50 backdrop-blur-[6px]" onClick={()=>setSelectedId(null)} />
          <div className="relative w-full max-w-[980px] max-h-[92vh] bg-white rounded-[18px] shadow-[0_20px_80px_rgba(0,0,0,0.28)] border border-[#e8e6e0] overflow-hidden flex flex-col">
            {/* Modal Header with back */}
            <div className="px-5 md:px-6 py-4 border-b border-[#f0eeea] flex items-center justify-between bg-[#fcfbfa] gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <button onClick={()=>setSelectedId(null)} className="w-8 h-8 bg-white border border-[#e8e6e0] rounded-full flex items-center justify-center hover:bg-[#111] hover:text-white hover:border-[#111] transition-colors shrink-0">
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div className="w-8 h-8 bg-[#111] text-white rounded-[10px] flex items-center justify-center text-[11px] font-bold shrink-0">{selectedId.split('-')[1]}</div>
                <div className="min-w-0">
                  <div className="text-[13.5px] font-bold truncate">{selectedId} - {items.find(i=>i.id===selectedId)?.name}</div>
                  <div className="text-[11px] text-[#8a8883] mt-0.5 truncate">{buildingUse} • GFA {gfa.toLocaleString()}㎡ • SITE {siteArea.toLocaleString()}㎡ • {duration}개월</div>
                </div>
              </div>
              <button onClick={()=>setSelectedId(null)} className="w-8 h-8 bg-white border border-[#e8e6e0] rounded-full flex items-center justify-center hover:bg-[#111] hover:text-white transition-colors shrink-0">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-auto flex-1 p-5 md:p-6 space-y-5 bg-[#f9f8f6]">
              {selectedIsOffice && currentReq ? (
                <>
                  <div className="rounded-[14px] border border-[#e8e6e0] bg-[#f5f4ef] overflow-hidden">
                    <div className="px-4 py-2.5 flex items-center justify-between bg-[#f0eeea]/70 border-b border-[#e8e6e0]">
                      <span className="text-[11px] font-bold tracking-widest text-[#8a8883]">PROJECTCONTEXT (READ-ONLY)</span>
                      <span className="text-[10px] px-2 py-1 bg-white border border-[#e8e6e0] rounded-full text-[#8a8883]">모달에서는 읽기전용</span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0 divide-[#e8e6e0]">
                      <div className="px-4 py-3 bg-white/60"><div className="text-[10px] text-[#8a8883]">대지면적</div><div className="text-[13px] font-bold mono mt-1">{siteArea.toLocaleString()}㎡</div></div>
                      <div className="px-4 py-3 bg-white/60"><div className="text-[10px] text-[#8a8883]">연면적</div><div className="text-[13px] font-bold mono mt-1">{gfa.toLocaleString()}㎡</div></div>
                      <div className="px-4 py-3 bg-white/60"><div className="text-[10px] text-[#8a8883]">건축물 용도</div><div className="text-[13px] font-bold mt-1">{buildingUse}</div></div>
                      <div className="px-4 py-3 bg-white/60"><div className="text-[10px] text-[#8a8883]">공사기간</div><div className="text-[13px] font-bold mono mt-1">{duration}개월</div></div>
                    </div>
                  </div>

                  <div className="rounded-[14px] border border-[#e8e6e0] bg-white p-4">
                    <div className="text-[11px] font-bold mb-3">요구면적 산출 — {selectedId}</div>
                    <div className="flex flex-wrap items-center gap-2 text-[12px]">
                      <span className="px-2.5 py-1.5 bg-[#f5f4ef] border border-[#e8e6e0] rounded-full mono">GFA {gfa.toLocaleString()}㎡</span>
                      <span className="text-[#a8a6a1]">→</span>
                      <span className="px-2.5 py-1.5 bg-[#111] text-white rounded-full mono font-bold">{currentReq.required}㎡ 요구</span>
                      <span className="text-[11px] text-[#8a8883]">/ {currentReq.formula}</span>
                      <span className="text-[#a8a6a1]">→</span>
                      <span className="px-2.5 py-1.5 bg-white border border-[#111] rounded-full mono font-bold">{totalAreaCurrent}㎡ 확보</span>
                    </div>
                    <div className="mt-3 grid grid-cols-3 md:grid-cols-5 gap-2 text-[11px] mono">
                      {selectedId==='TEMP-001' ? (
                        <>
                          <div className="px-2.5 py-2 bg-[#f9f8f6] border border-[#f0eeea] rounded-[10px] text-center"><div className="text-[#8a8883]">≤200</div><div className="font-bold">6</div></div>
                          <div className="px-2.5 py-2 bg-[#f9f8f6] border border-[#f0eeea] rounded-[10px] text-center"><div className="text-[#8a8883]">≤1,000</div><div className="font-bold">30</div></div>
                          <div className="px-2.5 py-2 bg-white border border-[#111] rounded-[10px] text-center"><div className="text-[#8a8883]">≤3,000</div><div className="font-bold">63</div></div>
                          <div className="px-2.5 py-2 bg-[#f9f8f6] border border-[#f0eeea] rounded-[10px] text-center"><div className="text-[#8a8883]">≤6,000</div><div className="font-bold">76</div></div>
                          <div className="px-2.5 py-2 bg-[#111] text-white rounded-[10px] text-center"><div className="text-[#a8a6a1]">else</div><div className="font-bold">130</div></div>
                        </>
                      ):(
                        <>
                          <div className="px-2.5 py-2 bg-[#f9f8f6] border border-[#f0eeea] rounded-[10px] text-center"><div className="text-[#8a8883]">≤200</div><div className="font-bold">12</div></div>
                          <div className="px-2.5 py-2 bg-[#f9f8f6] border border-[#f0eeea] rounded-[10px] text-center"><div className="text-[#8a8883]">≤1,000</div><div className="font-bold">48</div></div>
                          <div className="px-2.5 py-2 bg-white border border-[#111] rounded-[10px] text-center"><div className="text-[#8a8883]">≤3,000</div><div className="font-bold">100</div></div>
                          <div className="px-2.5 py-2 bg-[#f9f8f6] border border-[#f0eeea] rounded-[10px] text-center"><div className="text-[#8a8883]">≤6,000</div><div className="font-bold">120</div></div>
                          <div className="px-2.5 py-2 bg-[#111] text-white rounded-[10px] text-center"><div className="text-[#a8a6a1]">else</div><div className="font-bold">200</div></div>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="grid lg:grid-cols-[1.15fr_0.85fr] gap-5">
                    <div className="space-y-4">
                      <div className="text-[11px] font-bold tracking-widest text-[#8a8883]">컨테이너 혼합배치</div>
                      <div className="rounded-[14px] border border-[#e8e6e0] bg-white divide-y divide-[#f0eeea] overflow-hidden">
                        <div className="p-4 flex items-center justify-between">
                          <div><div className="text-[13px] font-bold mono">3.0*6.0</div><div className="text-[11px] text-[#8a8883] mono mt-1">18㎡ / 동</div></div>
                          <div className="flex items-center gap-2">
                            <button onClick={()=>setCurrentTemp(s=>({...s, c6: Math.max(0,s.c6-1)}))} className="w-8 h-8 bg-white border border-[#e8e6e0] rounded-full flex items-center justify-center hover:border-[#111] hover:bg-[#111] hover:text-white transition-colors"><Minus className="w-4 h-4"/></button>
                            <div className="w-12 h-8 bg-[#f5f4ef] border border-[#e8e6e0] rounded-[10px] flex items-center justify-center mono font-bold text-[14px]">{currentTemp.c6}</div>
                            <button onClick={()=>setCurrentTemp(s=>({...s, c6: s.c6+1}))} className="w-8 h-8 bg-white border border-[#e8e6e0] rounded-full flex items-center justify-center hover:border-[#111] hover:bg-[#111] hover:text-white transition-colors"><Plus className="w-4 h-4"/></button>
                          </div>
                        </div>
                        <div className="p-4 flex items-center justify-between">
                          <div><div className="text-[13px] font-bold mono">3.0*9.0</div><div className="text-[11px] text-[#8a8883] mono mt-1">27㎡ / 동</div></div>
                          <div className="flex items-center gap-2">
                            <button onClick={()=>setCurrentTemp(s=>({...s, c9: Math.max(0,s.c9-1)}))} className="w-8 h-8 bg-white border border-[#e8e6e0] rounded-full flex items-center justify-center hover:border-[#111] hover:bg-[#111] hover:text-white transition-colors"><Minus className="w-4 h-4"/></button>
                            <div className="w-12 h-8 bg-[#f5f4ef] border border-[#e8e6e0] rounded-[10px] flex items-center justify-center mono font-bold text-[14px]">{currentTemp.c9}</div>
                            <button onClick={()=>setCurrentTemp(s=>({...s, c9: s.c9+1}))} className="w-8 h-8 bg-white border border-[#e8e6e0] rounded-full flex items-center justify-center hover:border-[#111] hover:bg-[#111] hover:text-white transition-colors"><Plus className="w-4 h-4"/></button>
                          </div>
                        </div>
                        <div className="px-4 py-3 bg-[#fcfbfa] flex items-center justify-between text-[11px]">
                          <span className="text-[#8a8883]">합계 면적 (auto)</span>
                          <span className="mono font-bold">{currentTemp.c6}*18 + {currentTemp.c9}*27 = {totalAreaCurrent}㎡ {totalAreaCurrent >= currentReq.required ? <span className="text-emerald-600 ml-1">✓ 충족</span> : <span className="text-red-500 ml-1">✗ 부족</span>}</span>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-[12px] border border-[#e8e6e0] bg-white p-3.5">
                          <div className="text-[10px] text-[#8a8883]">3.0*6.0 월 임대료</div>
                          <div className="mt-2 flex items-center gap-1.5">
                            <input type="number" value={currentTemp.rent6} onChange={e=>setCurrentTemp(s=>({...s, rent6: Number(e.target.value)||0}))} className="w-full bg-[#f9f8f6] border border-[#e8e6e0] rounded-[10px] px-2.5 py-1.5 mono text-[12px] font-bold focus:outline-none focus:border-[#111] focus:bg-white" />
                            <span className="text-[11px] shrink-0">원</span>
                          </div>
                        </div>
                        <div className="rounded-[12px] border border-[#e8e6e0] bg-white p-3.5">
                          <div className="text-[10px] text-[#8a8883]">3.0*9.0 월 임대료</div>
                          <div className="mt-2 flex items-center gap-1.5">
                            <input type="number" value={currentTemp.rent9} onChange={e=>setCurrentTemp(s=>({...s, rent9: Number(e.target.value)||0}))} className="w-full bg-[#f9f8f6] border border-[#e8e6e0] rounded-[10px] px-2.5 py-1.5 mono text-[12px] font-bold focus:outline-none focus:border-[#111] focus:bg-white" />
                            <span className="text-[11px] shrink-0">원</span>
                          </div>
                        </div>
                        <div className="rounded-[12px] border border-[#e8e6e0] bg-white p-3.5">
                          <div className="text-[10px] text-[#8a8883]">설치비</div>
                          <input type="number" value={currentTemp.install} onChange={e=>setCurrentTemp(s=>({...s, install: Number(e.target.value)||0}))} className="mt-2 w-full bg-[#f9f8f6] border border-[#e8e6e0] rounded-[10px] px-2.5 py-1.5 mono text-[12px] font-bold focus:outline-none focus:border-[#111] focus:bg-white" />
                        </div>
                        <div className="rounded-[12px] border border-[#e8e6e0] bg-white p-3.5">
                          <div className="text-[10px] text-[#8a8883]">운반비</div>
                          <input type="number" value={currentTemp.transport} onChange={e=>setCurrentTemp(s=>({...s, transport: Number(e.target.value)||0}))} className="mt-2 w-full bg-[#f9f8f6] border border-[#e8e6e0] rounded-[10px] px-2.5 py-1.5 mono text-[12px] font-bold focus:outline-none focus:border-[#111] focus:bg-white" />
                        </div>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="bg-[#111] text-white rounded-[16px] p-5">
                        <div className="text-[10px] tracking-[0.16em] text-[#a8a6a1]">FINAL TOTAL — {selectedId}</div>
                        <div className="mt-2 text-[24px] font-bold mono tracking-tight">{totalCostCurrent.toLocaleString()}원</div>
                        <div className="mt-4 space-y-2 text-[12px] text-[#c2c0bb]">
                          <div className="flex justify-between"><span>임대료 합계</span><span className="mono font-medium text-white">{rentTotalCurrent.toLocaleString()}</span></div>
                          <div className="flex justify-between"><span>설치비</span><span className="mono">{currentTemp.install.toLocaleString()}</span></div>
                          <div className="flex justify-between"><span>운반비</span><span className="mono">{currentTemp.transport.toLocaleString()}</span></div>
                        </div>
                        <div className="mt-4 pt-3 border-t border-white/10 text-[10px] mono text-[#8a8883]">3.0*6.0 x{currentTemp.c6} + 3.0*9.0 x{currentTemp.c9} (totalArea {totalAreaCurrent}㎡)</div>
                        <div className="mt-3 text-[11px] text-[#8a8883]">감리 135㎡ 기준 33,900,000원 • 도급자 207㎡ 기준 53,700,000원 • 합계 87,600,000원 예시</div>
                      </div>
                      <div className="rounded-[14px] border border-[#e8e6e0] bg-white p-4">
                        <div className="text-[11px] font-bold mb-2">엑셀 규격란 매핑</div>
                        <div className="text-[11px] mono bg-[#f9f8f6] border border-[#f0eeea] rounded-[10px] p-2.5 leading-relaxed">
                          3.0*6.0 x{currentTemp.c6} + 3.0*9.0 x{currentTemp.c9} ({totalAreaCurrent}㎡)<br/>
                          <span className="text-[#8a8883]">요구 {currentReq.required}㎡ / {currentReq.formula}</span>
                        </div>
                        <div className="mt-3 text-[11px] text-[#6b6a66] leading-relaxed">
                          단위: 식 / 수량: 1 / 합계: {totalCostCurrent.toLocaleString()}원<br/>
                          비고: {duration}개월 / prop itemType="{selectedId}"
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="space-y-4">
                  <div className="rounded-[14px] border border-[#e8e6e0] bg-white p-5">
                    <div className="text-[12px] font-bold mb-2">{selectedId} 산출식 상세</div>
                    <div className="mono text-[11px] bg-[#f5f4ef] border border-[#e8e6e0] rounded-[10px] p-3 leading-relaxed">
                      {items.find(i=>i.id===selectedId)?.formula}
                    </div>
                    <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-[11px]">
                      <div className="bg-[#fbfaf8] border border-[#f0eeea] rounded-[10px] px-3 py-2.5"><div className="text-[#8a8883]">대지면적</div><div className="font-bold mono mt-1">{siteArea.toLocaleString()}㎡</div></div>
                      <div className="bg-[#fbfaf8] border border-[#f0eeea] rounded-[10px] px-3 py-2.5"><div className="text-[#8a8883]">연면적</div><div className="font-bold mono mt-1">{gfa.toLocaleString()}㎡</div></div>
                      <div className="bg-[#fbfaf8] border border-[#f0eeea] rounded-[10px] px-3 py-2.5"><div className="text-[#8a8883]">지상층수</div><div className="font-bold mono mt-1">{groundFloors}층</div></div>
                      <div className="bg-[#fbfaf8] border border-[#f0eeea] rounded-[10px] px-3 py-2.5"><div className="text-[#8a8883]">지하층수</div><div className="font-bold mono mt-1">{basementFloors}층</div></div>
                    </div>
                    <div className="mt-4 text-[12px] leading-relaxed text-[#3a3a38]">
                      {selectedId==='TEMP-002' && <div>연면적 {gfa.toLocaleString()}㎡ → {gfa>=10000?'2식 (10,000㎡ 이상)':'1식'} 적용. 계산식: IF(연면적≥10000,2,1) = {qty002}</div>}
                      {selectedId==='TEMP-004' && <div>연면적 {gfa.toLocaleString()}㎡ → {gfa>=5000?'1식 (5,000㎡ 이상)':'0식'} 적용. = {qty004}</div>}
                      {selectedId==='TEMP-005' && <div>연면적 {gfa.toLocaleString()}㎡ / 지상 {groundFloors}층 → CEIL({gfa}/2000)={Math.ceil(gfa/2000)} + 층수보정({groundFloors>=10?1:0}) = {qty005}식. 최소 1식 보장.</div>}
                      {selectedId==='TEMP-006' && <div>지하층수 {basementFloors}층 → 지하층 있으면 필수 1식. IF(지하층수≥1,1,1) = {qty006}식. 8륜 기준.</div>}
                      {selectedId==='TEMP-007' && <div>대지면적 {siteArea.toLocaleString()}㎡ → 연장 = 4*SQRT({siteArea}) = 4*{Math.sqrt(siteArea).toFixed(2)} = {fenceLength.toFixed(2)}m → 반올림 {Math.round(fenceLength)}m. 형상보정계수 삭제 버전.</div>}
                      {selectedId==='TEMP-008' && <div>대지면적 {siteArea.toLocaleString()}㎡ → 3000㎡ 이상 1식 (공장은 W8.0). = {qty008}식. 규격 EGI철판, W6.0*H6.0</div>}
                    </div>
                  </div>
                  <div className="rounded-[14px] bg-[#111] text-white p-5">
                    <div className="text-[10px] tracking-widest text-[#8a8883]">CALCULATED QTY</div>
                    <div className="mt-2 text-[22px] font-bold mono">{items.find(i=>i.id===selectedId)?.qty}식</div>
                    <div className="mt-2 text-[11px] text-[#a8a6a1]">{items.find(i=>i.id===selectedId)?.name} • SSOT 기반 렌더</div>
                  </div>
                </div>
              )}
            </div>

            <div className="px-6 py-3.5 border-t border-[#f0eeea] bg-[#fcfbfa] flex items-center justify-between gap-3">
              <div className="text-[11px] mono text-[#8a8883] truncate">SSOT: {selectedId} • {items.find(i=>i.id===selectedId)?.spec} • totalArea {'{totalArea}'}</div>
              <button onClick={()=>setSelectedId(null)} className="shrink-0 px-4 py-2 bg-[#111] text-white rounded-full text-[12px] font-bold hover:bg-black transition-colors">내역서에 반영</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


export const Route = createFileRoute("/")({
  component: App,
});
