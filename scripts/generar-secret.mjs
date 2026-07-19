import crypto from "node:crypto";

const secret = crypto.randomBytes(48).toString("hex");

console.log("JWT_SECRET generado:");
console.log(secret);
console.log("\nCópialo en Vercel > Settings > Environment Variables > JWT_SECRET");
