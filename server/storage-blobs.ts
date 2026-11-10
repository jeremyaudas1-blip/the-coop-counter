// Netlify Blobs storage for The Coop Counter.
// Small personal app: data is kept as a few JSON documents per user/family.
import { getStore } from "@netlify/blobs";

const STORE = "coop-counter";
const s = () => getStore({ name: STORE, consistency: "strong" });

const now = () => new Date().toISOString();
const newId = () => Date.now() * 1000 + Math.floor(Math.random() * 1000);

async function getJSON<T>(key: string, fallback: T): Promise<T> {
  const v = await s().get(key, { type: "json" });
  return (v ?? fallback) as T;
}
async function setJSON(key: string, value: unknown) {
  await s().setJSON(key, value);
}

const emailKey = (email: string) => `userEmail/${encodeURIComponent(email.toLowerCase())}`;
const inviteEmailKey = (email: string) => `invitesByEmail/${encodeURIComponent(email.toLowerCase())}`;

type User = { id: number; name: string; email: string; passwordHash: string; password_hash: string; createdAt: string; marketingConsent: number };
type Family = { id: number; name: string; ownerId: number; createdAt: string };
type Member = { id: number; familyId: number; userId: number; role: string; joinedAt: string };
type Invite = { id: number; familyId: number; email: string; token: string; createdAt: string; accepted: number };
type Entry = { id: number; familyId: number; date: string; count: number; note: string | null; collectorIds: string | null; eggColors: string | null };
type Named = { id: number; familyId: number; name: string };

export async function getJwtSecret(): Promise<string> {
  const env = process.env.JWT_SECRET;
  if (env) return env;
  const existing = await s().get("config/jwtSecret", { type: "text" });
  if (existing) return existing;
  const crypto = await import("crypto");
  const secret = crypto.randomBytes(48).toString("hex");
  await s().set("config/jwtSecret", secret, { onlyIfNew: true });
  return (await s().get("config/jwtSecret", { type: "text" })) || secret;
}

export const storage = {
  // ─── Users ───
  async createUser(name: string, email: string, passwordHash: string, marketingConsent: boolean): Promise<User> {
    const id = newId();
    const { modified } = await s().set(emailKey(email), String(id), { onlyIfNew: true });
    if (!modified) throw new Error("Email already registered");
    const user: User = { id, name, email: email.toLowerCase(), passwordHash, password_hash: passwordHash, createdAt: now(), marketingConsent: marketingConsent ? 1 : 0 };
    await setJSON(`users/${id}`, user);
    return user;
  },
  async getUserByEmail(email: string): Promise<User | undefined> {
    const id = await s().get(emailKey(email), { type: "text" });
    if (!id) return undefined;
    return (await getJSON<User | null>(`users/${id}`, null)) ?? undefined;
  },
  async getUserById(id: number): Promise<User | undefined> {
    return (await getJSON<User | null>(`users/${id}`, null)) ?? undefined;
  },
  async updateUserName(id: number, name: string) {
    const u = await this.getUserById(id);
    if (u) await setJSON(`users/${id}`, { ...u, name });
  },

  // ─── Families ───
  async createFamily(name: string, ownerId: number): Promise<Family> {
    const fam: Family = { id: newId(), name, ownerId, createdAt: now() };
    await setJSON(`families/${fam.id}`, fam);
    return fam;
  },
  async getFamilyById(id: number): Promise<Family | undefined> {
    return (await getJSON<Family | null>(`families/${id}`, null)) ?? undefined;
  },
  async updateFamilyName(id: number, name: string) {
    const f = await this.getFamilyById(id);
    if (f) await setJSON(`families/${id}`, { ...f, name });
  },
  async getUserFamilies(userId: number): Promise<{ family: Family; role: string }[]> {
    const links = await getJSON<{ familyId: number; role: string }[]>(`userFamilies/${userId}`, []);
    const out: { family: Family; role: string }[] = [];
    for (const l of links) {
      const family = await this.getFamilyById(l.familyId);
      if (family) out.push({ family, role: l.role });
    }
    return out;
  },
  async addFamilyMember(familyId: number, userId: number, role: string): Promise<Member> {
    const members = await getJSON<Member[]>(`members/${familyId}`, []);
    const found = members.find(m => m.userId === userId);
    if (found) return found;
    const m: Member = { id: newId(), familyId, userId, role, joinedAt: now() };
    await setJSON(`members/${familyId}`, [...members, m]);
    const links = await getJSON<{ familyId: number; role: string }[]>(`userFamilies/${userId}`, []);
    if (!links.some(l => l.familyId === familyId)) await setJSON(`userFamilies/${userId}`, [...links, { familyId, role }]);
    return m;
  },
  async getFamilyMembers(familyId: number) {
    const members = await getJSON<Member[]>(`members/${familyId}`, []);
    const out = [];
    for (const m of members) {
      const u = await this.getUserById(m.userId);
      out.push({ ...m, userName: u?.name, userEmail: u?.email });
    }
    return out;
  },

  // ─── Invites ───
  async createInvite(familyId: number, email: string, token: string): Promise<Invite> {
    const inv: Invite = { id: newId(), familyId, email: email.toLowerCase(), token, createdAt: now(), accepted: 0 };
    const list = await getJSON<Invite[]>(`invites/${familyId}`, []);
    await setJSON(`invites/${familyId}`, [...list, inv]);
    const byEmail = await getJSON<{ familyId: number; id: number }[]>(inviteEmailKey(email), []);
    await setJSON(inviteEmailKey(email), [...byEmail, { familyId, id: inv.id }]);
    return inv;
  },
  async getPendingInvites(familyId: number): Promise<Invite[]> {
    return (await getJSON<Invite[]>(`invites/${familyId}`, [])).filter(i => !i.accepted);
  },
  async getPendingInvitesForEmail(email: string): Promise<Invite[]> {
    const refs = await getJSON<{ familyId: number; id: number }[]>(inviteEmailKey(email), []);
    const out: Invite[] = [];
    for (const r of refs) {
      const inv = (await getJSON<Invite[]>(`invites/${r.familyId}`, [])).find(i => i.id === r.id);
      if (inv && !inv.accepted) out.push(inv);
    }
    return out;
  },
  async acceptInvite(familyId: number, id: number) {
    const list = await getJSON<Invite[]>(`invites/${familyId}`, []);
    await setJSON(`invites/${familyId}`, list.map(i => (i.id === id ? { ...i, accepted: 1 } : i)));
  },

  // ─── Egg entries (one document per family per year) ───
  async getEntriesByYear(familyId: number, year: number): Promise<Entry[]> {
    const list = await getJSON<Entry[]>(`entries/${familyId}/${year}`, []);
    return [...list].sort((a, b) => (a.date < b.date ? 1 : -1));
  },
  async getEntryByDate(familyId: number, date: string): Promise<Entry | undefined> {
    const list = await getJSON<Entry[]>(`entries/${familyId}/${date.slice(0, 4)}`, []);
    return list.find(e => e.date === date);
  },
  async upsertEntry(familyId: number, data: { date: string; count: number; note?: string | null; collectorIds?: string | null; eggColors?: string | null }): Promise<{ entry: Entry; created: boolean }> {
    const key = `entries/${familyId}/${data.date.slice(0, 4)}`;
    const list = await getJSON<Entry[]>(key, []);
    const idx = list.findIndex(e => e.date === data.date);
    if (idx >= 0) {
      const cur = list[idx];
      const updated: Entry = {
        ...cur,
        count: data.count,
        ...(data.note !== undefined ? { note: data.note ?? null } : {}),
        ...(data.collectorIds !== undefined ? { collectorIds: data.collectorIds ?? null } : {}),
        ...(data.eggColors !== undefined ? { eggColors: data.eggColors ?? null } : {}),
      };
      list[idx] = updated;
      await setJSON(key, list);
      return { entry: updated, created: false };
    }
    const entry: Entry = { id: newId(), familyId, date: data.date, count: data.count, note: data.note ?? null, collectorIds: data.collectorIds ?? null, eggColors: data.eggColors ?? null };
    await setJSON(key, [...list, entry]);
    return { entry, created: true };
  },
  async deleteEntry(familyId: number, id: number) {
    const { blobs } = await s().list({ prefix: `entries/${familyId}/` });
    for (const b of blobs) {
      const list = await getJSON<Entry[]>(b.key, []);
      if (list.some(e => e.id === id)) {
        await setJSON(b.key, list.filter(e => e.id !== id));
        return;
      }
    }
  },

  // ─── Chickens & collectors ───
  async getChickens(familyId: number): Promise<Named[]> {
    return getJSON<Named[]>(`chickens/${familyId}`, []);
  },
  async createChicken(familyId: number, name: string): Promise<Named> {
    const list = await this.getChickens(familyId);
    const c = { id: newId(), familyId, name };
    await setJSON(`chickens/${familyId}`, [...list, c]);
    return c;
  },
  async deleteChicken(familyId: number, id: number) {
    const list = await this.getChickens(familyId);
    await setJSON(`chickens/${familyId}`, list.filter(c => c.id !== id));
  },
  async getCollectors(familyId: number): Promise<Named[]> {
    return getJSON<Named[]>(`collectors/${familyId}`, []);
  },
  async createCollector(familyId: number, name: string): Promise<Named> {
    const list = await this.getCollectors(familyId);
    const c = { id: newId(), familyId, name };
    await setJSON(`collectors/${familyId}`, [...list, c]);
    return c;
  },
  async deleteCollector(familyId: number, id: number) {
    const list = await this.getCollectors(familyId);
    await setJSON(`collectors/${familyId}`, list.filter(c => c.id !== id));
  },

  // ─── Settings ───
  async getSetting(key: string): Promise<string | undefined> {
    return (await s().get(`settings/${key}`, { type: "text" })) ?? undefined;
  },
  async setSetting(key: string, value: string) {
    await s().set(`settings/${key}`, value);
  },
};
