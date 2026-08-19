/**
 * Minimal Gmail read client for Ulo.
 *
 * Reads the agent's own inbox only — the account the stored refresh
 * token belongs to. Family members forward school/daycare/medical senders there
 * with Gmail filters, so the agent sees family logistics mail and nothing else. Scope is
 * `gmail.readonly`: Ulo cannot send, archive, label, or delete anything.
 */

import { googleFetch } from "./googleAuth";

const API_BASE = "https://gmail.googleapis.com/gmail/v1";

interface GmailHeader {
  name: string;
  value: string;
}

interface GmailPart {
  mimeType?: string;
  filename?: string;
  headers?: GmailHeader[];
  body?: { size?: number; data?: string; attachmentId?: string };
  parts?: GmailPart[];
}

export interface GmailMessage {
  id: string;
  threadId: string;
  snippet?: string;
  internalDate?: string;
  labelIds?: string[];
  payload?: GmailPart;
}

export interface GmailListResponse {
  messages?: Array<{ id: string; threadId: string }>;
  resultSizeEstimate?: number;
}

/** Pull a header value case-insensitively. */
export function header(msg: GmailMessage, name: string): string | null {
  const found = msg.payload?.headers?.find(
    (h) => h.name.toLowerCase() === name.toLowerCase(),
  );
  return found?.value ?? null;
}

function decodeBase64Url(data: string): string {
  return Buffer.from(data.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
}

/** Crude HTML → text, for messages that ship no text/plain part. */
function htmlToText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<\/(p|div|tr|h[1-6])>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Walk the MIME tree for the body. Prefers text/plain; falls back to stripped
 * text/html. Attachments are ignored (we only note their filenames elsewhere).
 */
export function extractBody(msg: GmailMessage): string {
  let plain = "";
  let html = "";

  const walk = (part?: GmailPart) => {
    if (!part) return;
    const data = part.body?.data;
    if (data && !part.filename) {
      if (part.mimeType === "text/plain") plain ||= decodeBase64Url(data);
      else if (part.mimeType === "text/html") html ||= decodeBase64Url(data);
    }
    part.parts?.forEach(walk);
  };
  walk(msg.payload);

  const text = plain || (html ? htmlToText(html) : "");
  return text.replace(/\r\n/g, "\n").trim();
}

/** Attachment filenames on a message, so Ulo can mention "there's a PDF flyer". */
export function attachmentNames(msg: GmailMessage): string[] {
  const names: string[] = [];
  const walk = (part?: GmailPart) => {
    if (!part) return;
    if (part.filename) names.push(part.filename);
    part.parts?.forEach(walk);
  };
  walk(msg.payload);
  return names;
}

export async function listMessages(
  query: string,
  maxResults: number,
): Promise<GmailListResponse> {
  const params = new URLSearchParams({
    q: query,
    maxResults: String(maxResults),
  });
  return googleFetch<GmailListResponse>(API_BASE, `/users/me/messages?${params}`);
}

export async function getMessage(
  id: string,
  format: "full" | "metadata" = "full",
): Promise<GmailMessage> {
  const params = new URLSearchParams({ format });
  if (format === "metadata") {
    for (const h of ["From", "To", "Subject", "Date"]) {
      params.append("metadataHeaders", h);
    }
  }
  return googleFetch<GmailMessage>(API_BASE, `/users/me/messages/${encodeURIComponent(id)}?${params}`);
}

/** Human-readable sent time, in the family's timezone. */
export function receivedAt(msg: GmailMessage): string | null {
  if (!msg.internalDate) return header(msg, "Date");
  return new Date(Number(msg.internalDate)).toISOString();
}
