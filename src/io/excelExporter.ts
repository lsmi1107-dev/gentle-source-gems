
import { BOQLineItem } from "../domain/types";

// 첨부 엑셀 형식과 100% 동일 - SSOT 기반 렌더
export function toExcelRows(items: BOQLineItem[]) {
  // 헤더: 품명 | 규격 | 단위 | 수량 | 재료비(단가/금액) | 노무비(단가/금액) | 경비(단가/금액) | 합계(단가/금액) | 비고
  const header = ["품명","규격","단위","수량","재료비 단가","재료비 금액","노무비 단가","노무비 금액","경비 단가","경비 금액","합계 단가","합계 금액","비고"];
  const rows = items.map(it => [
    it.품명,
    it.규격,
    it.단위,
    it.수량.value,
    it.재료비?.단가||"", it.재료비?.금액||"",
    it.노무비?.단가||"", it.노무비?.금액||"",
    it.경비?.단가||"", it.경비?.금액||"",
    it.합계?.단가||"", it.합계?.금액||"",
    it.비고
  ]);
  return { header, rows };
}
