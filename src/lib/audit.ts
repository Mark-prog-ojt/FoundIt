import "server-only";

export function getReqIp(req: Request): string | null {
  const xf = req.headers.get("x-forwarded-for");
  if (xf) return xf.split(",")[0]?.trim() || null;
  const xr = req.headers.get("x-real-ip");
  return xr ? xr.trim() : null;
}

export function getReqUA(req: Request): string | null {
  const ua = req.headers.get("user-agent");
  if (!ua) return null;
  return ua.slice(0, 200);
}

export type AuditCreate = {
  actor_user_id?: number | null;
  action: string;
  entity_type: string;
  entity_id?: number | null;
  summary?: string | null;
  meta?: any;
  ip?: string | null;
  user_agent?: string | null;
};
