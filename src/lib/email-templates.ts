/**
 * Plain-HTML email template functions for notification types.
 *
 * Each template accepts a {@link TemplateContext} and returns a full HTML
 * document wrapped in the shared {@link emailLayout}. Avoids React rendering
 * on the server (Turbopack blocks `react-dom/server`).
 */

import { getRequiredEnvVar } from "@/lib/env";

interface TemplateContext {
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

/**
 * HTML-escapes a plain-text string for safe interpolation into HTML
 * elements and attribute values.
 *
 * @param str - The raw string to escape.
 * @returns The escaped string safe for HTML insertion.
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Resolves a notification action URL to an absolute link for email CTAs.
 *
 * - Relative paths (starting with `/`) are prefixed with the configured app origin.
 * - Already-absolute HTTPS/HTTP URLs are passed through as-is.
 * - Anything else is treated as invalid and returns `null` (no button rendered).
 *
 * @param url - The raw action URL from the notification payload.
 * @returns The resolved absolute URL, or `null` if the URL is not usable.
 */
function resolveActionUrl(url: string): string | null {
  if (url.startsWith("/")) {
    const origin = getRequiredEnvVar("APP_ORIGIN").replace(/\/+$/, "");
    return `${origin}${url}`;
  }
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }
  return null;
}

/**
 * Wraps body content in the firm's branded email layout.
 *
 * @param title - The page-level heading shown inside the email body.
 * @param body - Inner HTML content.
 * @returns A complete HTML document string.
 */
function emailLayout(title: string, body: string): string {
  const safeTitle = escapeHtml(title);
  return `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background-color:#f4f4f4;font-family:Arial,Helvetica,sans-serif">
<div style="max-width:600px;margin:0 auto;background-color:#ffffff">
<div style="padding:24px 32px;background-color:#1a3a5c">
<h1 style="color:#ffffff;font-size:20px;margin:0">Anino Law &amp; Real Estate Firm</h1>
</div>
<div style="padding:32px">
<h2 style="color:#1a3a5c;font-size:18px;margin:0 0 16px">${safeTitle}</h2>
${body}
</div>
<div style="padding:16px 32px;background-color:#f4f4f4;color:#666666;font-size:12px;text-align:center">
<p style="margin:0">This is an automated notification from Anino Law &amp; Real Estate Firm. Please do not reply directly to this email.</p>
</div>
</div>
</body>
</html>`;
}

/**
 * Renders a call-to-action button linking to a resource.
 *
 * @param url - The target URL.
 * @param label - Button label text.
 * @returns An HTML table string styled as a button.
 */
function button(url: string, label: string): string {
  const resolvedUrl = resolveActionUrl(url);
  if (!resolvedUrl) return "";
  const safeUrl = escapeHtml(resolvedUrl);
  const safeLabel = escapeHtml(label);
  return `<table cellpadding="0" cellspacing="0" style="margin:24px 0"><tr><td style="background-color:#1a3a5c;border-radius:4px"><a href="${safeUrl}" style="display:inline-block;padding:12px 24px;color:#ffffff;text-decoration:none;font-size:14px">${safeLabel}</a></td></tr></table>`;
}

/**
 * Email template for consultation reminders with upcoming-consultation heading.
 *
 * @param ctx - Template context.
 * @returns A complete HTML email string.
 */
export function consultationReminderTemplate(ctx: TemplateContext): string {
  const body = `
<p style="color:#333333;line-height:1.6;margin:0 0 12px">Hi ${escapeHtml(ctx.toName)},</p>
<p style="color:#333333;line-height:1.6;margin:0 0 12px">This is a reminder that you have an upcoming consultation.</p>
<p style="color:#555555;line-height:1.6;margin:0 0 12px;font-style:italic">&ldquo;${escapeHtml(ctx.message)}&rdquo;</p>
${ctx.actionUrl ? button(ctx.actionUrl, "View Consultation") : ""}`.trim();

  return emailLayout("Upcoming Consultation Reminder", body);
}

/**
 * Email template for when a consultation is created.
 *
 * @param ctx - Template context.
 * @returns A complete HTML email string.
 */
export function consultationCreatedTemplate(ctx: TemplateContext): string {
  const body = `
<p style="color:#333333;line-height:1.6;margin:0 0 12px">Hi ${escapeHtml(ctx.toName)},</p>
<p style="color:#333333;line-height:1.6;margin:0 0 12px">${escapeHtml(ctx.actorName)} has scheduled a new consultation.</p>
<p style="color:#555555;line-height:1.6;margin:0 0 12px;font-style:italic">&ldquo;${escapeHtml(ctx.message)}&rdquo;</p>
${ctx.actionUrl ? button(ctx.actionUrl, "View Consultation") : ""}`.trim();

  return emailLayout("New Consultation Scheduled", body);
}

/**
 * Email template for when a consultation is updated.
 *
 * @param ctx - Template context.
 * @returns A complete HTML email string.
 */
export function consultationUpdatedTemplate(ctx: TemplateContext): string {
  const body = `
<p style="color:#333333;line-height:1.6;margin:0 0 12px">Hi ${escapeHtml(ctx.toName)},</p>
<p style="color:#333333;line-height:1.6;margin:0 0 12px">A consultation has been updated.</p>
<p style="color:#555555;line-height:1.6;margin:0 0 12px">${escapeHtml(ctx.message)}</p>
${ctx.actionUrl ? button(ctx.actionUrl, "View Consultation") : ""}`.trim();

  return emailLayout("Consultation Updated", body);
}

/**
 * Email template for milestone notifications (created, due-soon, completed).
 *
 * @param ctx - Template context.
 * @returns A complete HTML email string.
 */
export function milestoneTemplate(ctx: TemplateContext): string {
  const body = `
<p style="color:#333333;line-height:1.6;margin:0 0 12px">Hi ${escapeHtml(ctx.toName)},</p>
<p style="color:#333333;line-height:1.6;margin:0 0 12px">${escapeHtml(ctx.message)}</p>
${ctx.actionUrl ? button(ctx.actionUrl, "View Case") : ""}`.trim();

  return emailLayout(ctx.title, body);
}

/**
 * Email template for when a task is assigned to a user.
 *
 * @param ctx - Template context.
 * @returns A complete HTML email string.
 */
export function taskAssignedTemplate(ctx: TemplateContext): string {
  const body = `
<p style="color:#333333;line-height:1.6;margin:0 0 12px">Hi ${escapeHtml(ctx.toName)},</p>
<p style="color:#333333;line-height:1.6;margin:0 0 12px">${escapeHtml(ctx.actorName)} has assigned you a task: <strong>${escapeHtml(ctx.title)}</strong>.</p>
<p style="color:#555555;line-height:1.6;margin:0 0 12px">${escapeHtml(ctx.message)}</p>
${ctx.actionUrl ? button(ctx.actionUrl, "View Task") : ""}`.trim();

  return emailLayout("Task Assigned", body);
}

/**
 * Email template for when a task's status or details are updated.
 *
 * @param ctx - Template context.
 * @returns A complete HTML email string.
 */
export function taskUpdatedTemplate(ctx: TemplateContext): string {
  const body = `
<p style="color:#333333;line-height:1.6;margin:0 0 12px">Hi ${escapeHtml(ctx.toName)},</p>
<p style="color:#333333;line-height:1.6;margin:0 0 12px">A task has been updated: <strong>${escapeHtml(ctx.title)}</strong>.</p>
<p style="color:#555555;line-height:1.6;margin:0 0 12px">${escapeHtml(ctx.message)}</p>
${ctx.actionUrl ? button(ctx.actionUrl, "View Task") : ""}`.trim();

  return emailLayout("Task Updated", body);
}

/**
 * Email template for when a new case is created.
 *
 * @param ctx - Template context.
 * @returns A complete HTML email string.
 */
export function caseAssignedTemplate(ctx: TemplateContext): string {
  const body = `
<p style="color:#333333;line-height:1.6;margin:0 0 12px">Hi ${escapeHtml(ctx.toName)},</p>
<p style="color:#333333;line-height:1.6;margin:0 0 12px">${escapeHtml(ctx.actorName)} created a new case: <strong>${escapeHtml(ctx.title)}</strong>.</p>
<p style="color:#555555;line-height:1.6;margin:0 0 12px">${escapeHtml(ctx.message)}</p>
${ctx.actionUrl ? button(ctx.actionUrl, "View Case") : ""}`.trim();

  return emailLayout("New Case Created", body);
}
