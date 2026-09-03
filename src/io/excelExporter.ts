import ExcelJS from 'exceljs';

type LineItem = {
  code: string;
  name: string;
  spec: string;
  unit: string;
  quantity: number;
  matUnit: number;
  laborUnit: number;
  expUnit: number;
  formula?: string;
  remark?: string;
};

type ProjectContext = {
  projectName: string;
  siteArea: number;
  grossArea: number;
  buildingUse: string;
  structure: string;
  groundFloors: number;
  undergroundFloors: number;
  durationMonths: number;
};

export async function exportSummarySheet(
  items: LineItem[],
  ctx: ProjectContext
): Promise<Blob> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('가설공사 내역서', {
    properties: { tabColor: { argb: '4472C4' } }
  });

  // ===== Column widths - 엑셀 양식 그대로 =====
  ws.columns = [
    { width: 6 },  // A No
    { width: 18 }, // B 품명
    { width: 22 }, // C 규격
    { width: 8 },  // D 단위
    { width: 10 }, // E 수량
    { width: 14 }, // F 재료비 단가
    { width: 14 }, // G 재료비 금액
    { width: 14 }, // H 노무비 단가
    { width: 14 }, // I 노무비 금액
    { width: 14 }, // J 경비 단가
    { width: 14 }, // K 경비 금액
    { width: 14 }, // L 합계 단가
    { width: 14 }, // M 합계 금액
    { width: 22 }, // N 비고
  ];

  // ===== Title =====
  ws.mergeCells('A1:N1');
  ws.getCell('A1').value = `${ctx.projectName} - 가설공사 내역서 (SSOT v3)`;
  ws.getCell('A1').font = { size: 14, bold: true };
  ws.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(1).height = 28;

  ws.mergeCells('A2:N2');
  ws.getCell('A2').value = `건물용도: ${ctx.buildingUse} / 구조: ${ctx.structure} / 지상${ctx.groundFloors}층 지하${ctx.undergroundFloors}층 / 대지:${ctx.siteArea}m² 연면적:${ctx.grossArea}m² / 공사기간:${ctx.durationMonths}개월`;
  ws.getCell('A2').alignment = { horizontal: 'center' };
  ws.getRow(2).height = 20;

  // ===== Header Row 3 & 4 - 2단 헤더 병합 =====
  // Row 3
  const headersRow3 = ['No', '품명', '규격', '단위', '수량', '재료비', '', '노무비', '', '경비', '', '합계', '', '비고'];
  ws.getRow(3).values = headersRow3;
  // Row 4
  const headersRow4 = ['', '', '', '', '', '단가', '금액', '단가', '금액', '단가', '금액', '단가', '금액', ''];
  ws.getRow(4).values = headersRow4;

  // Merge vertical headers
  ['A3:A4', 'B3:B4', 'C3:C4', 'D3:D4', 'E3:E4', 'N3:N4'].forEach(range => ws.mergeCells(range));
  // Merge horizontal cost headers
  ws.mergeCells('F3:G3'); // 재료비
  ws.mergeCells('H3:I3'); // 노무비
  ws.mergeCells('J3:K3'); // 경비
  ws.mergeCells('L3:M3'); // 합계

  // Style headers
  [3, 4].forEach(rowNum => {
    const row = ws.getRow(rowNum);
    row.eachCell(cell => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'D9E1F2' } };
      cell.font = { bold: true, size: 10 };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
    });
    row.height = 20;
  });

  // ===== Data Rows from Row 5 =====
  let rowIdx = 5;
  items.forEach((item, idx) => {
    const matAmt = item.quantity * item.matUnit;
    const laborAmt = item.quantity * item.laborUnit;
    const expAmt = item.quantity * item.expUnit;
    const totalUnit = item.matUnit + item.laborUnit + item.expUnit;
    const totalAmt = matAmt + laborAmt + expAmt;

    // 수식 있는 경우 비고에 표시 - 특히 TEMP-007
    let remark = item.remark || '';
    if (item.code === 'TEMP-007' && item.formula) {
      remark = `${item.formula} = ${item.quantity}m`;
    }

    ws.getRow(rowIdx).values = [
      idx + 1,
      item.name, // 품명
      item.spec, // 규격
      item.unit, // 단위
      item.quantity, // 수량
      item.matUnit, // 재료비 단가
      matAmt, // 재료비 금액
      item.laborUnit, // 노무비 단가
      laborAmt, // 노무비 금액
      item.expUnit, // 경비 단가
      expAmt, // 경비 금액
      totalUnit, // 합계 단가
      totalAmt, // 합계 금액
      remark // 비고 - 예: 감리/감독자용, L=자동계산 L=237m
    ];

    const row = ws.getRow(rowIdx);
    row.eachCell((cell, colNumber) => {
      cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
      cell.font = { size: 10 };
      if (colNumber >= 5 && colNumber <= 13) {
        cell.alignment = { horizontal: 'right' };
        cell.numFmt = '#,##0';
      } else {
        cell.alignment = { horizontal: colNumber === 2 ? 'left' : 'center', vertical: 'middle' };
      }
    });
    // 품명 왼쪽 정렬 + 굵게
    ws.getCell(`B${rowIdx}`).font = { size: 10, bold: false };
    
    rowIdx++;
  });

  // ===== 합계 Row =====
  ws.getRow(rowIdx).values = ['', '합계', '', '', '', '', { formula: `SUM(G5:G${rowIdx-1})` }, '', { formula: `SUM(I5:I${rowIdx-1})` }, '', { formula: `SUM(K5:K${rowIdx-1})` }, '', { formula: `SUM(M5:M${rowIdx-1})` }, ''];
  const totalRow = ws.getRow(rowIdx);
  totalRow.eachCell(cell => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2CC' } };
    cell.font = { bold: true, size: 10 };
    cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'double' }, right: { style: 'thin' } };
    cell.numFmt = '#,##0';
  });
  totalRow.getCell(2).alignment = { horizontal: 'center' };

  // ===== Watermark - 1페이지 =====
  // ExcelJS는 워터마크 직접 지원 안함 - 헤더에 텍스트로 대체, 실제 출력시 워터마크는 프린트 설정으로
  ws.headerFooter.oddHeader = '&C&"맑은 고딕,보통"&KCCCCCC Lab Estimate v3 - SSOT';

  // Print setup - 1페이지에 맞추기
  ws.pageSetup = {
    orientation: 'landscape',
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 1,
    paperSize: 9, // A4
  };

  // Auto filter
  ws.autoFilter = { from: { row: 3, column: 1 }, to: { row: rowIdx, column: 14 } };

  const buffer = await wb.xlsx.writeBuffer();
  return new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

// Quantity Engine이 이걸 사용
export function calculateAll(items: LineItem[], ctx: ProjectContext): LineItem[] {
  return items.map(item => {
    let qty = item.quantity;
    if (item.code === 'TEMP-007') {
      // 4*SQRT(대지면적)
      qty = Math.round(4 * Math.sqrt(ctx.siteArea) * 10) / 10;
    }
    return { ...item, quantity: qty };
  });
}
