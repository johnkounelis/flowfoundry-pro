/**
 * Minimal sealed-box mock: in development, we treat the envelope as a UTF-8 JSON buffer.
 * Replace with libsodium sealed box in production.
 */
export function unsealEnvelopeToCredentials(envelope: Buffer): Record<string, string> {
  const json = envelope.toString("utf8");
  const value = JSON.parse(json);
  if (typeof value !== "object" || value === null) return {};
  return value as Record<string, string>;
}


