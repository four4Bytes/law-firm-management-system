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

/**
 * Escapes HTML special characters to their entity equivalents.
 *
 * @param str - The string to escape.
 * @returns The escaped string safe for HTML interpolation.
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
 * Resolves a relative or absolute URL to a fully qualified URL.
 *
 * Prepends the APP_ORIGIN environment variable to relative paths.
 * Passes through http/https URLs unchanged. Returns null for unhandled
 * formats such as protocol-relative or mailto URLs.
 *
 * @param url - The URL to resolve (relative `/path` or absolute `http(s)://`).
 * @returns The fully qualified URL string, or null if the format is unsupported.
 */
function resolveActionUrl(url: string): string | null {
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

/**
 * Wraps content in a full HTML email document with shared header and footer.
 *
 * The header displays the firm name; the footer contains the automated-notice
 * disclaimer. The caller provides a `title` for the email heading element and
 * the pre-built `body` HTML string (typically composed from other helpers).
 *
 * @param title - Heading text displayed below the firm header.
 * @param body  - Pre-rendered HTML content (paragraphs, buttons, etc.).
 * @returns A complete `<!DOCTYPE html>` document as a string.
 */
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

/**
 * Renders an HTML paragraph with auto-escaped content.
 *
 * This is the default paragraph helper. User-provided text is escaped before
 * insertion to prevent XSS in email clients. Pass pre-escaped content through
 * {@link rawText} instead.
 *
 * @param content - The text to display (will be HTML-escaped).
 * @param muted   - When true, applies muted/italic styling for secondary text.
 * @returns A `<p>` element as an HTML string.
 */
function text(content: string, muted?: boolean): string {
  return `<p style="${muted ? s.textMuted : s.text}">${escapeHtml(content)}</p>`;
}

/**
 * Renders an HTML paragraph from pre-escaped or raw HTML content.
 *
 * Unlike {@link text}, this helper does **not** escape its input. Use it only
 * when the content is already escaped (e.g., output from {@link strongLabel})
 * or intentionally contains HTML markup (e.g., the curly-quote entities in
 * {@link quoted}).
 *
 * @param content - Pre-escaped HTML or markup string (inserted as-is).
 * @param muted   - When true, applies muted/italic styling for secondary text.
 * @returns A `<p>` element as an HTML string.
 */
function rawText(content: string, muted?: boolean): string {
  return `<p style="${muted ? s.textMuted : s.text}">${content}</p>`;
}

/**
 * Builds a greeting paragraph ("Hi {name},").
 *
 * Delegates to {@link text} for escaping and paragraph wrapping.
 *
 * @param name - The recipient's display name (will be HTML-escaped).
 * @returns A `<p>` element prefixed with "Hi " and suffixed with ",".
 */
function greeting(name: string): string {
  return text(`Hi ${name},`);
}

/**
 * Wraps content in curly quotation marks within a muted paragraph.
 *
 * The content is escaped, then surrounded by `&ldquo;` and `&rdquo;` entities.
 * The result is rendered via {@link rawText} to avoid double-escaping the
 * quote entities.
 *
 * @param content - The text to quote (will be HTML-escaped).
 * @returns A muted `<p>` element with curly-quoted content.
 */
function quoted(content: string): string {
  return rawText(`&ldquo;${escapeHtml(content)}&rdquo;`, true);
}

/**
 * Wraps a label in a `<strong>` element with auto-escaped content.
 *
 * @param label - The text to embolden (will be HTML-escaped).
 * @returns A `<strong>` element as an HTML string.
 */
function strongLabel(label: string): string {
  return `<strong>${escapeHtml(label)}</strong>`;
}

/**
 * Renders an email-friendly action button as an HTML table.
 *
 * The URL is resolved through {@link resolveActionUrl}. If the URL format
 * is unsupported the button is silently omitted (returns empty string).
 * Both the URL and label are escaped before insertion.
 *
 * @param url   - Relative or absolute URL for the button link.
 * @param label - Visible button text.
 * @returns An HTML `<a>` wrapped in a `<table>`/`<tr>`/`<td>` structure,
 *          or an empty string if the URL cannot be resolved.
 */
function button(url: string, label: string): string {
  const resolvedUrl = resolveActionUrl(url);
  if (!resolvedUrl) return "";

  return `<table cellpadding="0" cellspacing="0" style="${s.buttonTable}"><tbody><tr><td style="${s.buttonCell}"><a href="${escapeHtml(resolvedUrl)}" style="${s.buttonLink}">${escapeHtml(label)}</a></td></tr></tbody></table>`;
}

// ── Templates ─────────────────────────────────────────────────────────────────

/**
 * Renders the email body for a consultation-reminder notification.
 *
 * @param ctx - Standard template context with recipient, actor, and message data.
 * @returns A complete HTML string (via {@link emailLayout}).
 */
export function consultationReminderTemplate(ctx: TemplateContext): string {
  return emailLayout(
    "Upcoming Consultation Reminder",
    greeting(ctx.toName) +
      text("This is a reminder that you have an upcoming consultation.") +
      quoted(ctx.message) +
      (ctx.actionUrl ? button(ctx.actionUrl, "View Consultation") : ""),
  );
}

/**
 * Renders the email body for a consultation-created notification.
 *
 * @param ctx - Standard template context with recipient, actor, and message data.
 * @returns A complete HTML string (via {@link emailLayout}).
 */
export function consultationCreatedTemplate(ctx: TemplateContext): string {
  return emailLayout(
    "New Consultation Scheduled",
    greeting(ctx.toName) +
      text(`${ctx.actorName} has scheduled a new consultation.`) +
      quoted(ctx.message) +
      (ctx.actionUrl ? button(ctx.actionUrl, "View Consultation") : ""),
  );
}

/**
 * Renders the email body for a consultation-updated notification.
 *
 * @param ctx - Standard template context with recipient, actor, and message data.
 * @returns A complete HTML string (via {@link emailLayout}).
 */
export function consultationUpdatedTemplate(ctx: TemplateContext): string {
  return emailLayout(
    "Consultation Updated",
    greeting(ctx.toName) +
      text("A consultation has been updated.") +
      text(ctx.message, true) +
      (ctx.actionUrl ? button(ctx.actionUrl, "View Consultation") : ""),
  );
}

/**
 * Renders the email body for a milestone notification.
 *
 * @param ctx - Standard template context with recipient, actor, and message data.
 * @returns A complete HTML string (via {@link emailLayout}).
 */
export function milestoneTemplate(ctx: TemplateContext): string {
  return emailLayout(
    ctx.title,
    greeting(ctx.toName) +
      text(ctx.message) +
      (ctx.actionUrl ? button(ctx.actionUrl, "View Case") : ""),
  );
}

/**
 * Renders the email body for a task-assigned notification.
 *
 * @param ctx - Standard template context with recipient, actor, and message data.
 * @returns A complete HTML string (via {@link emailLayout}).
 */
export function taskAssignedTemplate(ctx: TemplateContext): string {
  return emailLayout(
    "Task Assigned",
    greeting(ctx.toName) +
      rawText(`${escapeHtml(ctx.actorName)} has assigned you a task: ${strongLabel(ctx.title)}.`) +
      text(ctx.message, true) +
      (ctx.actionUrl ? button(ctx.actionUrl, "View Task") : ""),
  );
}

/**
 * Renders the email body for a task-updated notification.
 *
 * @param ctx - Standard template context with recipient, actor, and message data.
 * @returns A complete HTML string (via {@link emailLayout}).
 */
export function taskUpdatedTemplate(ctx: TemplateContext): string {
  return emailLayout(
    "Task Updated",
    greeting(ctx.toName) +
      rawText(`A task has been updated: ${strongLabel(ctx.title)}.`) +
      text(ctx.message, true) +
      (ctx.actionUrl ? button(ctx.actionUrl, "View Task") : ""),
  );
}

/**
 * Renders the email body for a case-assigned notification.
 *
 * @param ctx - Standard template context with recipient, actor, and message data.
 * @returns A complete HTML string (via {@link emailLayout}).
 */
export function caseAssignedTemplate(ctx: TemplateContext): string {
  return emailLayout(
    "New Case Created",
    greeting(ctx.toName) +
      rawText(`${escapeHtml(ctx.actorName)} created a new case: ${strongLabel(ctx.title)}.`) +
      text(ctx.message, true) +
      (ctx.actionUrl ? button(ctx.actionUrl, "View Case") : ""),
  );
}
