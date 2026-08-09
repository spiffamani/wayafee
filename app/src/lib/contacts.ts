"use client";

/** Saved contacts live in localStorage only — no backend, no sync (deliberate MVP cut). */

export interface Contact {
  name: string;
  address: `0x${string}`;
}

const KEY = "wayafee.contacts.v1";

export function loadContacts(): Contact[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem(KEY) ?? "[]");
  } catch {
    return [];
  }
}

export function saveContacts(contacts: Contact[]) {
  window.localStorage.setItem(KEY, JSON.stringify(contacts));
}

/** Mint wizard progress survives refreshes — the FDC wait is minutes-scale. */
const WIZARD_KEY = "wayafee.mint.v1";

export function loadWizardState<T>(): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(WIZARD_KEY);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function saveWizardState<T>(state: T) {
  window.localStorage.setItem(WIZARD_KEY, JSON.stringify(state));
}

export function clearWizardState() {
  window.localStorage.removeItem(WIZARD_KEY);
}
