// API client for Siddhnath Dairy backend
const BASE = process.env.EXPO_PUBLIC_BACKEND_URL;

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}/api${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });
  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      const j = await res.json();
      detail = j.detail || detail;
    } catch {}
    throw new Error(detail);
  }
  return res.json() as Promise<T>;
}

export type Farmer = {
  id: string;
  farmer_code: string;
  name: string;
  phone: string;
  village?: string;
  created_at: string;
};

export type MilkEntry = {
  id: string;
  farmer_id: string;
  farmer_code: string;
  farmer_name: string;
  date: string;
  shift: "morning" | "evening";
  liters: number;
  fat: number;
  snf: number;
  density?: number | null;
  rate: number;
  amount: number;
  created_at: string;
};

export type Advance = {
  id: string;
  farmer_id: string;
  farmer_code: string;
  farmer_name: string;
  amount: number;
  note?: string;
  date: string;
  settled: boolean;
  created_at: string;
};

export type Settings = {
  id: string;
  dairy_name: string;
  dairy_phone: string;
  base_fat: number;
  base_snf: number;
  base_rate: number;
  fat_increment: number;
  snf_increment: number;
  admin_password: string;
  updated_at: string;
};

export type PaymentSummary = {
  farmer: Farmer;
  date_from: string;
  date_to: string;
  entries: MilkEntry[];
  advances: Advance[];
  total_liters: number;
  gross_amount: number;
  total_advance: number;
  net_payable: number;
  avg_fat: number;
  avg_snf: number;
};

export type TodaySummary = {
  date: string;
  entries: number;
  liters: number;
  amount: number;
  farmers: number;
  avg_fat: number;
  avg_snf: number;
};

export const api = {
  // Auth
  adminLogin: (password: string) =>
    http<{ ok: boolean; role: string; dairy_name: string }>("/auth/admin-login", {
      method: "POST",
      body: JSON.stringify({ password }),
    }),
  farmerLogin: (farmer_code: string, phone: string) =>
    http<{ ok: boolean; role: string; farmer: Farmer }>("/auth/farmer-login", {
      method: "POST",
      body: JSON.stringify({ farmer_code, phone }),
    }),

  // Farmers
  listFarmers: () => http<Farmer[]>("/farmers"),
  createFarmer: (data: { name: string; phone: string; village?: string; farmer_code?: string }) =>
    http<Farmer>("/farmers", { method: "POST", body: JSON.stringify(data) }),
  getFarmer: (id: string) => http<Farmer>(`/farmers/${id}`),
  updateFarmer: (id: string, data: Partial<Farmer>) =>
    http<Farmer>(`/farmers/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteFarmer: (id: string) => http<{ ok: boolean }>(`/farmers/${id}`, { method: "DELETE" }),

  // Milk entries
  createEntry: (data: {
    farmer_id: string;
    shift: "morning" | "evening";
    liters: number;
    fat: number;
    snf: number;
    density?: number | null;
    date?: string;
  }) => http<MilkEntry>("/milk-entries", { method: "POST", body: JSON.stringify(data) }),
  listEntries: (params: { farmer_id?: string; date_from?: string; date_to?: string; limit?: number } = {}) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => v != null && qs.append(k, String(v)));
    return http<MilkEntry[]>(`/milk-entries${qs.toString() ? `?${qs}` : ""}`);
  },
  deleteEntry: (id: string) => http<{ ok: boolean }>(`/milk-entries/${id}`, { method: "DELETE" }),

  todaySummary: () => http<TodaySummary>("/today-summary"),

  // Advances
  createAdvance: (data: { farmer_id: string; amount: number; note?: string; date?: string }) =>
    http<Advance>("/advances", { method: "POST", body: JSON.stringify(data) }),
  listAdvances: (farmer_id?: string, unsettled = false) => {
    const qs = new URLSearchParams();
    if (farmer_id) qs.append("farmer_id", farmer_id);
    if (unsettled) qs.append("unsettled", "true");
    return http<Advance[]>(`/advances${qs.toString() ? `?${qs}` : ""}`);
  },
  deleteAdvance: (id: string) => http<{ ok: boolean }>(`/advances/${id}`, { method: "DELETE" }),

  // Payment
  paymentSummary: (farmer_id: string, date_from?: string, date_to?: string) => {
    const qs = new URLSearchParams();
    if (date_from) qs.append("date_from", date_from);
    if (date_to) qs.append("date_to", date_to);
    return http<PaymentSummary>(`/payment-summary/${farmer_id}${qs.toString() ? `?${qs}` : ""}`);
  },
  settleAdvances: (farmer_id: string) =>
    http<{ ok: boolean; settled: number }>(`/payment-summary/${farmer_id}/settle-advances`, {
      method: "POST",
    }),

  // Settings
  getSettings: () => http<Settings>("/settings"),
  updateSettings: (data: Partial<Settings>) =>
    http<Settings>("/settings", { method: "PUT", body: JSON.stringify(data) }),

  // Rate preview
  ratePreview: (fat: number, snf: number, liters: number) =>
    http<{ rate: number; amount: number }>("/rate-preview", {
      method: "POST",
      body: JSON.stringify({ fat, snf, liters }),
    }),

  // AI scan
  scanImage: (image_base64: string) =>
    http<{ fat: number | null; snf: number | null; density: number | null; raw: string }>("/scan-image", {
      method: "POST",
      body: JSON.stringify({ image_base64 }),
    }),
};
