export function toReimbursementUrlFromRelative(relativePath: string): string {
  const rel = (relativePath || "").replace(/^\/+/, "").replace(/\\/g, "/");
  return `reimbursement://attachments/${encodeURI(rel)}`;
}

