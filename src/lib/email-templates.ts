/**
 * Plain-HTML email template functions for notification types.
 *
 * Each exported template accepts a {@link TemplateContext} and returns a
 * complete HTML string. Styles are defined in the shared `s` object and
 * applied via inline style attributes — the only reliable approach for
 * email clients.
 */

import { getRequiredEnvVar } from "@/lib/env";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface TemplateContext {
  /** Display name of the recipient. */
  toName: string;
  /** Display name of the user who triggered the notification. */
  actorName: string;
  /** Notification title (used as fallback heading). */
  title: string;
  /** Notification body text. */
  message: string;
  /** Optional link to the relevant entity detail page. */
  actionUrl?: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function resolveActionUrl(url: string): string | null {
  /**
   * Resolves a relative or absolute URL to a fully qualified URL.
   *
   * Prepends the APP_ORIGIN environment variable to relative paths.
   * Passes through http/https URLs unchanged. Returns null for unhandled
   * formats such as protocol-relative or mailto URLs.
   *
   * @param url - The URL to resolve (relative `/path` or absolute `http(s)://`).
   * @returns The fully qualified URL string, or null if the format is unsupported.
   */
  if (url.startsWith("/")) {
    const origin = getRequiredEnvVar("APP_ORIGIN").replace(/\/+$/, "");
    return `${origin}${url}`;
  }
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return null;
}

// ── Stylesheet ────────────────────────────────────────────────────────────────

const s = {
  body: "margin:0;padding:40px 0;background-color:#f4f4f4;font-family:Arial,Helvetica,sans-serif",
  container: "max-width:600px;margin:0 auto;background-color:#ffffff",
  header: "padding:24px 32px;background-color:#1a3a5c",
  headerTitle: "color:#ffffff;font-size:20px;margin:0",
  bodyContent: "padding:48px 48px 64px",
  heading: "color:#1a3a5c;font-size:18px;margin:0 0 16px",
  footer:
    "padding:24px 48px;background-color:#f4f4f4;color:#666666;font-size:12px;text-align:center",
  footerText: "margin:0",
  text: "color:#333333;line-height:1.8;margin:0 0 20px",
  textMuted: "color:#555555;font-style:italic;line-height:1.8;margin:0 0 20px",
  buttonTable: "margin:24px 0",
  buttonCell: "background-color:#1a3a5c;border-radius:6px",
  buttonLink:
    "display:inline-block;padding:14px 32px;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600",
} as const;

// ── HTML Builders ─────────────────────────────────────────────────────────────

function emailLayout(title: string, body: string): string {
  return `<!DOCTYPE html>
<html>
<body style="${s.body}">
<div style="${s.container}">
<div style="${s.header}">
<h1 style="${s.headerTitle}">Anino Law &amp; Real Estate Firm</h1>
</div>
<div style="${s.bodyContent}">
<h2 style="${s.heading}">${escapeHtml(title)}</h2>
${body}
</div>
<div style="${s.footer}">
<p style="${s.footerText}">This is an automated notification from Anino Law &amp; Real Estate Firm. Please do not reply directly to this email.</p>
</div>
</div>
</body>
</html>`;
}

function text(content: string, muted?: boolean): string {
  return `<p style="${muted ? s.textMuted : s.text}">${escapeHtml(content)}</p>`;
}

function rawText(content: string, muted?: boolean): string {
  return `<p style="${muted ? s.textMuted : s.text}">${content}</p>`;
}

function greeting(name: string): string {
  return text(`Hi ${name},`);
}

function quoted(content: string): string {
  return rawText(`&ldquo;${escapeHtml(content)}&rdquo;`, true);
}

function strongLabel(label: string): string {
  return `<strong>${escapeHtml(label)}</strong>`;
}

function button(url: string, label: string): string {
  const resolvedUrl = resolveActionUrl(url);
  if (!resolvedUrl) return "";

  return `<table cellpadding="0" cellspacing="0" style="${s.buttonTable}"><tbody><tr><td style="${s.buttonCell}"><a href="${escapeHtml(resolvedUrl)}" style="${s.buttonLink}">${escapeHtml(label)}</a></td></tr></tbody></table>`;
}

// ── Templates ─────────────────────────────────────────────────────────────────

export function consultationReminderTemplate(ctx: TemplateContext): string {
  return emailLayout(
    "Upcoming Consultation Reminder",
    greeting(ctx.toName) +
      text("This is a reminder that you have an upcoming consultation.") +
      quoted(ctx.message) +
      (ctx.actionUrl ? button(ctx.actionUrl, "View Consultation") : ""),
  );
}

export function consultationCreatedTemplate(ctx: TemplateContext): string {
  return emailLayout(
    "New Consultation Scheduled",
    greeting(ctx.toName) +
      text(`${ctx.actorName} has scheduled a new consultation.`) +
      quoted(ctx.message) +
      (ctx.actionUrl ? button(ctx.actionUrl, "View Consultation") : ""),
  );
}

export function consultationUpdatedTemplate(ctx: TemplateContext): string {
  return emailLayout(
    "Consultation Updated",
    greeting(ctx.toName) +
      text("A consultation has been updated.") +
      text(ctx.message, true) +
      (ctx.actionUrl ? button(ctx.actionUrl, "View Consultation") : ""),
  );
}

export function milestoneTemplate(ctx: TemplateContext): string {
  return emailLayout(
    ctx.title,
    greeting(ctx.toName) +
      text(ctx.message) +
      (ctx.actionUrl ? button(ctx.actionUrl, "View Case") : ""),
  );
}

export function taskAssignedTemplate(ctx: TemplateContext): string {
  return emailLayout(
    "Task Assigned",
    greeting(ctx.toName) +
      rawText(`${escapeHtml(ctx.actorName)} has assigned you a task: ${strongLabel(ctx.title)}.`) +
      text(ctx.message, true) +
      (ctx.actionUrl ? button(ctx.actionUrl, "View Task") : ""),
  );
}

export function taskUpdatedTemplate(ctx: TemplateContext): string {
  return emailLayout(
    "Task Updated",
    greeting(ctx.toName) +
      rawText(`A task has been updated: ${strongLabel(ctx.title)}.`) +
      text(ctx.message, true) +
      (ctx.actionUrl ? button(ctx.actionUrl, "View Task") : ""),
  );
}

export function caseAssignedTemplate(ctx: TemplateContext): string {
  return emailLayout(
    "New Case Created",
    greeting(ctx.toName) +
      rawText(`${escapeHtml(ctx.actorName)} created a new case: ${strongLabel(ctx.title)}.`) +
      text(ctx.message, true) +
      (ctx.actionUrl ? button(ctx.actionUrl, "View Case") : ""),
  );
}
