# Dates & Timezones — Specification

## 1. The rule

**No module may read a `Date`'s fields implicitly.** `getFullYear()`, `getMonth()`, `getDate()`, `getHours()`, `getMinutes()`, `getDay()`, `getTimezoneOffset()`, and `getLocalTimeZone()` are banned outside `src/lib/primitives/date.ts`; every zone-sensitive operation goes through a helper there.

This is enforced by a test, not by convention: `src/lib/primitives/__tests__/date-encapsulation.test.ts` fails the build if any of them appears in `src/`.

**One deliberate exception:** `getAppTimeZone()` stays importable, because a few external APIs demand an explicit zone rather than a `Date` — `node-cron`'s `timezone` option in `src/instrumentation.ts`, and `@internationalized/date`'s `CalendarDate.toDate(zone)`. Those call sites pass the zone through to something that would otherwise guess. What is forbidden is _deriving_ a zone implicitly; naming it is fine.

## 2. Why

JavaScript's `Date` is an instant, but its field readers (`getFullYear()`, `getMonth()`, `getDate()`, `getHours()`, `getMinutes()`, `getDay()`, `getTimezoneOffset()`) project that instant into **the runtime's** timezone — not the app's. That runtime differs by context:

| Context                           | Runtime zone               |
| --------------------------------- | -------------------------- |
| Client component / Server Action  | the user's browser         |
| Server Component, cron, on Vercel | the host, normally **UTC** |

The app timezone is `APP_TIMEZONE` (default `Asia/Manila`), surfaced to the browser by `next.config.ts`, which re-exposes it as `NEXT_PUBLIC_APP_TIMEZONE` through the `env` key so both sides resolve the same value. Without that bridge the two would disagree whenever the value is not the hardcoded default.

## 3. The two failure modes

**Round-trip drift.** Reading a stored instant with a local reader and writing it back with `combineDateTime` (app zone) shifts it by the offset between the two. A `00:00` due date lands on the _previous calendar day_ for any browser outside the app zone, and the record is rewritten on an unedited save — which also fires notifications and re-arms reminders.

**Asymmetric ranges.** Pairing a zone-correct lower bound with a server-local upper bound:

```ts
const startOfDay = getStartOfDay(now); // app zone
const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1); // server local
```

widens the window by exactly the offset. On a UTC host against `Asia/Manila` this made "today's consultations" run 8 hours long and count tomorrow's morning bookings. Use `getStartOfDay` **and** `getEndOfDay` together.

## 4. The helpers

| Need                               | Use                                                      | Not                               |
| ---------------------------------- | -------------------------------------------------------- | --------------------------------- |
| Read an instant as the app sees it | `toCalendarDate`, `toTimeValue`                          | `d.getFullYear()`                 |
| Build an instant from picker input | `combineDateTime` (with time), `toDateValue` (date only) | `date.toDate(getLocalTimeZone())` |
| "Today" in the app zone            | `getToday()`                                             | `today(getLocalTimeZone())`       |
| A calendar-day range               | `getStartOfDay` / `getEndOfDay`                          | `new Date(y, m, d + 1)`           |
| Compare calendar days              | `isBeforeToday`, `isAfterToday`                          | comparing `toDateString()`        |
| Display                            | `formatDate`, `formatDateTime`                           | `d.toLocaleDateString()`          |
| Ignore sub-minute drift            | `toMinuteEpoch` on **both** sides of a comparison        | `getTime()`                       |
| Hand a zone to an external API     | `getAppTimeZone()`                                       | assuming the runtime's zone       |

`combineDateTime` and `toDateValue` are inverses of each other in the same zone. Keeping them in step matters: a picker that reads via one and writes via the other reintroduces drift.

## 5. Client and server must agree on "changed"

Pickers only capture hour and minute, so any comparison of a stored timestamp against picker output must floor both sides with `toMinuteEpoch`. Comparing exact milliseconds makes a stored value carrying seconds read as edited, which turns a no-op save into a real write plus notifications. Both the modal and the Server Action must use the same precision — a client that floors while the server does not will show "no change" and then write anyway.

## 6. Testing

`process.env.TZ` is **not** honoured reliably inside the vitest worker, so a test cannot simulate a foreign browser zone. Assert against `Intl` in the app timezone instead (as `src/lib/__tests__/date.test.ts` does) rather than mutating the ambient zone. Vercel crons are specified in **UTC**, so an app-timezone schedule must be converted: the reminders job uses `"0 16 * * *"`, which is 00:00 in Manila. `src/instrumentation.ts` schedules the same job with `node-cron` at `"0 0 * * *"` plus `timezone: getAppTimeZone()`, so the two deployments agree. Changing `APP_TIMEZONE` requires updating `vercel.json` as well — see [deployment.md](./deployment.md).
