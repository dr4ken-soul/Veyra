import { errorResponse, newRequestId, readJson, responseJson } from "@/lib/api";
import { safeReviewNote } from "@/lib/domain";
import { HttpError } from "@/lib/errors";
import { publicCase } from "@/lib/present";
import { routePrincipal, verifyMutation } from "@/lib/route";
import { recordHumanReview } from "@/lib/store";

export const runtime = "nodejs";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const requestId = newRequestId();
  try {
    const principal = routePrincipal(request, 20);
    verifyMutation(request, principal);
    const { id } = await context.params;
    const body = await readJson(request, 4_096);
    if (Object.keys(body).some((key) => key !== "action" && key !== "note")) {
      throw new HttpError(422, "UNKNOWN_FIELD", "The review contains a field this endpoint does not accept.");
    }
    if (typeof body.action !== "string") throw new HttpError(422, "INVALID_REVIEW_ACTION", "Choose a review action.");
    const record = recordHumanReview({
      orgId: principal.orgId,
      caseId: id,
      action: body.action,
      note: safeReviewNote(body.note),
      reviewerId: principal.subject
    });
    if (!record) throw new HttpError(500, "STORE_ERROR", "The review could not be saved.");
    return responseJson(requestId, { case: publicCase(record), recorded: true });
  } catch (error) {
    return errorResponse(error, requestId);
  }
}