import jwt from "jsonwebtoken";
import crypto from "crypto";

export function generateTokenId() {
  return crypto.randomUUID();
}

export function signAccessToken(payload) {
  return jwt.sign(payload, process.env.JWT_ACCESS_SECRET, { expiresIn: "15m" });
}

export function signRefreshToken(payload) {
  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET, { expiresIn: "7d" });
}

export function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}