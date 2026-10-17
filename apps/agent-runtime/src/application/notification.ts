import { randomUUID } from "node:crypto";
import { findPii } from "../workflow/guardrails";
import { ApplicationError } from "./errors";
import type { SqlQuery } from "./store";

export type NotificationRecipientRole = "candidate" | "employer" | "counselor";
export type NotificationChannel = "in_app";

/** Outbox row. Ids and roles only — never an email, phone, or cédula. */
export interface OutboundNotification {
  recipientRole: NotificationRecipientRole;
  channel: NotificationChannel;
  timestamp: string;
  traceId: string;
}

export interface NotificationPort {
  send(notification: OutboundNotification): Promise<void>;
}

export interface NotificationOutbox {
  append(notification: OutboundNotification): Promise<void>;
  list(traceId: string): Promise<readonly OutboundNotification[]>;
}

export const ENSURE_NOTIFICATION_OUTBOX_SQL = `CREATE TABLE IF NOT EXISTS notification_outbox (
  id text PRIMARY KEY,
  recipient_role text NOT NULL,
  channel text NOT NULL,
  notified_at timestamptz NOT NULL,
  trace_id text NOT NULL
)`;

const ROLES = new Set<NotificationRecipientRole>(["candidate", "employer", "counselor"]);

export function assertOutboundNotification(value: OutboundNotification): void {
  if (!ROLES.has(value.recipientRole) || value.channel !== "in_app") {
    throw new ApplicationError("Outbound notification is invalid.", 422, "invalid_input");
  }
  if (value.traceId.trim() === "" || value.timestamp.trim() === "") {
    throw new ApplicationError("Outbound notification traceId and timestamp are required.", 422, "invalid_input");
  }
  if (findPii(JSON.stringify(value))) {
    throw new ApplicationError("Outbound notification contains personal data.", 422, "invalid_input");
  }
}

export function createMemoryNotificationOutbox(): NotificationOutbox {
  const rows: OutboundNotification[] = [];
  return {
    async append(notification) {
      assertOutboundNotification(notification);
      rows.push({ ...notification });
    },
    async list(traceId) {
      return rows.filter((row) => row.traceId === traceId).map((row) => ({ ...row }));
    },
  };
}

/** Default sender. Records nothing itself and performs no network I/O. */
export function createMockNotificationPort(): NotificationPort {
  return {
    async send(notification) {
      assertOutboundNotification(notification);
    },
  };
}

export function createSqlNotificationOutbox(query: SqlQuery, ids: () => string = randomUUID): NotificationOutbox {
  let ready: Promise<void> | undefined;
  const ensure = () => {
    ready ??= query(ENSURE_NOTIFICATION_OUTBOX_SQL, []).then(() => undefined);
    return ready;
  };
  return {
    async append(notification) {
      assertOutboundNotification(notification);
      await ensure();
      await query(
        `INSERT INTO notification_outbox (id, recipient_role, channel, notified_at, trace_id)
         VALUES ($1, $2, $3, $4, $5)`,
        [ids(), notification.recipientRole, notification.channel, notification.timestamp, notification.traceId],
      );
    },
    async list(traceId) {
      await ensure();
      const result = await query(
        `SELECT recipient_role, channel, notified_at, trace_id
         FROM notification_outbox
         WHERE trace_id = $1
         ORDER BY notified_at ASC, id ASC`,
        [traceId],
      );
      return result.rows.map((row) => {
        const notification: OutboundNotification = {
          recipientRole: requiredRole(row.recipient_role),
          channel: requiredChannel(row.channel),
          timestamp: requiredTimestamp(row.notified_at),
          traceId: requiredText(row.trace_id),
        };
        assertOutboundNotification(notification);
        return notification;
      });
    },
  };
}

function requiredRole(value: unknown): NotificationRecipientRole {
  if (value === "candidate" || value === "employer" || value === "counselor") return value;
  throw new ApplicationError("Outbound notification is invalid.", 422, "invalid_input");
}

function requiredChannel(value: unknown): NotificationChannel {
  if (value === "in_app") return value;
  throw new ApplicationError("Outbound notification is invalid.", 422, "invalid_input");
}

function requiredText(value: unknown): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new ApplicationError("Outbound notification is invalid.", 422, "invalid_input");
  }
  return value;
}

function requiredTimestamp(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  return requiredText(value);
}
