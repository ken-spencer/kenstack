import type { NextRequest } from "next/server";

import type { PipelineResponse } from "./PipelineResponse";
import verifyRecaptcha from "./recaptcha";
import rateLimitEmailRequest, {
  rateLimitIpRequest,
  type RateLimit,
} from "./rateLimit";

// Protects public email actions while avoiding reCAPTCHA calls after a network exhausts its quota.
export default async function guardPublicEmailRequest({
  email,
  emailLimits = [{ max: 3, within: "15 minutes" }],
  ipLimits = [{ max: 10, within: "15 minutes" }],
  name,
  onRateLimited,
  rateLimitMessage = "We have received too many requests. Please try again later.",
  request,
  response,
  threshold,
  token,
}: {
  email: string;
  emailLimits?: readonly RateLimit[];
  ipLimits?: readonly RateLimit[];
  name: string;
  onRateLimited?: () => void | Promise<void>;
  rateLimitMessage?: string;
  request: NextRequest;
  response: PipelineResponse;
  threshold?: number;
  token?: string;
}) {
  const rejectRateLimit = async (retryAfter: number) => {
    response.headers.set("Retry-After", String(retryAfter));
    await onRateLimited?.();
    return response.error({
      message: rateLimitMessage,
      status: 429,
    });
  };

  const ipQuota = await rateLimitIpRequest({
    limits: ipLimits,
    name,
    request,
  });
  if (!ipQuota.allowed) {
    return rejectRateLimit(ipQuota.retryAfter);
  }

  const recaptchaRejection = await verifyRecaptcha({
    action: name,
    request,
    response,
    threshold,
    token,
  });
  if (recaptchaRejection) {
    return recaptchaRejection;
  }

  const emailQuota = await rateLimitEmailRequest({
    email,
    limits: { email: emailLimits },
    name,
    request,
  });
  if (!emailQuota.allowed) {
    return rejectRateLimit(emailQuota.retryAfter);
  }
}
