// Audit §III: saved customer addresses — missing on backend. Mock added so
// order Profile and Checkout's delivery mode have data to render.

import { SavedAddress } from "../types";

const SEED: SavedAddress[] = [
  { id: "addr-home", label: "Home", address: "24 Nguyễn Đình Chiểu, Q.3", is_default: true, lat: 10.7869, lng: 106.6960 },
  { id: "addr-work", label: "Work", address: "Saigon Centre, 92-94 Nam Kỳ Khởi Nghĩa, Q.1", lat: 10.7748, lng: 106.7010 },
];

const STORAGE_KEY = "bakerio-mock-addresses";

function read(): SavedAddress[] {
  if (typeof window !== "undefined" && window.localStorage) {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try { return JSON.parse(raw); } catch {}
    }
  }
  return SEED;
}

function write(addrs: SavedAddress[]) {
  if (typeof window !== "undefined" && window.localStorage) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(addrs));
  }
}

export async function getAddresses(): Promise<SavedAddress[]> {
  await new Promise((r) => setTimeout(r, 80));
  return read();
}

export async function addAddress(label: string, address: string): Promise<SavedAddress> {
  await new Promise((r) => setTimeout(r, 120));
  const all = read();
  const next: SavedAddress = { id: `addr-${Date.now()}`, label, address };
  all.push(next);
  write(all);
  return next;
}

export async function setDefaultAddress(id: string): Promise<SavedAddress[]> {
  await new Promise((r) => setTimeout(r, 80));
  const all = read().map((a) => ({ ...a, is_default: a.id === id }));
  write(all);
  return all;
}

export async function removeAddress(id: string): Promise<void> {
  await new Promise((r) => setTimeout(r, 80));
  write(read().filter((a) => a.id !== id));
}
