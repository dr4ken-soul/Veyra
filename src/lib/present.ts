import type { VeyraCase } from "@/lib/store";

export function publicCase(record: VeyraCase) {
  const { orgId: _orgId, ...safe } = record;
  return safe;
}