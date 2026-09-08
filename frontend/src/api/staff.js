const KEY = "menupilot_staff";
const read = () => { try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; } };
const write = (items) => localStorage.setItem(KEY, JSON.stringify(items));
const wait = () => new Promise((r) => setTimeout(r, 180));

export async function getStaff() { await wait(); return read(); }
export async function createStaff(payload) {
  await wait();
  const items = read();
  if (items.some((x) => x.email.toLowerCase() === payload.email.toLowerCase())) throw new Error("هذا البريد مستخدم بالفعل.");
  const item = { id: crypto.randomUUID(), ...payload, active: true, createdAt: new Date().toISOString() };
  write([item, ...items]);
  return item;
}
export async function updateStaff(id, payload) {
  await wait();
  const items = read().map((x) => x.id === id ? { ...x, ...payload } : x);
  write(items); return items.find((x) => x.id === id);
}
export async function deleteStaff(id) { await wait(); write(read().filter((x) => x.id !== id)); return null; }
