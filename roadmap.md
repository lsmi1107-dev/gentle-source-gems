# Roadmap

- [x] TEMP-001/003 IF 공식 (연면적 구간별 6/30/63/76/130, 12/48/100/120/200) — items.ssot.yaml
- [x] 연면적 변경 시 자동 재계산 (calculateAll useMemo)
- [x] 산출식 버튼 → ItemDetailModal (TEMP-001/003만), 상세 산출 화면 + 컨테이너 편집
- [x] 설치형/임대형 토글, 기타 항목 테이블, 임대료/설치해체비/운반비 입력
- [x] count6/count9 = 0일 때 자동배치 (count9=1, count6=MAX(0,CEIL((need-27)/18)))
- [x] excelExporter: 규격 specLabel + 합계 단가/금액 totalCost 반영 (0원 버그)
- [ ] 기본 컨텍스트에 임대료 350000/550000, 설치해체비 1000000, 운반비 1200000 기본값 반영
- [ ] 빌드/브라우저 검증 (모달 오픈, 3000→63/100, 18119→130/200, 엑셀 금액)
