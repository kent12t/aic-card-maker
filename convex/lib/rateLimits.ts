import { MINUTE, RateLimiter } from "@convex-dev/rate-limiter";
import { components } from "../_generated/api";

export const rateLimiter = new RateLimiter(components.rateLimiter, {
  // Generous enough for a few people sharing one venue Wi-Fi / NAT address.
  submitCardPerIp: { kind: "token bucket", rate: 6, period: MINUTE, capacity: 6 },
  // Backstop against distributed floods that rotate IPs.
  submitCardGlobal: { kind: "token bucket", rate: 120, period: MINUTE, capacity: 120 },
});
