export const initialRestaurants = [
  {
    id: 1,
    name: "مطعم الشذا",
    owner: "أحمد محمود",
    plan: "Pro",
    tables: 12,
    revenue: 12450,
    active: true,
  },
  {
    id: 2,
    name: "كافيه البسمة",
    owner: "سارة خالد",
    plan: "Standard",
    tables: 8,
    revenue: 6200,
    active: true,
  },
  {
    id: 3,
    name: "مطعم دمشق الأصيل",
    owner: "محمود علي",
    plan: "Enterprise",
    tables: 20,
    revenue: 0,
    active: false,
  },
];

export const initialUsers = [
  {
    id: 1,
    name: "أحمد محمود",
    email: "ahmad@alshatha.com",
    role: "مالك",
    restaurant: "مطعم الشذا",
    active: true,
  },
  {
    id: 2,
    name: "سارة خالد",
    email: "sara@albasma.com",
    role: "مالك",
    restaurant: "كافيه البسمة",
    active: true,
  },
  {
    id: 3,
    name: "محمود علي",
    email: "mahmoud@damascus.com",
    role: "مالك",
    restaurant: "مطعم دمشق الأصيل",
    active: false,
  },
  {
    id: 4,
    name: "ليلى حسن",
    email: "layla@alshatha.com",
    role: "كاشير",
    restaurant: "مطعم الشذا",
    active: true,
  },
  {
    id: 5,
    name: "عمر يوسف",
    email: "omar@alshatha.com",
    role: "مطبخ",
    restaurant: "مطعم الشذا",
    active: true,
  },
  {
    id: 6,
    name: "هدى سالم",
    email: "huda@albasma.com",
    role: "نادل",
    restaurant: "كافيه البسمة",
    active: true,
  },
];

export function money(value) {
  const amount = Number(value || 0);

  return `${new Intl.NumberFormat("ar-SA").format(amount)} ر.س`;
}

export function StatCard({ title, value, icon: Icon, color }) {
  return (
    <div className="admin-stat-card">
      <div className={`admin-stat-icon ${color}`}>
        <Icon size={22} />
      </div>

      <div>
        <p>{title}</p>
        <strong>{value}</strong>
        <small>محدث هذا الشهر</small>
      </div>
    </div>
  );
}