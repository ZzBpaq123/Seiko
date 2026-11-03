import { useEffect, useState } from "react";
import { request } from "@/lib/axios";

export interface UserVO {
  id: number;
  username: string;
  email: string | null;
  phone: string | null;
  nickname: string | null;
  avatar: string | null;
  status: number;
}

export interface LoginVO {
  token: string;
  tokenName: string;
  user: UserVO;
}

export interface EmailRegisterParams {
  username: string;
  email: string;
  code: string;
  password: string;
  confirmPassword: string;
}

export interface ResetPasswordParams {
  email?: string;
  phone?: string;
  code: string;
  password: string;
  confirmPassword: string;
}

export interface UpdateProfileParams {
  username?: string;
  email?: string;
  phone?: string;
  avatar?: string;
  emailCode?: string;
  phoneCode?: string;
}

export const TOKEN_KEY = "token";
export const USER_KEY = "user";
export const AUTH_CHANGED_EVENT = "auth-changed";

function notifyAuthChanged() {
  window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));
}

export function sendEmailCode(email: string) {
  return request<void>({ method: "POST", url: "/auth/email/code", data: { email } });
}

export function emailRegister(params: EmailRegisterParams) {
  return request<void>({ method: "POST", url: "/auth/email/register", data: params });
}

export function emailLogin(email: string, password: string) {
  return request<LoginVO>({
    method: "POST",
    url: "/auth/email/login",
    data: { email, password },
  });
}

export function sendPhoneCode(phone: string) {
  return request<void>({ method: "POST", url: "/auth/phone/code", data: { phone } });
}

export function phoneLogin(phone: string, code: string) {
  return request<LoginVO>({ method: "POST", url: "/auth/phone/login", data: { phone, code } });
}

export function logout() {
  return request<void>({ method: "POST", url: "/auth/logout" });
}

export function sendResetCode(params: { email?: string; phone?: string }) {
  return request<void>({ method: "POST", url: "/auth/password/code", data: params });
}

export function resetPassword(params: ResetPasswordParams) {
  return request<void>({ method: "POST", url: "/auth/password/reset", data: params });
}

export function getCurrentUser() {
  return request<UserVO>({ method: "GET", url: "/auth/info" });
}

export function updateProfile(params: UpdateProfileParams) {
  return request<UserVO>({ method: "PUT", url: "/auth/profile", data: params });
}

export function saveLoginState(login: LoginVO) {
  localStorage.setItem(TOKEN_KEY, login.token);
  localStorage.setItem(USER_KEY, JSON.stringify(login.user));
  notifyAuthChanged();
}

export function clearLoginState() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  notifyAuthChanged();
}

export function updateStoredUser(user: UserVO) {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  notifyAuthChanged();
}

export function getStoredUser(): UserVO | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as UserVO;
  } catch {
    return null;
  }
}

export function useAuthUser(): UserVO | null {
  const [user, setUser] = useState<UserVO | null>(null);

  useEffect(() => {
    const sync = () => setUser(getStoredUser());
    sync();
    window.addEventListener("storage", sync);
    window.addEventListener(AUTH_CHANGED_EVENT, sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener(AUTH_CHANGED_EVENT, sync);
    };
  }, []);

  return user;
}

export function sendBindEmailCode(email: string) {
  return request<void>({ method: "POST", url: "/auth/email/bind-code", data: { email } });
}

export function sendBindPhoneCode(phone: string) {
  return request<void>({ method: "POST", url: "/auth/phone/bind-code", data: { phone } });
}
