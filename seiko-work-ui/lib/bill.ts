import { request } from "@/lib/axios";

/** 账单类型：0-支出，1-收入 */
export type BillType = 0 | 1;

/** 支付方式：0-其他，1-现金，2-微信，3-支付宝，4-储蓄卡，5-信用卡 */
export type PaymentMethod = 0 | 1 | 2 | 3 | 4 | 5;

/** 统计粒度 */
export type StatPeriod = "DAY" | "WEEK" | "MONTH" | "YEAR";

export interface BillRecord {
  id: number;
  category: string | null;
  type: BillType;
  amount: number;
  /** yyyy-MM-dd */
  billDate: string;
  paymentMethod: PaymentMethod;
  remark: string | null;
  createTime: string;
  updateTime: string;
}

/** 周期汇总，startDate / endDate 均为闭区间（含当天） */
export interface BillSummary {
  startDate: string;
  endDate: string;
  income: number;
  expense: number;
  balance: number;
  billCount: number;
}

export interface BillOverview {
  today: BillSummary;
  week: BillSummary;
  month: BillSummary;
  year: BillSummary;
}

export interface BillTrend {
  /** 分组标识：按天 yyyy-MM-dd、按周 yyyy-MM-dd（周一）、按月 yyyy-MM、按年 yyyy */
  periodLabel: string;
  periodStart: string;
  periodEnd: string;
  expense: number;
  income: number;
  billCount: number;
}

export interface BillCategoryStat {
  category: string;
  expense: number;
  income: number;
  billCount: number;
  /** 该分类支出占全部支出的百分比 */
  expensePercent: number;
}

export interface BillParams {
  category?: string | null;
  type: BillType;
  amount: number;
  /** yyyy-MM-dd */
  billDate: string;
  paymentMethod?: PaymentMethod;
  remark?: string | null;
}

export interface BillQuery {
  current?: number;
  size?: number;
  type?: BillType;
  category?: string;
  /** yyyy-MM-dd（含） */
  startDate?: string;
  /** yyyy-MM-dd（含） */
  endDate?: string;
}

/** MyBatis-Plus 分页结构 */
export interface PageResult<T> {
  records: T[];
  total: number;
  size: number;
  current: number;
  pages: number;
}

export function listBills(query: BillQuery = {}, signal?: AbortSignal) {
  return request<PageResult<BillRecord>>({ method: "GET", url: "/api/bills", params: query, signal });
}

export function getBill(id: number) {
  return request<BillRecord>({ method: "GET", url: `/api/bills/${id}` });
}

export function createBill(params: BillParams) {
  return request<void>({ method: "POST", url: "/api/bills", data: params });
}

export function updateBill(id: number, params: BillParams) {
  return request<void>({ method: "PUT", url: `/api/bills/${id}`, data: params });
}

export function deleteBill(id: number) {
  return request<void>({ method: "DELETE", url: `/api/bills/${id}` });
}

/** 概览：今日 / 本周 / 本月 / 本年 */
export function getBillOverview() {
  return request<BillOverview>({ method: "GET", url: "/api/bills/overview" });
}

export function getBillSummary(startDate: string, endDate: string, signal?: AbortSignal) {
  return request<BillSummary>({
    method: "GET",
    url: "/api/bills/summary",
    params: { startDate, endDate },
    signal,
  });
}

export function getBillTrend(period: StatPeriod, startDate: string, endDate: string, signal?: AbortSignal) {
  return request<BillTrend[]>({
    method: "GET",
    url: "/api/bills/trend",
    params: { period, startDate, endDate },
    signal,
  });
}

export function getBillCategoryStat(startDate: string, endDate: string, signal?: AbortSignal) {
  return request<BillCategoryStat[]>({
    method: "GET",
    url: "/api/bills/category-stat",
    params: { startDate, endDate },
    signal,
  });
}
