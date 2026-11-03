import { request } from "@/lib/axios";

export interface MailAccount {
  id: number;
  email: string;
  imapHost: string | null;
  imapPort: number | null;
  sslEnable: boolean | null;
}

export interface MailAccountParams {
  email: string;
  authCode: string;
  imapHost?: string;
  imapPort?: number;
  sslEnable?: boolean;
}

export interface MailMessage {
  messageUid: string;
  fromAddress: string | null;
  fromName: string | null;
  subject: string | null;
  contentText: string | null;
  contentHtml: string | null;
  receiveTime: string | null;
  isRead: boolean;
  hasAttachment: boolean;
}

export function getMailAccount() {
  return request<MailAccount | null>({ method: "GET", url: "/api/mails/account" });
}

export function saveMailAccount(params: MailAccountParams) {
  return request<void>({ method: "POST", url: "/api/mails/account", data: params });
}

export function listMails(signal?: AbortSignal) {
  return request<MailMessage[]>({ method: "GET", url: "/api/mails", signal });
}

export function getMailDetail(messageUid: string, signal?: AbortSignal) {
  return request<MailMessage>({ method: "GET", url: `/api/mails/${messageUid}`, signal });
}

export function markMailRead(messageUid: string) {
  return request<void>({ method: "POST", url: `/api/mails/${messageUid}/read` });
}
