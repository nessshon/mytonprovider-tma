import type { Explorer } from "@/stores/settings";

function base64Decode(value: string): Uint8Array {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(normalized);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_");
}

function crc16(bytes: Uint8Array): number {
  let crc = 0;
  for (let i = 0; i < bytes.length; i++) {
    crc ^= bytes[i] << 8;
    for (let j = 0; j < 8; j++) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
      crc &= 0xffff;
    }
  }
  return crc;
}

export function toUserFriendly(address: string): string {
  try {
    const bytes = base64Decode(address);
    if (bytes.length !== 36) return address;
    bytes[0] = (bytes[0] & 0x80) | 0x51;
    const crc = crc16(bytes.slice(0, 34));
    bytes[34] = (crc >> 8) & 0xff;
    bytes[35] = crc & 0xff;
    return base64UrlEncode(bytes);
  } catch {
    return (address || "").replace(/^EQ/, "UQ");
  }
}


export function explorerAddressUrl(address: string, explorer: Explorer): string {
  return explorer === "tonscan" ? `https://tonscan.org/address/${address}` : `https://tonviewer.com/${address}`;
}
