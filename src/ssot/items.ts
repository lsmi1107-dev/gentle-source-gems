import { parse } from "yaml";
import raw from "./items.ssot.yaml?raw";
import type { BOQLineItem } from "../domain/types";

// SSOT: 단일 진실 공급원. 모든 Line Item 정의는 items.ssot.yaml에만 존재한다.
export type SSOTItem = Omit<BOQLineItem, "수량" | "source"> & {
  수량: { value: number; logic: string };
};

export const ssotItems: SSOTItem[] = parse(raw);
