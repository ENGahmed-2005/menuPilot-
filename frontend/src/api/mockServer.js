/* ==========================================================================
   mockServer.js — طبقة بيانات وهمية (Mock API) لاختبار الواجهة بدون Laravel
   --------------------------------------------------------------------------
   ليه هذا الملف؟ الـ backend الحقيقي (Laravel) لسه مش شغّال، لكن كل صفحات
   الواجهة بتعتمد على api/*.js اللي بتستدعي request() من client.js. بدل ما
   نلخبط كل صفحة بـ if/else، اعترضنا الطلب من مكان واحد فقط: request()
   في client.js، وحوّلناه هنا لما USE_MOCKS = true.

   الفكرة: نفس شكل الاستجابات تمامًا اللي هيرجعها الـ backend الحقيقي (نفس
   أسماء الحقول)، فلما الـ backend يجهز تقدر تشيل USE_MOCKS بدون ما تغيّر
   حرف واحد في أي صفحة أو ملف api/*.js.

   بيانات وهمية (in-memory) — بترجع لحالتها الأصلية عند تحديث الصفحة (F5).
   ========================================================================== */
import { SUBSCRIPTION_PLANS, getSubscriptionPlan } from "../config/subscriptions";

const SUBSCRIPTION_PLAN_IDS = Object.keys(SUBSCRIPTION_PLANS);

const DELAY_MS = 400; // تأخير مصطنع يحاكي زمن استجابة شبكة حقيقي
const delay = (ms = DELAY_MS) => new Promise((res) => setTimeout(res, ms));

function fail(status, message, errors = null) {
  const err = new Error(message);
  err.status = status;
  err.errors = errors;
  throw err;
}

/* ------------------------------------------------------------------------ *
 * حسابات تجريبية جاهزة لتسجيل الدخول (كل دور له لوحة مختلفة)
 * ------------------------------------------------------------------------ */
export const DEMO_ACCOUNTS = [
  {
    email: "owner@menupilot.test", password: "password123", role: "owner",
    name: "Ahmed Restaurant Group", restaurantName: "Coppertop Kitchen",
    plan: "premium", theme: null, // null = يستخدم هوية menuPilot الافتراضية
  },
  // حسابان إضافيان لنفس الدور owner، كل واحد على باقة مختلفة — عشان تقدر
  // تجرّب فعليًا إزاي اللوحة والمزايا بتختلف حسب الباقة (basic/pro) بدون
  // ما تحتاج تبدّل باقة الحساب الأساسي يدويًا كل مرة.
  {
    email: "owner.basic@menupilot.test", password: "password123", role: "owner",
    name: "Basic Diner", restaurantName: "Sunrise Café",
    plan: "basic", theme: null,
  },
  {
    email: "owner.pro@menupilot.test", password: "password123", role: "owner",
    name: "Pro Bistro Group", restaurantName: "Olive & Ember",
    plan: "pro", theme: null,
  },
  { email: "kitchen@menupilot.test", password: "password123", role: "kitchen", name: "Kitchen Staff" },
  { email: "cashier@menupilot.test", password: "password123", role: "cashier", name: "Cashier Staff" },
  { email: "waiter@menupilot.test", password: "password123", role: "waiter", name: "Waiter Staff" },
  // مسؤول المنصة (System Admin) — دور مختلف تمامًا عن owner: بيشوف كل
  // المطاعم/المستأجرين مجتمعين، مش مطعم واحد بس. مالوش plan خاص بيه.
  { email: "admin@menupilot.test", password: "password123", role: "admin", name: "Platform Admin" },
];

// التوكن يشيل الدور والإيميل جوّاه عشان /auth/me يشتغل حتى بعد إعادة تحميل
// الصفحة (التوكن نفسه محفوظ في localStorage من قبل client.js).
function encodeToken(account) {
  return `mock.${account.role}.${btoa(account.email)}`;
}
function decodeToken(token) {
  if (!token || !token.startsWith("mock.")) return null;
  const [, role, encodedEmail] = token.split(".");
  const email = atob(encodedEmail);
  // نبحث في owners (تشمل الحسابات التجريبية + أي owner جديد اتسجّل وقت
  // التشغيل) بدل DEMO_ACCOUNTS الثابتة، وإلا كان أي owner جديد يسجّل
  // "يُطرد" من جلسته فور أي إعادة تحميل للصفحة لأن decodeToken ميلاقيهوش.
  if (role === "owner") return owners.find((a) => a.email === email) || null;
  return DEMO_ACCOUNTS.find((a) => a.email === email && a.role === role) || null;

}

/* ------------------------------------------------------------------------ *
 * بيانات وهمية أولية (Seed data)
 * ------------------------------------------------------------------------ */
let nextIds = { table: 6, menuItem: 11, session: 104, order: 5003 };

let owners = [...DEMO_ACCOUNTS]; // owners الجدد (تسجيل حساب) يُضافون هنا وقت التشغيل

let tables = [
  { id: 1, label: "Table 1", seats: 2, code: "T01", status: "Occupied", activeSessionId: 103, qrCodeUrl: "https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=T01" },
  { id: 2, label: "Table 2", seats: 4, code: "T02", status: "Occupied", activeSessionId: 101, qrCodeUrl: "https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=T02" },
  { id: 3, label: "Table 3", seats: 4, code: "T03", status: "Available", activeSessionId: null, qrCodeUrl: "https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=T03" },
  { id: 4, label: "Table 4", seats: 6, code: "T04", status: "Occupied", activeSessionId: 102, qrCodeUrl: "https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=T04" },
  { id: 5, label: "Table 5", seats: 2, code: "T05", status: "Available", activeSessionId: null, qrCodeUrl: "https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=T05" },
];

let menuItems = [
  { id: 1, name: "Grilled Halloumi Skewers", price: 8.5, category: "Starters", description: "Charred halloumi, lemon-herb oil, toasted pistachio." },
  { id: 2, name: "Roasted Red Pepper Hummus", price: 6, category: "Starters", description: "Smoky hummus, warm flatbread, chili oil." },
  { id: 3, name: "Herb-Crusted Chicken", price: 15.5, category: "Mains", description: "Free-range chicken breast, rosemary jus, seasonal veg." },
  { id: 4, name: "Slow-Braised Lamb Kofta", price: 17, category: "Mains", description: "Spiced lamb kofta, tahini yogurt, pickled onion." },
  { id: 5, name: "Falafel Wrap", price: 11, category: "Mains", description: "Crispy falafel, pickles, herb sauce, flatbread." },
  { id: 6, name: "Wild Mushroom Risotto", price: 14, category: "Mains", description: "Arborio rice, wild mushrooms, parmesan, truffle oil." },
  { id: 7, name: "Charred Corn Salad", price: 5.5, category: "Sides", description: "Charred corn, feta, lime, coriander." },
  { id: 8, name: "Rosemary Fries", price: 4.5, category: "Sides", description: "Hand-cut fries, rosemary salt, garlic aioli." },
  { id: 9, name: "Pistachio Baklava", price: 6.5, category: "Desserts", description: "Layered filo, pistachio, honey syrup." },
  { id: 10, name: "Mint & Cucumber Lemonade", price: 4, category: "Drinks", description: "Fresh mint, cucumber, lemon, sparkling water." },
];

let sessions = [
  { id: 101, tableId: 2, tableCode: "T02", tableLabel: "Table 2", name: "Sara Youssef", phone: "0599123456", status: "Ordering", assistanceRequested: false, createdAt: new Date(Date.now() - 12 * 60000).toISOString() },
  { id: 102, tableId: 4, tableCode: "T04", tableLabel: "Table 4", name: "Omar Haddad", phone: "0599987654", status: "Ready", assistanceRequested: true, createdAt: new Date(Date.now() - 25 * 60000).toISOString() },
  { id: 103, tableId: 1, tableCode: "T01", tableLabel: "Table 1", name: "Layla Nasser", phone: "0599555222", status: "Bill Requested", assistanceRequested: false, createdAt: new Date(Date.now() - 45 * 60000).toISOString() },
];

let orders = [
  {
    id: 5000, sessionId: 103, orderNumber: "ORD-5000", tableLabel: "Table 1", status: "Served",
    items: [
      { menuItemId: 1, name: "Grilled Halloumi Skewers", quantity: 1, note: "", price: 8.5 },
      { menuItemId: 5, name: "Falafel Wrap", quantity: 1, note: "", price: 11 },
      { menuItemId: 9, name: "Pistachio Baklava", quantity: 2, note: "", price: 6.5 },
    ],
    submittedAt: new Date(Date.now() - 42 * 60000).toISOString(), avgPrepTimeMinutes: 15,
  },
  {
    id: 5001, sessionId: 101, orderNumber: "ORD-5001", tableLabel: "Table 2", status: "Preparing",
    items: [
      { menuItemId: 3, name: "Herb-Crusted Chicken", quantity: 1, note: "", price: 15.5 },
      { menuItemId: 8, name: "Rosemary Fries", quantity: 2, note: "extra crispy", price: 4.5 },
    ],
    submittedAt: new Date(Date.now() - 9 * 60000).toISOString(), avgPrepTimeMinutes: 15,
  },
  {
    id: 5002, sessionId: 102, orderNumber: "ORD-5002", tableLabel: "Table 4", status: "Ready",
    items: [
      { menuItemId: 4, name: "Slow-Braised Lamb Kofta", quantity: 2, note: "no onions", price: 17 },
      { menuItemId: 10, name: "Mint & Cucumber Lemonade", quantity: 2, note: "", price: 4 },
    ],
    submittedAt: new Date(Date.now() - 22 * 60000).toISOString(), avgPrepTimeMinutes: 15,
  },
];

const paidSessionIds = new Set(); // جلسات اتقفلت وتم دفعها

function orderTotal(order) {
  return order.items.reduce((sum, it) => sum + it.price * it.quantity, 0);
}

function sessionBillItems(sessionId) {
  return orders
    .filter((o) => o.sessionId === Number(sessionId))
    .flatMap((o) => o.items)
    .map((it, i) => ({
      id: i + 1,
      name: it.name,
      quantity: it.quantity,
      total: Number((it.price * it.quantity).toFixed(2)),
    }));
}

/* ------------------------------------------------------------------------ *
 * توجيه الطلبات: يحاكي مسارات api/*.js حرفيًا (نفس الأسماء والأشكال)
 * ------------------------------------------------------------------------ */

/** يبني كائن user الراجع في register/login/me. plan/theme بيتضافوا بس
 *  لو الحساب owner، لأن باقي الأدوار (kitchen/cashier/waiter) مالهمش باقة. */
function toUserPayload(account) {
  const base = { id: 1, email: account.email, role: account.role, restaurantName: account.restaurantName };
  if (account.role === "owner") {
    return { ...base, plan: account.plan || "basic", theme: account.theme || null };
  }
  return base;
}

export async function mockRequest(method, rawPath, body, token) {
  await delay();

  const url = new URL(rawPath, "http://mock.local");
  const path = url.pathname;
  const query = Object.fromEntries(url.searchParams);
  const seg = path.split("/").filter(Boolean); // ["public","tables","T01","menu"] مثلًا

  // ------- Auth -------
  if (method === "POST" && path === "/auth/register") {
    const exists = owners.some((o) => o.email === body.email);
    if (exists) fail(422, "Email already registered.", { email: ["This email is already taken."] });
    const account = {
      email: body.email, password: body.password, role: "owner",
      restaurantName: body.restaurant_name,
      // خطوة اختيار الباقة (Register.jsx متعدد الخطوات) بتبعت plan فعليًا —
      // basic تفضل fallback بس لو مفيش قيمة مبعوتة أو غير معروفة.
      plan: SUBSCRIPTION_PLAN_IDS.includes(body.plan) ? body.plan : "basic",
      theme: null,
    };
    owners.push(account);
    return { token: encodeToken(account), user: toUserPayload(account) };
  }

  if (method === "POST" && path === "/auth/login") {
    const account = owners.find((o) => o.email === body.email) || DEMO_ACCOUNTS.find((o) => o.email === body.email);
    if (!account || account.password !== body.password) fail(401, "Invalid email or password.");
    return { token: encodeToken(account), user: toUserPayload(account) };
  }

  if (method === "POST" && path === "/auth/logout") return null;

  // FR-02 امتداد: استرجاع كلمة المرور. برجّع رسالة نجاح عامة دايمًا (حتى لو
  // الإيميل مش مسجّل) عشان ما نكشف قائمة الحسابات الموجودة.
  if (method === "POST" && path === "/auth/forgot-password") {
    return {
      message: "إذا كان البريد الإلكتروني مسجّلاً لدينا، فسنرسل رابط إعادة تعيين كلمة المرور إليه.",
      // ⚠️ للتجربة فقط (بيئة Mock بلا بريد إلكتروني حقيقي): نرجّع توكن وهمي
      // عشان تقدر تكمل رحلة إعادة التعيين كاملة بدون صندوق بريد فعلي.
      // احذف هذا الحقل عند ربط الـ backend الحقيقي — الرابط وقتها يوصل بالإيميل فقط.
      _devResetToken: btoa(body.email || ""),
    };
  }

  if (method === "POST" && path === "/auth/reset-password") {
    const account =
      owners.find((o) => o.email === body.email) ||
      DEMO_ACCOUNTS.find((o) => o.email === body.email);
    if (!account) fail(422, "رابط إعادة التعيين غير صالح أو منتهي الصلاحية.");
    account.password = body.password;
    return { message: "تم تحديث كلمة المرور بنجاح." };
  }

  if (method === "GET" && path === "/auth/me") {
    const account = decodeToken(token);
    if (!account) fail(401, "Session expired.");
    return toUserPayload(account);
  }

  // ------- Admin: نظرة عامة على كل المطاعم (Platform Admin) -------
  if (method === "GET" && path === "/admin/restaurants") {
    const account = decodeToken(token);
    if (!account || account.role !== "admin") fail(403, "Admins only.");
    return owners.map((o, i) => ({
      id: i,
      email: o.email,
      restaurantName: o.restaurantName || "—",
      plan: o.plan || "basic",
    }));
  }

  if (method === "PATCH" && seg[0] === "admin" && seg[1] === "restaurants" && seg[3] === "plan") {
    const account = decodeToken(token);
    if (!account || account.role !== "admin") fail(403, "Admins only.");
    if (!SUBSCRIPTION_PLAN_IDS.includes(body.plan)) fail(422, "Unknown plan.");
    const target = owners[Number(seg[2])];
    if (!target) fail(404, "Restaurant not found.");
    target.plan = body.plan;
    return { email: target.email, restaurantName: target.restaurantName, plan: target.plan };
  }

  // ------- Owner: تبديل باقة الاشتراك (اختبار مباشر من صفحة الاشتراك) -------
  if (method === "PATCH" && path === "/me/plan") {
    const account = decodeToken(token);
    if (!account || account.role !== "owner") fail(401, "Session expired.");
    if (!SUBSCRIPTION_PLAN_IDS.includes(body.plan)) fail(422, "Unknown plan.");
    account.plan = body.plan;
    return toUserPayload(account);
  }

  // ------- Owner: حفظ الثيم المختار (تخصيص المنيو/لوحة التحكم) -------
  if (method === "PATCH" && path === "/me/theme") {
    const account = decodeToken(token);
    if (!account || account.role !== "owner") fail(401, "Session expired.");
    account.theme = body.theme; // { preset: "forest" } أو { preset: "custom", colors: {...} }
    return toUserPayload(account);
  }

  // ------- Owner: Tables (FR-04..07) -------
  if (method === "GET" && path === "/tables") return tables;

  if (method === "POST" && path === "/tables") {
    // فرض حد عدد الطاولات حسب باقة صاحب الطلب. ملاحظة: الطاولات كلها في
    // مصفوفة عامة واحدة (مفيش فصل حقيقي بين مطاعم في هذا الـ mock)، فالحد
    // هنا بيتحقق على العدد الكلي الحالي — كافٍ لإظهار وتجربة سلوك تجاوز
    // الحد فعليًا، مش عزل بيانات حقيقي بين المستأجرين.
    const account = decodeToken(token);
    const plan = getSubscriptionPlan(account?.plan);
    if (tables.length >= plan.limits.tables) {
      fail(403, `وصلت للحد الأقصى لعدد الطاولات في باقة ${plan.name} (${plan.limits.tables}). رقّي باقتك لإضافة المزيد.`);
    }
    const table = {
      id: nextIds.table++,
      label: body.label,
      seats: body.seats,
      code: `T${String(nextIds.table).padStart(2, "0")}`,
      status: "Available",
      activeSessionId: null,
      qrCodeUrl: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=T${nextIds.table}`,
    };
    tables.push(table);
    return table;
  }

  if (method === "PUT" && seg[0] === "tables" && seg.length === 2) {
    const id = Number(seg[1]);
    tables = tables.map((t) => (t.id === id ? { ...t, ...body } : t));
    return tables.find((t) => t.id === id);
  }

  if (method === "DELETE" && seg[0] === "tables" && seg.length === 2) {
    const id = Number(seg[1]);
    tables = tables.filter((t) => t.id !== id);
    return null;
  }

  if (method === "GET" && seg[0] === "tables" && seg[2] === "status") {
    const id = Number(seg[1]);
    const table = tables.find((t) => t.id === id);
    if (!table) fail(404, "Table not found.");
    return { status: table.status };
  }

  // ------- Owner: Menu (FR-08..10) -------
  if (method === "GET" && path === "/menu-items") return menuItems;

  if (method === "POST" && path === "/menu-items") {
    const account = decodeToken(token);
    const plan = getSubscriptionPlan(account?.plan);
    if (menuItems.length >= plan.limits.menuItems) {
      fail(403, `وصلت للحد الأقصى لعدد أصناف القائمة في باقة ${plan.name} (${plan.limits.menuItems}). رقّي باقتك لإضافة المزيد.`);
    }
    const item = { id: nextIds.menuItem++, ...body };
    menuItems.push(item);
    return item;
  }

  if (method === "PUT" && seg[0] === "menu-items" && seg.length === 2) {
    const id = Number(seg[1]);
    menuItems = menuItems.map((m) => (m.id === id ? { ...m, ...body } : m));
    return menuItems.find((m) => m.id === id);
  }

  if (method === "DELETE" && seg[0] === "menu-items" && seg.length === 2) {
    const id = Number(seg[1]);
    menuItems = menuItems.filter((m) => m.id !== id);
    return null;
  }

  // ------- Public: menu by table QR code (FR-11) -------
  if (method === "GET" && seg[0] === "public" && seg[1] === "tables" && seg[3] === "menu") {
    return menuItems;
  }

  // ------- Public: open a dining session (FR-24..26) -------
  if (method === "POST" && seg[0] === "public" && seg[1] === "tables" && seg[3] === "sessions") {
    const code = seg[2];
    const table = tables.find((t) => t.code === code);
    if (!table) fail(404, "Table not found.");
    if (table.activeSessionId) fail(409, "This table already has an active session.");

    const session = {
      id: nextIds.session++,
      tableId: table.id,
      tableCode: table.code,
      tableLabel: table.label,
      name: body.name,
      phone: body.phone,
      status: "Ordering",
      assistanceRequested: false,
      createdAt: new Date().toISOString(),
    };
    sessions.push(session);
    table.status = "Occupied";
    table.activeSessionId = session.id;
    return session;
  }

  if (method === "GET" && seg[0] === "public" && seg[1] === "sessions" && seg.length === 3) {
    const session = sessions.find((s) => s.id === Number(seg[2]));
    if (!session) fail(404, "Session not found.");
    return session;
  }

  // ------- Public: cart submission + live tracking (FR-12..20) -------
  if (method === "POST" && seg[0] === "public" && seg[1] === "sessions" && seg[3] === "orders") {
    const sessionId = Number(seg[2]);
    const order = {
      id: nextIds.order++,
      sessionId,
      orderNumber: `ORD-${nextIds.order}`,
      tableLabel: sessions.find((s) => s.id === sessionId)?.tableLabel || "—",
      status: "Pending",
      items: body.items.map((it) => {
        const menuItem = menuItems.find((m) => m.id === it.menuItemId);
        return { menuItemId: it.menuItemId, name: menuItem?.name || "Item", note: it.note || "", quantity: it.quantity, price: menuItem?.price || 0 };
      }),
      submittedAt: new Date().toISOString(),
      avgPrepTimeMinutes: 15,
    };
    orders.push(order);
    const session = sessions.find((s) => s.id === sessionId);
    if (session) session.status = "Preparing";
    return order;
  }

  if (method === "GET" && seg[0] === "public" && seg[1] === "sessions" && seg[3] === "orders") {
    const sessionId = Number(seg[2]);
    return orders.filter((o) => o.sessionId === sessionId);
  }

  // ------- Kitchen (FR-18, 19, 38, 39) -------
  if (method === "GET" && path === "/kitchen/orders") {
    const list = [...orders];
    if (query.sort_by === "prepTime") {
      list.sort((a, b) => new Date(a.submittedAt) - new Date(b.submittedAt));
    }
    return list;
  }

  if (method === "PATCH" && seg[0] === "kitchen" && seg[1] === "orders" && seg[3] === "status") {
    const id = Number(seg[2]);
    orders = orders.map((o) => (o.id === id ? { ...o, status: body.status } : o));
    return orders.find((o) => o.id === id);
  }

  // ------- Order item cancel / reassign (FR-33, FR-34) -------
  if (method === "POST" && seg[0] === "order-items" && seg[2] === "cancel") return { ok: true };
  if (method === "POST" && seg[0] === "order-items" && seg[2] === "reassign") return { ok: true };

  // ------- Owner: orders list (FR-21) -------
  if (method === "GET" && path === "/owner/orders") {
    return orders.map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      tableLabel: o.tableLabel,
      status: o.status,
      total: Number(orderTotal(o).toFixed(2)),
    }));
  }

  // ------- Waiter assistance (FR-41) -------
  if (method === "POST" && seg[0] === "public" && seg[1] === "sessions" && seg[3] === "assistance-requests") {
    const session = sessions.find((s) => s.id === Number(seg[2]));
    if (!session) fail(404, "Session not found.");
    session.assistanceRequested = true;
    return { ok: true };
  }

  if (method === "GET" && path === "/sessions" && query.status === "active") {
    return sessions
      .filter((s) => s.status !== "Closed")
      .map((s) => ({ id: s.id, tableLabel: s.tableLabel, status: s.status, assistanceRequested: s.assistanceRequested }));
  }

  // ------- Billing (FR-27..32, 36, 37) -------
  if (method === "POST" && seg[0] === "public" && seg[1] === "sessions" && seg[3] === "bill-request") {
    const session = sessions.find((s) => s.id === Number(seg[2]));
    if (!session) fail(404, "Session not found.");
    session.status = "Bill Requested";
    return { ok: true };
  }

  if (method === "GET" && seg[0] === "sessions" && seg[2] === "bill") {
    const sessionId = Number(seg[1]);
    const items = sessionBillItems(sessionId);
    const total = Number(items.reduce((sum, it) => sum + it.total, 0).toFixed(2));
    return { sessionId, items, total, status: paidSessionIds.has(sessionId) ? "Paid" : "Unpaid" };
  }

  if (method === "POST" && seg[0] === "sessions" && seg[2] === "payment") {
    const sessionId = Number(seg[1]);
    paidSessionIds.add(sessionId);
    const session = sessions.find((s) => s.id === sessionId);
    if (session) session.status = "Closed"; // FR-31
    const table = tables.find((t) => t.activeSessionId === sessionId);
    if (table) {
      table.status = "Available"; // FR-32
      table.activeSessionId = null;
    }
    return { ok: true };
  }

  if (method === "PATCH" && seg[0] === "sessions" && seg[2] === "bill-items") {
    return { ok: true, ...body };
  }

  // لا يوجد مسار مطابق
  fail(404, `Mock API: no route for ${method} ${path}`);
}
