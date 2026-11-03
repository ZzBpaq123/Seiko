"use client";

import { memo, useEffect, useState, type InputHTMLAttributes } from "react";
import { KeyRound, Loader2, LogOut, Pencil, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { clearHash, usePanelOpen } from "@/hooks/useHash";
import {
  TOKEN_KEY,
  type UserVO,
  clearLoginState,
  emailLogin,
  emailRegister,
  getCurrentUser,
  getStoredUser,
  logout,
  phoneLogin,
  saveLoginState,
  resetPassword,
  sendEmailCode,
  sendBindEmailCode,
  sendBindPhoneCode,
  sendPhoneCode,
  sendResetCode,
  updateProfile,
  updateStoredUser,
} from "@/lib/auth";
import { toast } from "@/lib/toast";
import { PanelReveal } from "@/components/PanelReveal";
import { MailAccountConfig } from "@/components/MailAccountConfig";

type Mode = "email-login" | "email-register" | "phone-login" | "forgot-password";

type ContactType = "email" | "phone";

const MODE_TABS: { key: Mode; label: string }[] = [
  { key: "email-login", label: "邮箱登录" },
  { key: "phone-login", label: "手机登录" },
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^1[3-9]\d{9}$/;
const CODE_RE = /^\d{6}$/;

function Field({ label, ...props }: { label: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs text-neutral-500 dark:text-neutral-400">{label}</span>
      <input
        {...props}
        className="w-full rounded-lg border border-neutral-900/15 dark:border-white/15 bg-white/60 dark:bg-neutral-800/60 px-3 py-2 text-sm text-neutral-900 dark:text-neutral-100 outline-none transition-colors placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:border-neutral-900 dark:focus:border-white"
      />
    </label>
  );
}

function SendCodeButton({
  onSend,
  disabled,
}: {
  onSend: () => Promise<boolean>;
  disabled?: boolean;
}) {
  const [countdown, setCountdown] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  const handleClick = async () => {
    setLoading(true);
    try {
      if (await onSend()) setCountdown(60);
    } finally {
      setLoading(false);
    }
  };

  const busy = loading || countdown > 0;
  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || busy}
      className="shrink-0 rounded-lg border border-neutral-900/15 dark:border-white/15 bg-white/60 dark:bg-neutral-800/60 px-3 py-2 text-xs text-neutral-700 dark:text-neutral-300 transition-colors hover:border-neutral-900 dark:hover:border-white disabled:cursor-not-allowed disabled:opacity-50"
    >
      {countdown > 0 ? `${countdown}s 后重发` : loading ? "发送中…" : "获取验证码"}
    </button>
  );
}

function SubmitButton({ loading, children }: { loading: boolean; children: string }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="flex w-full items-center justify-center gap-2 rounded-lg bg-neutral-900 dark:bg-neutral-50 py-2.5 text-sm font-medium text-neutral-50 dark:text-neutral-900 transition-opacity disabled:opacity-60"
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
}

function LoginPanelContent() {
  const [user, setUser] = useState<UserVO | null>(null);
  const [checked, setChecked] = useState(false);
  const [mode, setMode] = useState<Mode>("email-login");
  const [loading, setLoading] = useState(false);

  // 邮箱登录
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // 邮箱注册
  const [regUsername, setRegUsername] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regCode, setRegCode] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirm, setRegConfirm] = useState("");

  // 手机登录
  const [phone, setPhone] = useState("");
  const [phoneCode, setPhoneCode] = useState("");

  // 找回密码
  const [forgotType, setForgotType] = useState<ContactType>("email");
  const [forgotContact, setForgotContact] = useState("");
  const [forgotCode, setForgotCode] = useState("");
  const [forgotPassword, setForgotPassword] = useState("");
  const [forgotConfirm, setForgotConfirm] = useState("");

  // 个人资料编辑
  const [editing, setEditing] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileAvatar, setProfileAvatar] = useState("");
  const [profileUsername, setProfileUsername] = useState("");
  const [profileEmail, setProfileEmail] = useState("");
  const [profileEmailCode, setProfileEmailCode] = useState("");
  const [profilePhone, setProfilePhone] = useState("");
  const [profilePhoneCode, setProfilePhoneCode] = useState("");

  useEffect(() => {
    if (!localStorage.getItem(TOKEN_KEY)) {
      setChecked(true);
      return;
    }
    getCurrentUser()
      .then(setUser)
      .catch(() => clearLoginState())
      .finally(() => setChecked(true));
  }, []);

  // 登录用户信息加载/更新后，同步资料表单初始值（编辑中不覆盖已输入内容）
  useEffect(() => {
    if (!user || editing) return;
    setProfileAvatar(user.avatar ?? "");
    setProfileUsername(user.username);
    setProfileEmail(user.email ?? "");
    setProfileEmailCode("");
    setProfilePhone(user.phone ?? "");
    setProfilePhoneCode("");
  }, [user, editing]);


  const fail = (e: unknown) => toast.error(e instanceof Error ? e.message : "操作失败，请稍后重试");

  const switchMode = (next: Mode) => setMode(next);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!EMAIL_RE.test(loginEmail)) return toast.error("邮箱格式不正确");
    if (!loginPassword) return toast.error("请输入密码");
    setLoading(true);
    try {
      const login = await emailLogin(loginEmail, loginPassword);
      saveLoginState(login);
      setUser(login.user);
      toast.success("登录成功");
      clearHash();
    } catch (err) {
      fail(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSendEmailCode = async (): Promise<boolean> => {
    if (!EMAIL_RE.test(regEmail)) {
      toast.error("请输入正确的邮箱后再获取验证码");
      return false;
    }
    try {
      await sendEmailCode(regEmail);
      toast.success("验证码已发送，5 分钟内有效");
      return true;
    } catch (err) {
      fail(err);
      return false;
    }
  };

  const handleEmailRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (regUsername.trim().length < 2 || regUsername.trim().length > 30)
      return toast.error("用户名长度需为 2-30 个字符");
    if (!EMAIL_RE.test(regEmail)) return toast.error("邮箱格式不正确");
    if (!CODE_RE.test(regCode)) return toast.error("验证码为 6 位数字");
    if (regPassword.length < 6 || regPassword.length > 20)
      return toast.error("密码长度需为 6-20 个字符");
    if (regPassword !== regConfirm) return toast.error("两次输入的密码不一致");
    setLoading(true);
    try {
      await emailRegister({
        username: regUsername.trim(),
        email: regEmail,
        code: regCode,
        password: regPassword,
        confirmPassword: regConfirm,
      });
      setLoginEmail(regEmail);
      setLoginPassword("");
      setRegCode("");
      setRegPassword("");
      setRegConfirm("");
      switchMode("email-login");
      toast.success("注册成功，请登录");
    } catch (err) {
      fail(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSendPhoneCode = async (): Promise<boolean> => {
    if (!PHONE_RE.test(phone)) {
      toast.error("请输入正确的手机号后再获取验证码");
      return false;
    }
    try {
      await sendPhoneCode(phone);
      toast.success("验证码已发送，5 分钟内有效");
      return true;
    } catch (err) {
      fail(err);
      return false;
    }
  };

  const handlePhoneLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!PHONE_RE.test(phone)) return toast.error("手机号格式不正确");
    if (!CODE_RE.test(phoneCode)) return toast.error("验证码为 6 位数字");
    setLoading(true);
    try {
      const login = await phoneLogin(phone, phoneCode);
      saveLoginState(login);
      setUser(login.user);
      toast.success("登录成功");
      clearHash();
    } catch (err) {
      fail(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSendForgotCode = async (): Promise<boolean> => {
    if (forgotType === "email" && !EMAIL_RE.test(forgotContact)) {
      toast.error("请输入正确的邮箱后再获取验证码");
      return false;
    }
    if (forgotType === "phone" && !PHONE_RE.test(forgotContact)) {
      toast.error("请输入正确的手机号后再获取验证码");
      return false;
    }
    try {
      await sendResetCode(
        forgotType === "email" ? { email: forgotContact } : { phone: forgotContact }
      );
      toast.success("验证码已发送，5 分钟内有效");
      return true;
    } catch (err) {
      fail(err);
      return false;
    }
  };

  const handleForgotReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (forgotType === "email" && !EMAIL_RE.test(forgotContact))
      return toast.error("邮箱格式不正确");
    if (forgotType === "phone" && !PHONE_RE.test(forgotContact))
      return toast.error("手机号格式不正确");
    if (!CODE_RE.test(forgotCode)) return toast.error("验证码为 6 位数字");
    if (forgotPassword.length < 6 || forgotPassword.length > 20)
      return toast.error("密码长度需为 6-20 个字符");
    if (forgotPassword !== forgotConfirm) return toast.error("两次输入的密码不一致");
    setLoading(true);
    try {
      await resetPassword({
        ...(forgotType === "email" ? { email: forgotContact } : { phone: forgotContact }),
        code: forgotCode,
        password: forgotPassword,
        confirmPassword: forgotConfirm,
      });
      setLoginEmail(forgotType === "email" ? forgotContact : "");
      setLoginPassword("");
      setForgotCode("");
      setForgotPassword("");
      setForgotConfirm("");
      switchMode("email-login");
      toast.success("密码重置成功，请使用新密码登录");
    } catch (err) {
      fail(err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch {
      // 本地登出不受服务端失败影响
    }
    clearLoginState();
    setUser(null);
    setEditing(false);
    setLoginPassword("");
    setPhoneCode("");
    toast.info("已退出登录");
  };

  const emailChanged =
    profileEmail.trim() !== "" && profileEmail.trim() !== (user?.email ?? "");
  const phoneChanged =
    profilePhone.trim() !== "" && profilePhone.trim() !== (user?.phone ?? "");

  const enterEdit = () => {
    if (!user) return;
    setProfileAvatar(user.avatar ?? "");
    setProfileUsername(user.username);
    setProfileEmail(user.email ?? "");
    setProfileEmailCode("");
    setProfilePhone(user.phone ?? "");
    setProfilePhoneCode("");
    setEditing(true);
  };

  const handleSendProfileEmailCode = async (): Promise<boolean> => {
    if (!EMAIL_RE.test(profileEmail.trim())) {
      toast.error("请输入正确的新邮箱后再获取验证码");
      return false;
    }
    try {
      await sendBindEmailCode(profileEmail.trim());
      toast.success("验证码已发送，5 分钟内有效");
      return true;
    } catch (err) {
      fail(err);
      return false;
    }
  };

  const handleSendProfilePhoneCode = async (): Promise<boolean> => {
    if (!PHONE_RE.test(profilePhone.trim())) {
      toast.error("请输入正确的新手机号后再获取验证码");
      return false;
    }
    try {
      await sendBindPhoneCode(profilePhone.trim());
      toast.success("验证码已发送，5 分钟内有效");
      return true;
    } catch (err) {
      fail(err);
      return false;
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const username = profileUsername.trim();
    const email = profileEmail.trim();
    const phone = profilePhone.trim();
    if (username.length < 2 || username.length > 30)
      return toast.error("用户名长度需为 2-30 个字符");
    if (email && !EMAIL_RE.test(email)) return toast.error("邮箱格式不正确");
    if (phone && !PHONE_RE.test(phone)) return toast.error("手机号格式不正确");
    if (emailChanged && !CODE_RE.test(profileEmailCode))
      return toast.error("请输入新邮箱的 6 位验证码");
    if (phoneChanged && !CODE_RE.test(profilePhoneCode))
      return toast.error("请输入新手机号的 6 位验证码");
    setSavingProfile(true);
    try {
      const updated = await updateProfile({
        username,
        email,
        phone,
        avatar: profileAvatar.trim(),
        ...(emailChanged ? { emailCode: profileEmailCode } : {}),
        ...(phoneChanged ? { phoneCode: profilePhoneCode } : {}),
      });
      setUser(updated);
      updateStoredUser(updated);
      setEditing(false);
      toast.success("资料已保存");
    } catch (err) {
      fail(err);
    } finally {
      setSavingProfile(false);
    }
  };

  const inputClass = "h-4 w-4 text-neutral-600 dark:text-neutral-300";

  const open = usePanelOpen("#login");

  return (
    <PanelReveal open={open}>
      <div className="pointer-events-auto fixed bottom-6 left-6 right-24 top-24 z-10 flex items-center justify-center">
      <section
        className={cn(
          "flex w-full flex-col overflow-hidden rounded-2xl border border-neutral-900/15 dark:border-white/15 bg-white/20 dark:bg-white/5 shadow-sm",
          user ? "max-w-3xl" : "max-w-md"
        )}
      >
        <div className="flex items-center justify-between border-b border-neutral-900/10 dark:border-white/10 px-6 py-4">
          <div className="flex items-center gap-2 text-neutral-900 dark:text-neutral-100">
            <span className="text-sm font-semibold">
              {user ? (editing ? "编辑资料" : "个人中心") : mode === "email-register" ? "注册账号" : mode === "forgot-password" ? "找回密码" : "登录账号"}
            </span>
          </div>
          <button
            onClick={mode === "forgot-password" ? () => switchMode("email-login") : clearHash}
            aria-label="关闭"
            className="rounded-full p-1.5 text-neutral-500 dark:text-neutral-400 transition-colors hover:bg-neutral-900/5 dark:hover:bg-white/10 hover:text-neutral-900 dark:hover:text-neutral-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-6 py-5">
          {!checked ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-neutral-500 dark:text-neutral-400">
              <Loader2 className="h-4 w-4 animate-spin" />
              正在检查登录状态…
            </div>
          ) : user ? (
            <div className="grid max-h-[65vh] grid-cols-2 gap-6 overflow-y-auto py-2">
              <div className="flex flex-col gap-4">
              {editing ? (
                <form onSubmit={handleUpdateProfile} className="flex flex-col gap-3">
                <Field
                  label="头像链接"
                  placeholder="https://example.com/avatar.png"
                  value={profileAvatar}
                  onChange={(e) => setProfileAvatar(e.target.value)}
                />
                <Field
                  label="用户名"
                  placeholder="2-30 个字符"
                  value={profileUsername}
                  onChange={(e) => setProfileUsername(e.target.value)}
                />
                <Field
                  label="邮箱"
                  type="email"
                  placeholder="you@example.com"
                  value={profileEmail}
                  onChange={(e) => setProfileEmail(e.target.value)}
                />
                {emailChanged && (
                  <div>
                    <span className="mb-1 block text-xs text-neutral-500 dark:text-neutral-400">
                      邮箱验证码（已发送至新邮箱）
                    </span>
                    <div className="flex gap-2">
                      <input
                        value={profileEmailCode}
                        onChange={(e) => setProfileEmailCode(e.target.value)}
                        placeholder="6 位数字"
                        maxLength={6}
                        className="w-full rounded-lg border border-neutral-900/15 dark:border-white/15 bg-white/60 dark:bg-neutral-800/60 px-3 py-2 text-sm text-neutral-900 dark:text-neutral-100 outline-none transition-colors placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:border-neutral-900 dark:focus:border-white"
                      />
                      <SendCodeButton onSend={handleSendProfileEmailCode} disabled={savingProfile} />
                    </div>
                  </div>
                )}
                <Field
                  label="手机号"
                  type="tel"
                  placeholder="11 位手机号"
                  value={profilePhone}
                  onChange={(e) => setProfilePhone(e.target.value)}
                />
                {phoneChanged && (
                  <div>
                    <span className="mb-1 block text-xs text-neutral-500 dark:text-neutral-400">
                      手机验证码（已发送至新手机号）
                    </span>
                    <div className="flex gap-2">
                      <input
                        value={profilePhoneCode}
                        onChange={(e) => setProfilePhoneCode(e.target.value)}
                        placeholder="6 位数字"
                        maxLength={6}
                        className="w-full rounded-lg border border-neutral-900/15 dark:border-white/15 bg-white/60 dark:bg-neutral-800/60 px-3 py-2 text-sm text-neutral-900 dark:text-neutral-100 outline-none transition-colors placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:border-neutral-900 dark:focus:border-white"
                      />
                      <SendCodeButton onSend={handleSendProfilePhoneCode} disabled={savingProfile} />
                    </div>
                  </div>
                )}
                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setEditing(false)}
                      className="shrink-0 rounded-lg border border-neutral-900/15 dark:border-white/15 bg-white/60 dark:bg-neutral-800/60 px-4 py-2.5 text-sm text-neutral-700 dark:text-neutral-300 transition-colors hover:border-neutral-900 dark:hover:border-white"
                    >
                      返回
                    </button>
                    <div className="flex-1">
                      <SubmitButton loading={savingProfile}>保存修改</SubmitButton>
                    </div>
                  </div>
                </form>
              ) : (
                <>
                  <div className="flex flex-col items-center gap-3">
                    {user.avatar ? (
                      <img
                        src={user.avatar}
                        alt="头像"
                        className="h-16 w-16 rounded-full object-cover"
                      />
                    ) : (
                      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-neutral-900/10 dark:bg-white/10 text-xl font-medium text-neutral-700 dark:text-neutral-300">
                        {(user.nickname || user.username).slice(0, 1)}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col divide-y divide-neutral-900/10 dark:divide-white/10 rounded-lg border border-neutral-900/10 dark:border-white/10 bg-white/40 dark:bg-neutral-800/40 text-sm">
                    <div className="flex items-center justify-between px-3 py-2">
                      <span className="text-neutral-500 dark:text-neutral-400">用户名</span>
                      <span className="text-neutral-900 dark:text-neutral-100">{user.username}</span>
                    </div>
                    <div className="flex items-center justify-between px-3 py-2">
                      <span className="text-neutral-500 dark:text-neutral-400">邮箱</span>
                      <span className="text-neutral-900 dark:text-neutral-100">{user.email || "未绑定"}</span>
                    </div>
                    <div className="flex items-center justify-between px-3 py-2">
                      <span className="text-neutral-500 dark:text-neutral-400">手机号</span>
                      <span className="text-neutral-900 dark:text-neutral-100">{user.phone || "未绑定"}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={enterEdit}
                      className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-neutral-900 dark:bg-neutral-50 px-4 py-2 text-sm font-medium text-neutral-50 dark:text-neutral-900 transition-opacity"
                    >
                      <Pencil className="h-4 w-4" />
                      编辑资料
                    </button>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-neutral-900/15 dark:border-white/15 bg-white/60 dark:bg-neutral-800/60 px-4 py-2 text-sm text-neutral-700 dark:text-neutral-300 transition-colors hover:border-neutral-900 dark:hover:border-white"
                    >
                      <LogOut className="h-4 w-4" />
                      退出登录
                    </button>
                  </div>
                </>
              )}
              </div>
              <div className="flex flex-col gap-4 border-l border-neutral-900/10 dark:border-white/10 pl-6">
                <MailAccountConfig />
              </div>
            </div>
          ) : (
            <>
              {mode !== "email-register" && mode !== "forgot-password" && (
                <div className="mb-5 flex rounded-lg border border-neutral-900/10 dark:border-white/10 bg-neutral-900/5 dark:bg-white/5 p-1">
                  {MODE_TABS.map((tab) => (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => switchMode(tab.key)}
                      className={cn(
                        "flex-1 rounded-md py-1.5 text-xs transition-colors",
                        mode === tab.key
                          ? "bg-white text-neutral-900 shadow-sm dark:bg-neutral-50 dark:text-neutral-900"
                          : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-50"
                      )}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              )}

              {mode === "email-login" && (
                <form onSubmit={handleEmailLogin} className="flex flex-col gap-3">
                  <Field
                    label="邮箱"
                    type="email"
                    placeholder="you@example.com"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                  />
                  <Field
                    label="密码"
                    type="password"
                    placeholder="请输入密码"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                  />
                  <div className="-mt-1 flex justify-end">
                    <button
                      type="button"
                      onClick={() => switchMode("forgot-password")}
                      className="text-xs text-neutral-500 dark:text-neutral-400 underline underline-offset-2 transition-opacity hover:text-neutral-900 dark:hover:text-neutral-50 hover:opacity-60"
                    >
                      忘记密码？
                    </button>
                  </div>
                  <div className="pt-1">
                    <SubmitButton loading={loading}>登录</SubmitButton>
                  </div>
                </form>
              )}

              {mode === "email-register" && (
                <form onSubmit={handleEmailRegister} className="flex flex-col gap-3">
                  <Field
                    label="用户名"
                    placeholder="2-30 个字符"
                    value={regUsername}
                    onChange={(e) => setRegUsername(e.target.value)}
                  />
                  <Field
                    label="邮箱"
                    type="email"
                    placeholder="you@example.com"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                  />
                  <div>
                    <span className="mb-1 block text-xs text-neutral-500 dark:text-neutral-400">邮箱验证码</span>
                    <div className="flex gap-2">
                      <input
                        value={regCode}
                        onChange={(e) => setRegCode(e.target.value)}
                        placeholder="6 位数字"
                        maxLength={6}
                        className="w-full rounded-lg border border-neutral-900/15 dark:border-white/15 bg-white/60 dark:bg-neutral-800/60 px-3 py-2 text-sm text-neutral-900 dark:text-neutral-100 outline-none transition-colors placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:border-neutral-900 dark:focus:border-white"
                      />
                      <SendCodeButton onSend={handleSendEmailCode} disabled={loading} />
                    </div>
                  </div>
                  <Field
                    label="密码"
                    type="password"
                    placeholder="6-20 个字符"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                  />
                  <Field
                    label="确认密码"
                    type="password"
                    placeholder="再次输入密码"
                    value={regConfirm}
                    onChange={(e) => setRegConfirm(e.target.value)}
                  />
                  <div className="pt-1">
                    <SubmitButton loading={loading}>注册</SubmitButton>
                  </div>
                </form>
              )}

              {mode === "phone-login" && (
                <form onSubmit={handlePhoneLogin} className="flex flex-col gap-3">
                  <div>
                    <span className="mb-1 block text-xs text-neutral-500 dark:text-neutral-400">
                      手机号
                    </span>
                    <input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="11 位手机号"
                      maxLength={11}
                      className="w-full rounded-lg border border-neutral-900/15 dark:border-white/15 bg-white/60 dark:bg-neutral-800/60 px-3 py-2 text-sm text-neutral-900 dark:text-neutral-100 outline-none transition-colors placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:border-neutral-900 dark:focus:border-white"
                    />
                  </div>
                  <div>
                    <span className="mb-1 block text-xs text-neutral-500 dark:text-neutral-400">短信验证码</span>
                    <div className="flex gap-2">
                      <input
                        value={phoneCode}
                        onChange={(e) => setPhoneCode(e.target.value)}
                        placeholder="6 位数字"
                        maxLength={6}
                        className="w-full rounded-lg border border-neutral-900/15 dark:border-white/15 bg-white/60 dark:bg-neutral-800/60 px-3 py-2 text-sm text-neutral-900 dark:text-neutral-100 outline-none transition-colors placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:border-neutral-900 dark:focus:border-white"
                      />
                      <SendCodeButton onSend={handleSendPhoneCode} disabled={loading} />
                    </div>
                  </div>
                  <div className="pt-1">
                    <SubmitButton loading={loading}>登录</SubmitButton>
                  </div>
                </form>
              )}

              {mode === "forgot-password" && (
                <form onSubmit={handleForgotReset} className="flex flex-col gap-3">
                  <div className="mb-1 flex rounded-lg border border-neutral-900/10 dark:border-white/10 bg-neutral-900/5 dark:bg-white/5 p-1">
                    {(
                      [
                        { key: "email", label: "邮箱找回" },
                        { key: "phone", label: "手机找回" },
                      ] as { key: ContactType; label: string }[]
                    ).map((tab) => (
                      <button
                        key={tab.key}
                        type="button"
                        onClick={() => setForgotType(tab.key)}
                        className={cn(
                          "flex-1 rounded-md py-1.5 text-xs transition-colors",
                          forgotType === tab.key
                            ? "bg-white text-neutral-900 shadow-sm dark:bg-neutral-50 dark:text-neutral-900"
                            : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-50"
                        )}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                  <Field
                    label={forgotType === "email" ? "邮箱" : "手机号"}
                    type={forgotType === "email" ? "email" : "tel"}
                    placeholder={forgotType === "email" ? "you@example.com" : "11 位手机号"}
                    value={forgotContact}
                    onChange={(e) => setForgotContact(e.target.value)}
                  />
                  <div>
                    <span className="mb-1 block text-xs text-neutral-500 dark:text-neutral-400">验证码</span>
                    <div className="flex gap-2">
                      <input
                        value={forgotCode}
                        onChange={(e) => setForgotCode(e.target.value)}
                        placeholder="6 位数字"
                        maxLength={6}
                        className="w-full rounded-lg border border-neutral-900/15 dark:border-white/15 bg-white/60 dark:bg-neutral-800/60 px-3 py-2 text-sm text-neutral-900 dark:text-neutral-100 outline-none transition-colors placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:border-neutral-900 dark:focus:border-white"
                      />
                      <SendCodeButton onSend={handleSendForgotCode} disabled={loading} />
                    </div>
                  </div>
                  <Field
                    label="新密码"
                    type="password"
                    placeholder="6-20 个字符"
                    value={forgotPassword}
                    onChange={(e) => setForgotPassword(e.target.value)}
                  />
                  <Field
                    label="确认密码"
                    type="password"
                    placeholder="再次输入密码"
                    value={forgotConfirm}
                    onChange={(e) => setForgotConfirm(e.target.value)}
                  />
                  <div className="pt-1">
                    <SubmitButton loading={loading}>重置密码</SubmitButton>
                  </div>
                </form>
              )}

              {mode !== "forgot-password" &&
                (mode === "email-login" || mode === "phone-login" ? (
                  <p className="mt-4 text-center text-xs text-neutral-500 dark:text-neutral-400">
                    还没账号？
                    <button
                      type="button"
                      onClick={() => switchMode("email-register")}
                      className="text-neutral-900 dark:text-neutral-100 underline underline-offset-2 transition-opacity hover:opacity-60"
                    >
                      赶快注册...
                    </button>
                  </p>
                ) : (
                  <p className="mt-4 text-center text-xs text-neutral-500 dark:text-neutral-400">
                    已有账号
                    <button
                      type="button"
                      onClick={() => switchMode("email-login")}
                      className="text-neutral-900 dark:text-neutral-100 underline underline-offset-2 transition-opacity hover:opacity-60"
                    >
                      返回登录
                    </button>
                  </p>
                ))}

              {(mode === "email-login" || mode === "phone-login") && (
                <p className="mt-4 flex items-center justify-center gap-1 text-xs text-neutral-400 dark:text-neutral-500">
                  <KeyRound className="h-3 w-3" />
                  登录即代表同意服务条款与隐私政策
                </p>
              )}
            </>
          )}
        </div>
      </section>
    </div>
    </PanelReveal>
  );
}

export const LoginPanel = memo(LoginPanelContent);
