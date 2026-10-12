import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const TOKEN_VERSION = "v1";

function getKey() {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error("NEXTAUTH_SECRET must be configured to create indicator URL tokens");
  return createHash("sha256").update(secret).digest();
}

export function encryptIndicatorId(indicatorId: string) {
  const nonce = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getKey(), nonce);
  const encrypted = Buffer.concat([cipher.update(indicatorId, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [TOKEN_VERSION, nonce, tag, encrypted]
    .map((part) => typeof part === "string" ? part : part.toString("base64url"))
    .join(".");
}

export function decryptIndicatorId(token: string) {
  const [version, noncePart, tagPart, encryptedPart, ...extra] = token.split(".");
  if (version !== TOKEN_VERSION || !noncePart || !tagPart || !encryptedPart || extra.length) {
    throw new Error("Invalid indicator token");
  }

  const nonce = Buffer.from(noncePart, "base64url");
  const tag = Buffer.from(tagPart, "base64url");
  const encrypted = Buffer.from(encryptedPart, "base64url");
  if (nonce.length !== 12 || tag.length !== 16 || encrypted.length === 0) {
    throw new Error("Invalid indicator token");
  }

  const decipher = createDecipheriv("aes-256-gcm", getKey(), nonce);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}
