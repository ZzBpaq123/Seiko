import axios, { AxiosHeaders, type AxiosRequestConfig, type RawAxiosHeaders, AxiosError, AxiosInstance, AxiosResponse, InternalAxiosRequestConfig } from "axios";
import { toast } from "@/lib/toast";
import { abortError, InFlightRequests } from "@/lib/inFlight";

export interface Result<T = unknown> {
  code: number;
  message: string;
  data: T;
}

const ERROR_CODE_MAP: Record<number, string> = {
  400: "请求参数错误",
  401: "登录已过期，请重新登录",
  403: "没有权限访问",
  404: "请求的资源不存在",
  405: "请求方法不允许",
  409: "资源冲突",
  429: "请求过于频繁",
  500: "服务器内部错误",
  502: "网关错误",
  503: "服务暂不可用",
};

const BUSINESS_CODE_MAP: Record<number, string> = {
  401: "登录已过期，请重新登录",
  1001: "用户名或密码错误",
  1002: "登录已过期，请重新登录",
  1003: "用户已被禁用",
  1004: "用户名已存在",
  1005: "原密码错误",
  1006: "验证码发送失败，请稍后重试",
  1007: "验证码错误或已过期",
  1008: "验证码发送过于频繁，请稍后再试",
  2001: "文件上传失败",
  2002: "文件类型不允许",
  2003: "文件大小超出限制",
};

export const http: AxiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:1001",
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

http.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("token");
      if (token && config.headers && !config.headers.has("token")) {
        config.headers.set("token", token);
      }
    }
    return config;
  },
  (error: AxiosError) => Promise.reject(error)
);

const inFlight = new InFlightRequests();
let loginRedirecting = false;

function currentToken() {
  return typeof window !== "undefined" ? localStorage.getItem("token") || "" : "";
}

function belongsToCurrentSession(config?: AxiosRequestConfig) {
  return !config || String(AxiosHeaders.from(config.headers as RawAxiosHeaders).get("token") || "") === currentToken();
}

function redirectToLogin() {
  if (typeof window === "undefined" || loginRedirecting) return;
  // 并发请求同时失效时只提示并跳转一次
  loginRedirecting = true;
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  // 与 lib/auth.ts 的 AUTH_CHANGED_EVENT 保持一致，让 Header 等组件同步登出状态
  window.dispatchEvent(new Event("auth-changed"));
  toast.error("登录已过期，请重新登录");
  // 先弹窗提示，1s 后再跳转登录页，让用户看到提示内容
  setTimeout(() => {
    if (window.location.hash !== "#login") {
      window.location.hash = "#login";
    }
    loginRedirecting = false;
  }, 1000);
}

http.interceptors.response.use(
  (response: AxiosResponse<Result>) => {
    if (!belongsToCurrentSession(response.config)) return Promise.reject(abortError());
    const { data } = response;
    if (data.code !== 200) {
      // 1002 为 Token 失效，401 为 Sa-Token 过滤器未读到 token，均需重新登录
      if (data.code === 1002 || data.code === 401) redirectToLogin();
      const message = BUSINESS_CODE_MAP[data.code] || data.message || "业务处理失败";
      return Promise.reject(new Error(message));
    }
    return response;
  },
  (error: AxiosError<Result>) => {
    if (axios.isCancel(error) || !belongsToCurrentSession(error.config)) return Promise.reject(abortError());
    const status = error.response?.status;
    const message =
      error.response?.data?.message ||
      (status ? ERROR_CODE_MAP[status] : undefined) ||
      error.message ||
      "网络请求异常";

    if (status === 401 || error.response?.data?.code === 1002) {
      redirectToLogin();
    }

    return Promise.reject(new Error(message));
  }
);

type RequestConfig = Omit<AxiosRequestConfig, "signal"> & { signal?: AbortSignal };

export async function request<T>(config: RequestConfig): Promise<T> {
  const headers = new AxiosHeaders(config.headers as RawAxiosHeaders);
  headers.set("token", currentToken());
  const scopedConfig = { ...config, headers };
  const read = (config.method || "GET").toUpperCase() === "GET";
  const send = async (signal?: AbortSignal) => {
    const response = await http.request<Result<T>>({ ...scopedConfig, signal });
    return response.data.data;
  };
  // SSR requests and writes are never shared across callers.
  if (!read || typeof window === "undefined") {
    if (!read) inFlight.clear();
    try { return await send(config.signal); }
    finally { if (!read) inFlight.clear(); }
  }
  const key = JSON.stringify([currentToken(), http.getUri(scopedConfig), headers.toJSON(),
    config.responseType, config.timeout, config.withCredentials]);
  return inFlight.run(key, send, config.signal);
}

export default http;
