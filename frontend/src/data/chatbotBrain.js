// Setu — RaktaSetu's built-in assistant brain.
// Hardened intent engine: synonym normalization → fuzzy-tolerant scoring →
// precise patterns (REQ ids, blood groups, navigation commands).
// Reply shape: { text, actions: [{ label, to }], goTo?: "/path", topic?: "..." }

// ── Live data binding ────────────────────────────────────────────────────────
// The brain is a pure function of app data. Chatbot.jsx fetches the datasets for
// the signed-in role once, normalizes them to the shapes below, and hands them
// in via the `db` argument. Everything below reads these bindings — nothing here
// touches demo data. (getBotReply is synchronous, so this module-level binding
// is safe: it is set fresh on every call before any builder runs.)
let currentDonor = {};
let donationHistory = [];
let allNearbyRequests = [];
let donationCamps = [];
let inventory = [];
let hospitalRequests = [];
let myHospitalRequests = [];
let emergencyAlerts = [];
let donorMatchesForRequest = [];
let shortageRisk = [];
let restockRecommendations = [];
let demandForecast = {};
let reportStats = {};
let adminStats = {};
let crossMatchRecords = [];

function bindData(db) {
  db = db || {};
  currentDonor = db.currentDonor || {};
  donationHistory = db.donationHistory || [];
  allNearbyRequests = db.allNearbyRequests || [];
  donationCamps = db.donationCamps || [];
  inventory = db.inventory || [];
  hospitalRequests = db.hospitalRequests || [];
  myHospitalRequests = db.myHospitalRequests || [];
  emergencyAlerts = db.emergencyAlerts || [];
  donorMatchesForRequest = db.donorMatchesForRequest || [];
  shortageRisk = db.shortageRisk || [];
  restockRecommendations = db.restockRecommendations || [];
  demandForecast = db.demandForecast || {};
  reportStats = db.reportStats || {};
  adminStats = db.adminStats || {};
  crossMatchRecords = db.crossMatchRecords || [];
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const fmtDate = (iso) => {
  const d = new Date(`${iso}T00:00:00`);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
};

// ---------------------------------------------------------------------------
// Text normalization: synonyms + chat-speak, so paraphrases land on intents.
// ---------------------------------------------------------------------------

const SYNONYMS = [
  [/\bgive blood\b/g, "donate"],
  [/\bblood donation\b/g, "donation"],
  [/\bam i allowed to\b|\ballowed to\b/g, "can i"],
  [/\bhow much\b/g, "how many"],
  [/\bclose by\b|\baround me\b/g, "nearby"],
  [/\bblood drive\b/g, "camp"],
  [/\burgent\b/g, "critical"],
  [/\bu\b/g, "you"],
  [/\bur\b/g, "your"],
  [/\bwanna\b/g, "want to"],
  [/\b2\b/g, "to"],
  [/\bpls\b|\bplz\b/g, "please"],
];

function normalize(raw) {
  let t = raw.toLowerCase().trim();
  for (const [re, rep] of SYNONYMS) t = t.replace(re, rep);
  return t
    .replace(/[?.!,;:()"']/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const NEGATION_RE = /\b(don't|dont|doesn't|doesnt|do not|does not|never|no need|stop)\b/;

// Optimal string alignment distance (Levenshtein + adjacent transposition).
// "histroy" vs "history" → 1, the most common human typo.
function osa(a, b) {
  if (a === b) return 0;
  const la = a.length;
  const lb = b.length;
  if (Math.abs(la - lb) > 2) return 3;
  const d = Array.from({ length: la + 1 }, (_, i) => [i]);
  for (let j = 1; j <= lb; j++) d[0][j] = j;
  for (let i = 1; i <= la; i++) {
    for (let j = 1; j <= lb; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    }
  }
  return d[la][lb];
}

// Keyword hit: exact substring (strong) or typo-tolerant word match (weak).
function keywordScore(text, kw) {
  if (text.includes(kw)) return 2;
  if (kw.length < 5) return 0;
  const maxD = kw.length >= 8 ? 2 : 1;
  const words = text.split(" ");
  for (const w of words) {
    if (w.length < 5 || Math.abs(w.length - kw.length) > maxD) continue;
    if (osa(w, kw) <= maxD) return 1;
  }
  return 0;
}

function intentScore(text, keywords) {
  let score = 0;
  for (const kw of keywords) score += keywordScore(text, kw);
  return score;
}

const findBloodGroup = (text) => {
  const m = text.match(/(ab\+|ab-|a\+|a-|b\+|b-|o\+|o-)/i);
  return m ? m[1].toUpperCase() : null;
};

// ---------------------------------------------------------------------------
// Greetings + quick replies
// ---------------------------------------------------------------------------

export function getGreeting(role, db) {
  if (db) bindData(db);
  const firstName = (currentDonor.name || "there").split(" ")[0];
  const base = {
    donor: `Hey ${firstName}! I'm **Setu**, your RaktaSetu assistant. 🩸\n\nI can check your donation eligibility, show your history, find urgent requests near you, and list upcoming camps. What do you need?`,
    hospital: `Hello! I'm **Setu**, your RaktaSetu assistant.\n\nI can help you raise blood requests, check bank inventory, track your request status, and find eligible donors. What do you need?`,
    admin: `Hello! I'm **Setu**, your RaktaSetu assistant.\n\nI can pull stock levels, shortage alerts, pending requests, demand forecasts, and reports. What do you need?`,
  };
  return { text: base[role] || base.donor, actions: [] };
}

export function getQuickReplies(role) {
  if (role === "hospital")
    return ["Raise a blood request", "Check inventory", "My request status", "Emergency alerts"];
  if (role === "admin")
    return ["Low stock alerts", "Today's stats", "Pending requests", "Demand forecast"];
  return ["Am I eligible to donate?", "My donation history", "Requests near me", "Upcoming camps"];
}

// ---------------------------------------------------------------------------
// Reply builders (pure functions of app data)
// ---------------------------------------------------------------------------

function donorEligibility() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const eligible = new Date(`${currentDonor.eligibleFrom}T00:00:00`) <= today;
  return {
    topic: "donation eligibility",
    text: eligible
      ? `Yes — you're **eligible to donate**!\n- Last donation: **${fmtDate(currentDonor.lastDonation)}**\n- The 3-month gap is complete, so you can donate anytime.\n\nWalk into any partner blood bank or join an upcoming camp.`
      : `Not just yet — you're eligible from **${fmtDate(currentDonor.eligibleFrom)}** (3-month gap after your last donation on ${fmtDate(currentDonor.lastDonation)}).`,
    actions: [{ label: "Upcoming camps", to: "/donor/camps" }],
  };
}

function donorHistory() {
  const lines = donationHistory
    .map((d) => `- **${fmtDate(d.date)}** — ${d.location} (${d.status})`)
    .join("\n");
  return {
    topic: "your donation history",
    text: `Your recent donations:\n${lines}\n\n${currentDonor.totalDonations} total donations → roughly **${currentDonor.totalDonations * 3} lives** touched.`,
    actions: [{ label: "Full history", to: "/donor/history" }],
  };
}

function donorImpact() {
  return {
    topic: "your impact",
    text: `**${currentDonor.totalDonations} donations × 3 lives each = ~${currentDonor.totalDonations * 3} lives** touched.\n\nThat's the real impact of showing up. One more donation before the year ends?`,
    actions: [{ label: "Upcoming camps", to: "/donor/camps" }],
  };
}

function donorNearby() {
  const top = [...allNearbyRequests]
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, 3)
    .map(
      (r) =>
        `- **${r.id}** · ${r.hospital}\n  ${r.unitsNeeded} units ${r.bloodGroup} · ${r.urgency} · ${r.distanceKm} km away`
    )
    .join("\n");
  return {
    topic: "nearby requests",
    text: `Urgent requests near you:\n${top}`,
    actions: [{ label: "View all requests", to: "/donor/requests" }],
  };
}

function donorCamps() {
  const upcoming = donationCamps.filter((c) => c.status === "Upcoming");
  const lines = upcoming
    .map((c) => `- **${c.name}**\n  ${fmtDate(c.date)} · ${c.location} (${c.time})`)
    .join("\n");
  return {
    topic: "donation camps",
    text: `Upcoming donation camps:\n${lines}`,
    actions: [{ label: "All camps", to: "/donor/camps" }],
  };
}

function donorProfile() {
  return {
    topic: "your profile",
    text: `**${currentDonor.name}** · ${currentDonor.id}\n- Blood group: **${currentDonor.bloodGroup}**\n- City: ${currentDonor.city}\n- Donations: ${currentDonor.totalDonations} (last on ${fmtDate(currentDonor.lastDonation)})`,
    actions: [{ label: "Open profile", to: "/donor/profile" }],
  };
}

function donorHowTo() {
  return {
    topic: "how to donate",
    text: `Donating is simple:\n- Confirm you're eligible (18–65 yrs, 50+ kg, feeling healthy)\n- Walk into any partner blood bank or join a camp\n- The donation takes ~10 minutes — you'll get a donor card right after`,
    actions: [{ label: "Upcoming camps", to: "/donor/camps" }],
  };
}

function donorCriteria() {
  return {
    topic: "donor criteria",
    text: `Basic donor criteria:\n- Age **18–65**, weight **50 kg+**\n- Hemoglobin 12.5 g/dL or above\n- No antibiotics/illness in the last 14 days\n- 3-month gap between whole-blood donations`,
    actions: [],
  };
}

function hospitalRaise() {
  return {
    topic: "raising a request",
    text: `To raise a blood request:\n- Open **Raise Request**, pick blood group + units + urgency\n- Add patient & ward details so the bank can prioritize\n- **Critical** requests jump the matching queue — track them under My Requests`,
    actions: [{ label: "Raise a request", to: "/hospital/request" }],
  };
}

function hospitalMyRequests() {
  const lines = myHospitalRequests
    .map(
      (r) =>
        `- **${r.id}** · ${r.units} units ${r.bloodGroup} for ${r.patientName} (${r.ward})\n  Status: **${r.status}** · ${r.urgency}`
    )
    .join("\n");
  return {
    topic: "your requests",
    text: `Your requests:\n${lines}`,
    actions: [{ label: "All requests", to: "/hospital/requests" }],
  };
}

function hospitalInventory(group) {
  if (group) {
    const item = inventory.find((i) => i.bloodGroup === group);
    if (!item) return { topic: "inventory", text: `I don't recognize that blood group — try A+, O-, etc.`, actions: [] };
    const verdict = item.units <= 10 ? " — **running low**, request soon" : "";
    return {
      topic: `${group} stock`,
      text: `**${item.bloodGroup}**: ${item.units} units in stock${verdict}\n- Near expiry: ${item.nearExpiryUnits} units (earliest ${fmtDate(item.earliestExpiry)})`,
      actions: [{ label: "Full inventory", to: "/hospital/inventory" }],
    };
  }
  const low = inventory.filter((i) => i.units <= 10).map((i) => i.bloodGroup);
  const lines = inventory.map((i) => `- **${i.bloodGroup}**: ${i.units} units`).join("\n");
  return {
    topic: "inventory",
    text: `Current bank stock:\n${lines}\n\n${low.length ? `Running low: **${low.join(", ")}**` : "All groups are above safety levels."}`,
    actions: [{ label: "Search inventory", to: "/hospital/inventory" }],
  };
}

function hospitalEmergency() {
  const lines = emergencyAlerts.map((a) => `- **${a.severity}**: ${a.detail}`).join("\n");
  return {
    topic: "emergency alerts",
    text: `Active alerts:\n${lines}\n\nFor critical needs, raise the request with urgency **Critical** — it jumps the matching queue.`,
    actions: [{ label: "Raise urgent request", to: "/hospital/request" }],
  };
}

function hospitalFindDonors() {
  const eligible = donorMatchesForRequest.filter((d) => d.eligible);
  const lines = eligible
    .map((d) => `- **${d.name}** (${d.donorId}) — ${d.distanceKm} km, last donated ${fmtDate(d.lastDonation)}`)
    .join("\n");
  return {
    topic: "eligible donors",
    text: `Eligible **O+** donors near the request:\n${lines}`,
    actions: [],
  };
}

function adminLowStock() {
  const flagged = shortageRisk.filter((s) => s.risk !== "Routine");
  const lines = flagged
    .map((s) => `- **${s.group}** — ${s.currentStock} units, ~${s.daysOfSupply} days of supply (${s.risk})`)
    .join("\n");
  return {
    topic: "low stock",
    text: `Groups needing attention:\n${lines}`,
    actions: [{ label: "Open inventory", to: "/admin/inventory" }],
  };
}

function adminRestock() {
  const lines = restockRecommendations
    .map((r) => `- **${r.group}** (${r.priority}): ${r.action} — target ${r.targetUnits} units`)
    .join("\n");
  return {
    topic: "the restock plan",
    text: `Restock recommendations:\n${lines}`,
    actions: [{ label: "Open inventory", to: "/admin/inventory" }],
  };
}

function adminStatsReply() {
  return {
    topic: "today's stats",
    text: `Right now:\n- **${adminStats.totalDonors.toLocaleString("en-IN")}** registered donors\n- **${adminStats.totalUnitsInStock}** units in stock\n- **${adminStats.pendingRequests}** open requests · **${adminStats.activeAlerts}** active alerts`,
    actions: [{ label: "Open overview", to: "/admin" }],
  };
}

function adminPending() {
  const open = hospitalRequests.filter((r) => r.status === "Pending" || r.status === "Matching");
  const lines = open
    .map((r) => `- **${r.id}** · ${r.hospital}\n  ${r.units} units ${r.bloodGroup} · ${r.urgency} (${r.status})`)
    .join("\n");
  return {
    topic: "pending requests",
    text: `Open requests:\n${lines}`,
    actions: [{ label: "Manage requests", to: "/admin/requests" }],
  };
}

function adminAlerts() {
  const lines = emergencyAlerts.map((a) => `- **${a.severity}**: ${a.detail}`).join("\n");
  return {
    topic: "alerts",
    text: `Active alerts:\n${lines}`,
    actions: [{ label: "View alerts", to: "/admin/alerts" }],
  };
}

function adminForecast() {
  const groups = ["O+", "O-", "B+"].filter((g) => Array.isArray(demandForecast[g]));
  const upcoming = groups.map((g) => {
    const days = demandForecast[g];
    const future = days.filter((d) => d.actual == null).slice(-2);
    const pred = future.map((d) => `~${d.predicted} ${d.day}`).join(", ");
    return `- **${g}**: ${pred || "no forecast"}`;
  });
  return {
    topic: "the demand forecast",
    text: `Upcoming demand prediction:\n${upcoming.join("\n") || "No forecast data yet."}\n\nCheck the restock plan for pressure points.`,
    actions: [
      { label: "Open forecast", to: "/admin/forecast" },
      { label: "Restock plan", to: "/admin/inventory" },
    ],
  };
}

function adminExpiry() {
  const expiring = inventory.filter((i) => i.nearExpiryUnits > 0);
  const lines = expiring
    .map((i) => `- **${i.bloodGroup}**: ${i.nearExpiryUnits} units (earliest ${fmtDate(i.earliestExpiry)})`)
    .join("\n");
  return {
    topic: "expiry",
    text: `Near-expiry units:\n${lines || "None right now."}\n\nHeads up: ${expiring.length ? `${expiring[0].nearExpiryUnits} units of ${expiring[0].bloodGroup} expire within 72 hours — prioritize dispatch.` : "nothing is expiring in the next 72 hours."}`,
    actions: [{ label: "Open inventory", to: "/admin/inventory" }],
  };
}

function adminReports() {
  const months = reportStats.monthlyCollections || [];
  const sep = months[months.length - 1] || {};
  return {
    topic: "reports",
    text: `${sep.month || "This month"} so far: **${sep.collected}** collected, **${sep.distributed}** distributed.\n- Avg fulfillment: **${reportStats.avgFulfillmentHours} hrs** · expiry waste: **${reportStats.expiryWastePercent}%**\n- Top requester: ${reportStats.topRequestingHospitals[0].name} (${reportStats.topRequestingHospitals[0].requests} requests)`,
    actions: [{ label: "Open reports", to: "/admin/reports" }],
  };
}

function adminCamps() {
  const upcoming = donationCamps.filter((c) => c.status === "Upcoming");
  const lines = upcoming
    .map((c) => `- **${c.name}** — ${fmtDate(c.date)}, ${c.location} (expects ~${c.expectedDonors} donors)`)
    .join("\n");
  return {
    topic: "camps",
    text: `Upcoming camps:\n${lines}`,
    actions: [{ label: "Manage camps", to: "/admin/camps" }],
  };
}

function adminCrossmatch() {
  const ok = crossMatchRecords.filter((r) => r.crossMatchResult === "Compatible").length;
  const bad = crossMatchRecords.find((r) => r.crossMatchResult !== "Compatible");
  const badLine = bad
    ? `\nOne incompatible result (${bad.id}) flagged ${bad.antibodyScreen} — that unit was held back.`
    : "";
  return {
    topic: "cross-match",
    text: `**${ok} of ${crossMatchRecords.length}** recent cross-matches came back compatible.${badLine}`,
    actions: [{ label: "Cross-match lab", to: "/admin/crossmatch" }],
  };
}

// ---------------------------------------------------------------------------
// Intent table — ordered; earlier wins ties.
// ---------------------------------------------------------------------------

const INTENTS = [
  // Donor
  { roles: ["donor"], keywords: ["eligib", "can i donate", "donate again", "when can i donate"], reply: donorEligibility },
  { roles: ["donor"], keywords: ["history", "my donations", "past donations", "donation record"], reply: donorHistory },
  { roles: ["donor"], keywords: ["impact", "lives saved", "lives touched", "how many lives"], reply: donorImpact },
  { roles: ["donor"], keywords: ["nearby", "near me", "who needs", "requests"], reply: donorNearby },
  { roles: ["donor"], keywords: ["camp", "blood drive"], reply: donorCamps },
  { roles: ["donor"], keywords: ["my profile", "my details", "my id", "blood group", "my blood", "who am i", "my name", "donor id"], reply: donorProfile },
  { roles: ["donor"], keywords: ["how do i donate", "how to donate", "where can i donate", "want to donate", "start donating", "donate"], reply: donorHowTo },
  { roles: ["donor"], keywords: ["requirement", "criteria", "who can donate", "age limit", "weight"], reply: donorCriteria },
  // Hospital
  { roles: ["hospital"], keywords: ["raise", "new request", "request blood", "need blood", "create request"], reply: hospitalRaise },
  { roles: ["hospital"], keywords: ["my request", "request status", "track", "status of"], reply: hospitalMyRequests },
  { roles: ["hospital"], keywords: ["inventor", "stock", "units available", "available", "how many units"], reply: () => hospitalInventory(null) },
  { roles: ["hospital"], keywords: ["emergency", "critical", "urgent"], reply: hospitalEmergency },
  { roles: ["hospital"], keywords: ["find donor", "match donor", "available donors", "eligible donors", "donors near"], reply: hospitalFindDonors },
  // Admin
  { roles: ["admin"], keywords: ["low stock", "shortage", "running low", "critical stock", "stock"], reply: adminLowStock },
  { roles: ["admin"], keywords: ["restock", "recommend"], reply: adminRestock },
  { roles: ["admin"], keywords: ["stat", "overview", "dashboard", "summary", "today"], reply: adminStatsReply },
  { roles: ["admin"], keywords: ["pending", "open request", "awaiting"], reply: adminPending },
  { roles: ["admin"], keywords: ["alert"], reply: adminAlerts },
  { roles: ["admin"], keywords: ["forecast", "demand", "predict"], reply: adminForecast },
  { roles: ["admin"], keywords: ["expir", "waste"], reply: adminExpiry },
  { roles: ["admin"], keywords: ["report", "analytics"], reply: adminReports },
  { roles: ["admin"], keywords: ["camp"], reply: adminCamps },
  { roles: ["admin"], keywords: ["crossmatch", "cross match", "compatib"], reply: adminCrossmatch },
];

// Direct navigation commands: "open inventory", "go to camps", "take me to my profile"
const NAV_PAGES = {
  donor: [
    { keys: ["profile"], label: "your profile", to: "/donor/profile" },
    { keys: ["history"], label: "donation history", to: "/donor/history" },
    { keys: ["request"], label: "nearby requests", to: "/donor/requests" },
    { keys: ["camp"], label: "camps", to: "/donor/camps" },
    { keys: ["overview", "home", "dashboard"], label: "your dashboard", to: "/donor" },
  ],
  hospital: [
    { keys: ["raise", "new request"], label: "raise request", to: "/hospital/request" },
    { keys: ["request"], label: "your requests", to: "/hospital/requests" },
    { keys: ["inventor", "stock"], label: "inventory", to: "/hospital/inventory" },
    { keys: ["overview", "home", "dashboard"], label: "your dashboard", to: "/hospital" },
  ],
  admin: [
    { keys: ["inventor", "stock"], label: "inventory", to: "/admin/inventory" },
    { keys: ["request"], label: "requests", to: "/admin/requests" },
    { keys: ["alert"], label: "alerts", to: "/admin/alerts" },
    { keys: ["matching"], label: "matching", to: "/admin/matching" },
    { keys: ["crossmatch", "cross match"], label: "cross-match", to: "/admin/crossmatch" },
    { keys: ["camp"], label: "camps", to: "/admin/camps" },
    { keys: ["forecast"], label: "forecast", to: "/admin/forecast" },
    { keys: ["report"], label: "reports", to: "/admin/reports" },
    { keys: ["overview", "home", "dashboard"], label: "overview", to: "/admin" },
  ],
};

function navReply(text, role) {
  if (!/\b(open|go to|take me to|show me|navigate to|visit)\b/.test(text)) return null;
  for (const page of NAV_PAGES[role] || NAV_PAGES.donor) {
    const hit = page.keys.some((k) => text.includes(k) || (k.length >= 5 && keywordScore(text, k) >= 1));
    if (hit) {
      return {
        topic: page.label,
        text: `Opening **${page.label}**…`,
        actions: [],
        goTo: page.to,
      };
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Shared small-talk (runs on raw text, before normalization)
// ---------------------------------------------------------------------------

function sharedReply(raw, role) {
  if (/\b(who are you|your name|are you ai|are you real|what are you|about yourself)\b/.test(raw)) {
    return {
      text: `I'm **Setu**, RaktaSetu's built-in assistant. I run on the app's own data — no internet needed — so I can answer questions about donations, requests, stock, and help you get around.`,
      actions: [],
    };
  }
  if (/^(hi|hii+|hello|hey|namaste|yo|good morning|good afternoon|good evening)\b/.test(raw)) {
    return getGreeting(role);
  }
  if (/\b(thank|thanks|shukriya|dhanyavad)\b/.test(raw)) {
    return { text: `Anytime! Glad I could help. 🩸`, actions: [] };
  }
  if (/\b(bye|see you|good night|goodnight)\b/.test(raw)) {
    return { text: `See you soon — and thanks for being part of the chain that saves lives.`, actions: [] };
  }
  if (/\b(help|what can you do|how does this work)\b/.test(raw)) {
    const topics =
      role === "hospital"
        ? "raising requests, checking inventory, tracking request status, and finding donors"
        : role === "admin"
          ? "stock levels, shortage alerts, pending requests, demand forecasts, and reports"
          : "donation eligibility, your history, nearby requests, and camps";
    return {
      text: `Here's what I can do for you:\n- Answer questions about ${topics}\n- Take you places — try "open inventory" or "go to camps"\n- Point you to the right page for anything else\n\nTry a suggestion below 👇`,
      actions: [],
    };
  }
  return null;
}

const FALLBACK_TOPICS = {
  donor: "eligibility, donation history, nearby requests, or camps",
  hospital: "raising a request, inventory, request status, or finding donors",
  admin: "stock levels, alerts, pending requests, forecasts, or reports",
};

// ---------------------------------------------------------------------------
// Dispatcher
// ---------------------------------------------------------------------------

export function getBotReply(rawText, role, db) {
  bindData(db);
  const raw = rawText.toLowerCase().trim();
  if (!raw) return { text: "", actions: [] };

  const shared = sharedReply(raw, role);
  if (shared) return shared;

  const text = normalize(rawText);
  const negated = NEGATION_RE.test(raw);
  const singleWord = !text.includes(" ");

  // 1. Precise: request ID lookup (hospital + admin)
  const reqMatch = text.match(/req-\d{4}/);
  if (reqMatch && (role === "hospital" || role === "admin")) {
    const req = hospitalRequests.find((r) => r.id.toLowerCase() === reqMatch[0]);
    if (req) {
      const reply = {
        topic: req.id,
        text: `**${req.id}** · ${req.hospital}\n- ${req.units} units ${req.bloodGroup} · ${req.urgency} · **${req.status}**\n- Patient: ${req.patientName} (${req.ward})\n- Notes: ${req.notes}`,
        actions:
          role === "hospital"
            ? [{ label: "Open request", to: `/hospital/requests/${req.id}` }]
            : [{ label: "Open in requests", to: "/admin/requests" }],
      };
      if (negated) return negationReply(reply.topic);
      return reply;
    }
  }

  // 2. Precise: blood-group stock question (hospital + admin)
  const group = findBloodGroup(text);
  if (group && (role === "hospital" || role === "admin")) {
    const item = inventory.find((i) => i.bloodGroup === group);
    if (item) {
      const verdict = item.units <= 10 ? " — **running low**" : "";
      const reply = {
        topic: `${group} stock`,
        text: `**${item.bloodGroup}**: ${item.units} units in stock${verdict}\n- Near expiry: ${item.nearExpiryUnits} units (earliest ${fmtDate(item.earliestExpiry)})`,
        actions: [{ label: "Full inventory", to: role === "hospital" ? "/hospital/inventory" : "/admin/inventory" }],
      };
      if (negated) return negationReply(reply.topic);
      return reply;
    }
  }

  // 3. Navigation commands
  const nav = navReply(text, role);
  if (nav) {
    if (negated) return negationReply(nav.topic);
    return nav;
  }

  // 4. Scored intents — best match wins (earlier intent wins ties)
  let best = null;
  let bestScore = 0;
  for (const intent of INTENTS) {
    if (!intent.roles.includes(role)) continue;
    const s = intentScore(text, intent.keywords);
    if (s > bestScore) {
      bestScore = s;
      best = intent;
    }
  }
  const threshold = singleWord ? 1 : 2;
  if (best && bestScore >= threshold) {
    const reply = best.reply();
    if (negated) return negationReply(reply.topic || "that");
    return reply;
  }

  // 5. Fallback
  return {
    text: `Hmm, I didn't quite catch that. I can help best with **${FALLBACK_TOPICS[role] || FALLBACK_TOPICS.donor}** — try one of the suggestions below, or type "open" + a page name to jump somewhere.`,
    actions: [],
  };
}

function negationReply(topic) {
  return {
    text: `Sounds like you'd rather **not** — no problem, I won't touch ${topic}.\n\nIf I misunderstood, or you need something else, try one of the suggestions below.`,
    actions: [],
  };
}
