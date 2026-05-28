// Mock data: Timberwolves org. Three fans, their orders, target events with inventory, org policy.

export type Fan = {
  id: string;
  name: string;
  email: string;
  phone: string;
  exchangesUsedThisSeason: number;
};

export type LineItem = {
  id: string;
  eventId: string;
  product: string; // e.g. "Single Game Adult"
  section: string;
  row: string;
  seat: string;
  status: "Confirmed" | "Exchanged" | "Cancelled";
  price: number;
  fees: number;
  taxes: number;
  paid: number;
  priceLevel: string; // e.g. "Chairman's Club Seats"
  priceType: string; // e.g. "Single Game Adult"
};

export type Order = {
  id: string;
  fanId: string;
  status: "Confirmed";
  payment: "Paid Settled";
  date: string;
  planName: string;
  assignment: string;
  lineItems: LineItem[];
  paymentMethods: { id: string; label: string }[];
};

export type EventInfo = {
  id: string;
  title: string; // "Wolves vs. Hawks"
  shortTitle?: string;
  dateTime: string; // ISO
  venue: string;
};

export type InventoryBlock = {
  id: string;
  eventId: string;
  section: string;
  row: string;
  seats: string; // e.g. "5-6"
  pricePerSeat: number;
  priceLevel: string;
  note: string;
  sectionMapHighlight: { x: number; y: number; w: number; h: number; color: string };
};

export const ORG = {
  name: "Minnesota Timberwolves",
  exchangeLimit: 5,
  allowedTypes: ["seat-for-seat"] as const,
  reconciliationOptions: ["charge", "reprice", "leave-overpaid"] as const,
};

export const USERS = {
  admin: { id: "u_sarah", name: "Sarah Chen", role: "Ticket Ops Admin" },
  sales: { id: "u_marcus", name: "Marcus Rivera", role: "Sales" },
};

export const FANS: Fan[] = [
  { id: "f_brandon", name: "Brandon Roeder", email: "brandon+may1233@jump.com", phone: "(612) 555-0142", exchangesUsedThisSeason: 2 },
  { id: "f_andy", name: "Andy Schaefer", email: "andy@example.com", phone: "(612) 555-0188", exchangesUsedThisSeason: 1 },
  { id: "f_jessica", name: "Jessica Park", email: "jessica.park@example.com", phone: "(612) 555-0124", exchangesUsedThisSeason: 0 },
];

// Brandon's owned events (the "Shawn Test Events" from the prompt)
export const BRANDON_EVENTS: EventInfo[] = [
  { id: "e_shawn1", title: "Shawn Test Event 1", dateTime: "2026-09-23T19:00:00-05:00", venue: "Target Center" },
  { id: "e_shawn2", title: "Shawn Test Event 2", dateTime: "2026-09-23T19:00:00-05:00", venue: "Target Center" },
  { id: "e_shawn3", title: "Shawn Test Event 3", dateTime: "2026-09-23T19:00:00-05:00", venue: "Target Center" },
];

// Upcoming Wolves games for target-game selection
export const UPCOMING_EVENTS: EventInfo[] = [
  { id: "e_cavs", title: "Wolves vs. Cavaliers", shortTitle: "Cavaliers", dateTime: "2026-04-25T19:00:00-05:00", venue: "Target Center" },
  { id: "e_hawks", title: "Wolves vs. Hawks", shortTitle: "Hawks", dateTime: "2026-05-03T20:00:00-05:00", venue: "Target Center" },
  { id: "e_warriors", title: "Wolves vs. Warriors", shortTitle: "Warriors", dateTime: "2026-05-10T18:30:00-05:00", venue: "Target Center" },
  { id: "e_lakers", title: "Wolves vs. Lakers", shortTitle: "Lakers", dateTime: "2026-05-17T19:00:00-05:00", venue: "Target Center" },
  { id: "e_nuggets", title: "Wolves vs. Nuggets", shortTitle: "Nuggets", dateTime: "2026-05-24T20:00:00-05:00", venue: "Target Center" },
];

export const ALL_EVENTS: Record<string, EventInfo> = Object.fromEntries(
  [...BRANDON_EVENTS, ...UPCOMING_EVENTS].map((e) => [e.id, e]),
);

function buildBrandonLineItems(): LineItem[] {
  const items: LineItem[] = [];
  for (const ev of BRANDON_EVENTS) {
    for (let s = 1; s <= 10; s++) {
      items.push({
        id: `li_${ev.id}_s${s}`,
        eventId: ev.id,
        product: "Single Game Adult",
        section: "101",
        row: "U",
        seat: String(s),
        status: "Confirmed",
        price: 10,
        fees: 0,
        taxes: 0,
        paid: 10,
        priceLevel: "Chairman's Club Seats",
        priceType: "Single Game Adult",
      });
    }
  }
  return items;
}

function buildAndyLineItems(): LineItem[] {
  const items: LineItem[] = [];
  for (let s = 3; s <= 6; s++) {
    items.push({
      id: `li_andy_${s}`,
      eventId: "e_cavs",
      product: "Single Game Adult",
      section: "145",
      row: "F",
      seat: String(s),
      status: "Confirmed",
      price: 50,
      fees: 0,
      taxes: 0,
      paid: 50,
      priceLevel: "Sideline Center",
      priceType: "Single Game Adult",
    });
  }
  return items;
}

function buildJessicaLineItems(): LineItem[] {
  const items: LineItem[] = [];
  for (let s = 1; s <= 2; s++) {
    items.push({
      id: `li_jess_${s}`,
      eventId: "e_hawks",
      product: "Single Game Adult",
      section: "108",
      row: "A",
      seat: String(s),
      status: "Confirmed",
      price: 75,
      fees: 0,
      taxes: 0,
      paid: 75,
      priceLevel: "Baseline Premium",
      priceType: "Single Game Adult",
    });
  }
  return items;
}

export const ORDERS: Order[] = [
  {
    id: "6176900113931",
    fanId: "f_brandon",
    status: "Confirmed",
    payment: "Paid Settled",
    date: "Apr 22, 2026",
    planName: "Single Game",
    assignment: "Self-assigned",
    lineItems: buildBrandonLineItems(),
    paymentMethods: [
      { id: "pm_visa", label: "Visa ending in 4242" },
      { id: "pm_mc", label: "Mastercard ending in 8891" },
    ],
  },
  {
    id: "6176900114002",
    fanId: "f_andy",
    status: "Confirmed",
    payment: "Paid Settled",
    date: "May 12, 2026",
    planName: "Single Game",
    assignment: "Self-assigned",
    lineItems: buildAndyLineItems(),
    paymentMethods: [{ id: "pm_visa_a", label: "Visa ending in 1111" }],
  },
  {
    id: "6176900114108",
    fanId: "f_jessica",
    status: "Confirmed",
    payment: "Paid Settled",
    date: "May 14, 2026",
    planName: "Single Game",
    assignment: "Self-assigned",
    lineItems: buildJessicaLineItems(),
    paymentMethods: [{ id: "pm_amex_j", label: "Amex ending in 7711" }],
  },
];

export const ORDERS_BY_ID: Record<string, Order> = Object.fromEntries(ORDERS.map((o) => [o.id, o]));
export const FANS_BY_ID: Record<string, Fan> = Object.fromEntries(FANS.map((f) => [f.id, f]));

export function findOrderByFanId(fanId: string): Order | undefined {
  return ORDERS.find((o) => o.fanId === fanId);
}

// Comparable seat block options for a target event — keyed by event id.
// Format: 4 cards, mix of same-price / upcharge / downcharge.
export function getBlockOptions(targetEventId: string, refPricePerSeat: number, count: number): InventoryBlock[] {
  return [
    {
      id: `${targetEventId}_b1`,
      eventId: targetEventId,
      section: "102",
      row: "T",
      seats: rangeLabel(5, count),
      pricePerSeat: refPricePerSeat,
      priceLevel: "Chairman's Club Seats",
      note: "Adjacent section, similar row depth",
      sectionMapHighlight: { x: 120, y: 70, w: 30, h: 22, color: "#4c2ffe" },
    },
    {
      id: `${targetEventId}_b2`,
      eventId: targetEventId,
      section: "101",
      row: "V",
      seats: rangeLabel(12, count),
      pricePerSeat: refPricePerSeat,
      priceLevel: "Chairman's Club Seats",
      note: "Same section, 1 row back",
      sectionMapHighlight: { x: 95, y: 75, w: 30, h: 22, color: "#4c2ffe" },
    },
    {
      id: `${targetEventId}_b3`,
      eventId: targetEventId,
      section: "105",
      row: "D",
      seats: rangeLabel(1, count),
      pricePerSeat: refPricePerSeat + 5,
      priceLevel: "Courtside",
      note: "Closer to court, higher tier",
      sectionMapHighlight: { x: 100, y: 110, w: 30, h: 14, color: "#16a34a" },
    },
    {
      id: `${targetEventId}_b4`,
      eventId: targetEventId,
      section: "220",
      row: "K",
      seats: rangeLabel(8, count),
      pricePerSeat: Math.max(1, refPricePerSeat - 3),
      priceLevel: "Upper Level",
      note: "Upper level, more affordable",
      sectionMapHighlight: { x: 60, y: 30, w: 40, h: 22, color: "#d97706" },
    },
  ];
}

function rangeLabel(start: number, count: number): string {
  if (count <= 1) return `${start}`;
  return `${start}-${start + count - 1}`;
}

export function formatEventDateTime(iso: string): string {
  const d = new Date(iso);
  const date = d.toLocaleDateString("en-US", { month: "numeric", day: "numeric", year: "numeric" });
  const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true, timeZoneName: "short" });
  return `${date} ${time}`;
}

export function formatShortDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "numeric", day: "numeric", year: "numeric" });
}
