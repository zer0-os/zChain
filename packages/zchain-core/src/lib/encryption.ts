import * as crypto from "crypto";
const iv = 'kiamdksndnfgdfff';

function sha1(input: Buffer) {
  return crypto.createHash('sha1').update(input).digest();
}

function password_derive_bytes(password: string, salt: string, iterations: number, len: number) {
  let key = Buffer.from(password + salt);
  for (let i = 0; i < iterations; i++) {
    key = sha1(key);
  }
  if (key.length < len) {
    const hx = password_derive_bytes(password, salt, iterations - 1, 20);
    for (let counter = 1; key.length < len; ++counter) {
      key = Buffer.concat([key, sha1(Buffer.concat([Buffer.from(counter.toString()), hx]))]);
    }
  }
  return Buffer.alloc(len, key);
}

export async function encode(strToEncode: string, password: string) {
  const key = password_derive_bytes(password, '', 100, 32);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, Buffer.from(iv));
  const part1 = cipher.update(strToEncode, 'utf8');
  const part2 = cipher.final();
  const encrypted = Buffer.concat([part1, part2]).toString('base64');
  return encrypted;
}

export async function decode(strToDecode: string, password: string) {
  const key = password_derive_bytes(password, '', 100, 32);
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, Buffer.from(iv));
  let decrypted = decipher.update(strToDecode, 'base64', 'utf8');
  decrypted += decipher.final();
  return decrypted;
}