import React, { useMemo, useState } from "react";
import {
  Search,
  ShoppingBag,
  Heart,
  Star,
  Plus,
  Minus,
  Trash2,
  X,
  UtensilsCrossed,
  Clock3,
  Truck,
  ShieldCheck,
  ChevronLeft,
  Menu,
  ArrowLeft,
  Sparkles,
  ChefHat,
  Receipt,
  CheckCircle2,
} from "lucide-react";

/* =========================================================
   MENU DATA
========================================================= */

const MENU_PRODUCTS = [
  {
    id: 1,
    name: "ستيك دار النكهة",
    description:
      "ريب آي مشوي على الفحم، صوص الفلفل الأسود وخضار موسمية.",
    price: 52,
    category: "main",
    rating: 4.9,
    reviews: 128,
    badge: "الأكثر طلباً",
  },
  {
    id: 2,
    name: "بيتزا المتوسط",
    description:
      "عجينة مخمرة 48 ساعة، خضار مشوية، ريحان وجبن موزاريلا.",
    price: 34,
    category: "pizza",
    rating: 4.8,
    reviews: 96,
    badge: "جديد",
  },
  {
    id: 3,
    name: "برجر لحم كلاسيك",
    description:
      "لحم بقري طازج، جبنة شيدر، بصل مكرمل وصلصة البيت.",
    price: 29,
    category: "main",
    rating: 4.7,
    reviews: 74,
  },
  {
    id: 4,
    name: "سلطة دار النكهة",
    description:
      "جرجير، أفوكادو، طماطم كرزية، رمان وتتبيلة الليمون.",
    price: 19,
    category: "appetizers",
    rating: 4.6,
    reviews: 51,
    badge: "خفيف ولذيذ",
  },
  {
    id: 5,
    name: "معكرونة الفطر الكريمية",
    description:
      "فيتوتشيني طازجة، فطر بري، بارميزان ولمسة زيت الكمأة.",
    price: 31,
    category: "main",
    rating: 4.8,
    reviews: 63,
  },
  {
    id: 6,
    name: "تشيزكيك التمر",
    description:
      "تشيزكيك مخبوز، صوص التمر والمملح يقدم مع فتات بسكويت محمص.",
    price: 18,
    category: "sweets",
    rating: 4.9,
    reviews: 42,
    badge: "اختيار الشيف",
  },
];

const CATEGORIES = [
  {
    id: "all",
    label: "الكل",
  },
  {
    id: "appetizers",
    label: "المقبلات",
  },
  {
    id: "main",
    label: "الأطباق الرئيسية",
  },
  {
    id: "pizza",
    label: "البيتزا",
  },
  {
    id: "sweets",
    label: "الحلويات",
  },
];

/* =========================================================
   MAIN COMPONENT
========================================================= */

export default function DarAlNakahMenu() {
  const [selectedCategory, setSelectedCategory] =
    useState("all");

  const [searchQuery, setSearchQuery] = useState("");

  const [favorites, setFavorites] = useState([]);

  const [cart, setCart] = useState([]);

  const [isCartOpen, setIsCartOpen] = useState(false);

  const [isMobileMenuOpen, setIsMobileMenuOpen] =
    useState(false);

  const [activeSection, setActiveSection] =
    useState("menu");

  const deliveryFee = 2.5;

  /* =========================================================
     FILTER PRODUCTS
  ========================================================= */

  const filteredProducts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return MENU_PRODUCTS.filter((product) => {
      const categoryMatch =
        selectedCategory === "all" ||
        product.category === selectedCategory;

      const searchMatch =
        query === "" ||
        product.name.toLowerCase().includes(query) ||
        product.description.toLowerCase().includes(query);

      return categoryMatch && searchMatch;
    });
  }, [selectedCategory, searchQuery]);

  /* =========================================================
     FAVORITES
  ========================================================= */

  const toggleFavorite = (productId) => {
    setFavorites((current) => {
      if (current.includes(productId)) {
        return current.filter((id) => id !== productId);
      }

      return [...current, productId];
    });
  };

  /* =========================================================
     CART
  ========================================================= */

  const addToCart = (product) => {
    setCart((currentCart) => {
      const existingProduct = currentCart.find(
        (item) => item.id === product.id
      );

      if (existingProduct) {
        return currentCart.map((item) =>
          item.id === product.id
            ? {
                ...item,
                quantity: item.quantity + 1,
              }
            : item
        );
      }

      return [
        ...currentCart,
        {
          ...product,
          quantity: 1,
        },
      ];
    });

    setIsCartOpen(true);
  };

  const updateQuantity = (productId, change) => {
    setCart((currentCart) =>
      currentCart
        .map((item) => {
          if (item.id !== productId) {
            return item;
          }

          return {
            ...item,
            quantity: item.quantity + change,
          };
        })
        .filter((item) => item.quantity > 0)
    );
  };

  const removeFromCart = (productId) => {
    setCart((currentCart) =>
      currentCart.filter((item) => item.id !== productId)
    );
  };

  /* =========================================================
     CART CALCULATIONS
  ========================================================= */

  const cartItemsCount = cart.reduce(
    (total, item) => total + item.quantity,
    0
  );

  const subtotal = cart.reduce(
    (total, item) => total + item.price * item.quantity,
    0
  );

  const total =
    cart.length > 0
      ? subtotal + deliveryFee
      : 0;

  /* =========================================================
     NAVIGATION
  ========================================================= */

  const scrollToSection = (sectionId) => {
    document
      .getElementById(sectionId)
      ?.scrollIntoView({
        behavior: "smooth",
      });

    setActiveSection(sectionId);

    setIsMobileMenuOpen(false);
  };

  /* =========================================================
     RENDER
  ========================================================= */

  return (
    <div
      dir="rtl"
      className="min-h-screen bg-[#f7f4ed] text-[#2b2825]"
    >
      {/* =====================================================
          NAVBAR
      ===================================================== */}

      <header className="sticky top-0 z-40 border-b border-black/5 bg-[#f7f4ed]/95 backdrop-blur-xl">
        <div className="mx-auto flex h-[76px] max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          
          {/* LOGO */}

          <button
            onClick={() => scrollToSection("menu")}
            className="group flex items-center gap-3"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#1f1d1b] shadow-sm transition group-hover:scale-105">
              <UtensilsCrossed
                size={21}
                className="text-[#e59819]"
              />
            </div>

            <div className="text-right">
              <h1 className="text-lg font-black">
                دار النكهة
              </h1>

              <p className="text-[11px] font-medium text-[#81786f]">
                نكهة تُحكى
              </p>
            </div>
          </button>

          {/* DESKTOP NAV */}

          <nav className="hidden items-center gap-8 md:flex">
            <button
              onClick={() => scrollToSection("menu")}
              className={`text-sm font-bold transition ${
                activeSection === "menu"
                  ? "text-[#e59819]"
                  : "text-[#5e5750] hover:text-[#e59819]"
              }`}
            >
              المنيو
            </button>

            <button
              onClick={() => scrollToSection("story")}
              className={`text-sm font-bold transition ${
                activeSection === "story"
                  ? "text-[#e59819]"
                  : "text-[#5e5750] hover:text-[#e59819]"
              }`}
            >
              قصتنا
            </button>

            <button
              onClick={() => scrollToSection("contact")}
              className={`text-sm font-bold transition ${
                activeSection === "contact"
                  ? "text-[#e59819]"
                  : "text-[#5e5750] hover:text-[#e59819]"
              }`}
            >
              تواصل معنا
            </button>
          </nav>

          {/* ACTIONS */}

          <div className="flex items-center gap-2">
            <button
              onClick={() => setFavorites([])}
              className="hidden h-11 w-11 items-center justify-center rounded-xl border border-black/5 bg-white shadow-sm sm:flex"
            >
              <Heart
                size={19}
                className={
                  favorites.length > 0
                    ? "fill-[#e59819] text-[#e59819]"
                    : ""
                }
              />
            </button>

            <button
              onClick={() => setIsCartOpen(true)}
              className="relative flex h-11 items-center gap-2 rounded-xl bg-[#1f1d1b] px-4 text-sm font-bold text-white transition hover:bg-[#302d2a]"
            >
              <ShoppingBag size={18} />

              <span className="hidden sm:block">
                سلة الطلب
              </span>

              {cartItemsCount > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#e59819] px-1.5 text-[10px] font-black text-[#1f1d1b]">
                  {cartItemsCount}
                </span>
              )}
            </button>

            <button
              onClick={() =>
                setIsMobileMenuOpen(
                  !isMobileMenuOpen
                )
              }
              className="flex h-11 w-11 items-center justify-center rounded-xl border border-black/5 bg-white md:hidden"
            >
              {isMobileMenuOpen ? (
                <X size={20} />
              ) : (
                <Menu size={20} />
              )}
            </button>
          </div>
        </div>

        {/* MOBILE MENU */}

        {isMobileMenuOpen && (
          <div className="border-t border-black/5 bg-[#f7f4ed] px-4 py-4 md:hidden">
            <div className="mx-auto flex max-w-7xl flex-col gap-1">
              <button
                onClick={() => scrollToSection("menu")}
                className="rounded-xl px-4 py-3 text-right text-sm font-bold hover:bg-white"
              >
                المنيو
              </button>

              <button
                onClick={() => scrollToSection("story")}
                className="rounded-xl px-4 py-3 text-right text-sm font-bold hover:bg-white"
              >
                قصتنا
              </button>

              <button
                onClick={() =>
                  scrollToSection("contact")
                }
                className="rounded-xl px-4 py-3 text-right text-sm font-bold hover:bg-white"
              >
                تواصل معنا
              </button>
            </div>
          </div>
        )}
      </header>

      {/* =====================================================
          HERO
      ===================================================== */}

      <section className="border-b border-black/5">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
          <div className="relative overflow-hidden rounded-[32px] bg-[#1f1d1b]">
            
            {/* DECORATIONS */}

            <div className="absolute -left-24 -top-24 h-64 w-64 rounded-full border border-[#e59819]/10" />

            <div className="absolute -bottom-32 right-10 h-72 w-72 rounded-full border border-[#e59819]/10" />

            <div className="relative grid min-h-[380px] items-center gap-10 px-7 py-12 sm:px-10 lg:grid-cols-2 lg:px-16">

              {/* HERO TEXT */}

              <div>
                <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold text-[#e7ddd1]">
                  <Sparkles
                    size={14}
                    className="text-[#e59819]"
                  />
                  تجربة طعام مختلفة
                </div>

                <h2 className="text-4xl font-black leading-tight text-white sm:text-5xl lg:text-6xl">
                  نكهة تُحكى،
                  <br />
                  <span className="text-[#e59819]">
                    وتجربة تُعاش.
                  </span>
                </h2>

                <p className="mt-5 max-w-lg text-sm leading-7 text-[#b9b1a8] sm:text-base">
                  اكتشف قائمتنا، اختر وجبتك، وأرسل طلبك
                  مباشرة إلى المطبخ. كل شيء أصبح أسهل
                  من خلال تجربة رقمية بسيطة وسلسة.
                </p>

                <div className="mt-8 flex flex-wrap gap-3">
                  <button
                    onClick={() =>
                      scrollToSection("menu")
                    }
                    className="flex items-center gap-2 rounded-xl bg-[#e59819] px-5 py-3.5 text-sm font-black text-[#1f1d1b] transition hover:bg-[#f0a92c]"
                  >
                    استكشف المنيو
                    <ChevronLeft size={17} />
                  </button>

                  <button
                    onClick={() =>
                      setIsCartOpen(true)
                    }
                    className="rounded-xl border border-white/10 bg-white/5 px-5 py-3.5 text-sm font-bold text-white transition hover:bg-white/10"
                  >
                    عرض السلة
                  </button>
                </div>
              </div>

              {/* HERO CARD */}

              <div className="hidden lg:flex lg:justify-end">
                <div className="relative w-[330px]">
                  <div className="relative rounded-[32px] border border-white/10 bg-[#292624] p-6 shadow-2xl">
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-[#958d84]">
                          تجربة الطلب
                        </p>

                        <p className="mt-1 font-black text-white">
                          بسيطة. سريعة. متصلة.
                        </p>
                      </div>

                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#e59819]">
                        <ChefHat
                          size={21}
                          className="text-[#1f1d1b]"
                        />
                      </div>
                    </div>

                    <div className="mt-6 space-y-3">
                      <HeroStep
                        icon={Search}
                        title="تصفح المنيو"
                        text="اكتشف الوجبات"
                      />

                      <HeroStep
                        icon={ShoppingBag}
                        title="أضف للسلة"
                        text="خصص طلبك"
                      />

                      <HeroStep
                        icon={CheckCircle2}
                        title="أرسل الطلب"
                        text="يصل للمطبخ مباشرة"
                      />
                    </div>

                    <div className="mt-5 flex items-center justify-between rounded-2xl bg-[#e59819] px-4 py-3">
                      <span className="text-xs font-black text-[#1f1d1b]">
                        جاهز لطلبك؟
                      </span>

                      <ArrowLeft
                        size={17}
                        className="text-[#1f1d1b]"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================
          MENU
      ===================================================== */}

      <main id="menu">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">

          {/* TITLE */}

          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-3 flex items-center gap-2 text-xs font-black text-[#e59819]">
                <span className="h-px w-7 bg-[#e59819]" />
                قائمتنا
              </div>

              <h2 className="text-3xl font-black sm:text-4xl">
                اختر ما يناسبك
              </h2>

              <p className="mt-2 max-w-xl text-sm leading-6 text-[#81786f]">
                مجموعة مختارة من أطباقنا المحضرة بعناية
                لتجعل تجربتك أكثر تميزاً.
              </p>
            </div>

            {/* STATUS */}

            <div className="flex flex-wrap gap-2">
              <div className="flex items-center gap-2 rounded-xl border border-black/5 bg-white px-3.5 py-2.5 text-xs font-bold shadow-sm">
                <span className="h-2 w-2 rounded-full bg-green-500" />
                مفتوح الآن
              </div>

              <div className="flex items-center gap-2 rounded-xl border border-black/5 bg-white px-3.5 py-2.5 text-xs font-bold text-[#625b54] shadow-sm">
                <Clock3 size={14} />
                حتى 11:30 مساءً
              </div>

              <div className="flex items-center gap-2 rounded-xl border border-black/5 bg-white px-3.5 py-2.5 text-xs font-bold text-[#625b54] shadow-sm">
                <Truck size={14} />
                35 دقيقة
              </div>
            </div>
          </div>

          {/* SEARCH */}

          <div className="mt-9">
            <div className="relative">
              <Search
                size={19}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-[#938a81]"
              />

              <input
                type="text"
                value={searchQuery}
                onChange={(e) =>
                  setSearchQuery(e.target.value)
                }
                placeholder="ابحث عن وجبتك المفضلة..."
                className="h-13 w-full rounded-2xl border border-black/5 bg-white pr-12 pl-4 text-sm font-medium outline-none shadow-sm transition placeholder:text-[#aaa19a] focus:border-[#e59819]/40 focus:ring-4 focus:ring-[#e59819]/5"
              />

              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute left-4 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-[#f1ede7]"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {/* CATEGORIES */}

          <div className="mt-5 flex gap-2 overflow-x-auto pb-2">
            {CATEGORIES.map((category) => {
              const active =
                selectedCategory === category.id;

              return (
                <button
                  key={category.id}
                  onClick={() =>
                    setSelectedCategory(category.id)
                  }
                  className={`shrink-0 rounded-xl px-5 py-3 text-sm font-bold transition ${
                    active
                      ? "bg-[#1f1d1b] text-white shadow-md"
                      : "border border-black/5 bg-white text-[#665f58] hover:text-[#e59819]"
                  }`}
                >
                  {category.label}
                </button>
              );
            })}
          </div>

          {/* PRODUCTS COUNT */}

          <div className="mt-8 flex items-center justify-between">
            <p className="text-sm font-bold text-[#81786f]">
              {filteredProducts.length} منتجات
            </p>

            {searchQuery && (
              <p className="text-xs text-[#a0968d]">
                نتائج البحث عن:{" "}
                <span className="font-bold text-[#4c4641]">
                  {searchQuery}
                </span>
              </p>
            )}
          </div>

          {/* PRODUCT GRID */}

          {filteredProducts.length > 0 ? (
            <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {filteredProducts.map((product) => {
                const isFavorite = favorites.includes(
                  product.id
                );

                return (
                  <article
                    key={product.id}
                    className="group overflow-hidden rounded-[26px] border border-black/5 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl"
                  >
                    {/* PRODUCT VISUAL */}

                    <div className="relative h-44 overflow-hidden bg-[#f3eee5]">
                      
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="absolute h-32 w-32 rounded-full border border-[#e59819]/15" />

                        <div className="absolute h-24 w-24 rounded-full border border-[#e59819]/10" />

                        <div className="relative flex h-20 w-20 items-center justify-center rounded-[24px] bg-[#1f1d1b] shadow-xl transition duration-300 group-hover:scale-110">
                          <UtensilsCrossed
                            size={31}
                            className="text-[#e59819]"
                          />
                        </div>
                      </div>

                      {/* BADGE */}

                      {product.badge && (
                        <span className="absolute right-4 top-4 rounded-full bg-[#e59819] px-3 py-1.5 text-[10px] font-black text-[#1f1d1b]">
                          {product.badge}
                        </span>
                      )}

                      {/* FAVORITE */}

                      <button
                        onClick={() =>
                          toggleFavorite(product.id)
                        }
                        className="absolute left-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-md transition hover:scale-105"
                      >
                        <Heart
                          size={17}
                          className={
                            isFavorite
                              ? "fill-red-500 text-red-500"
                              : "text-[#4e4842]"
                          }
                        />
                      </button>

                      {/* RATING */}

                      <div className="absolute bottom-4 right-4 flex items-center gap-1 rounded-full bg-white px-2.5 py-1.5 text-[11px] font-black shadow-sm">
                        <Star
                          size={13}
                          className="fill-[#e59819] text-[#e59819]"
                        />

                        {product.rating}
                      </div>
                    </div>

                    {/* PRODUCT INFO */}

                    <div className="p-5">
                      <h3 className="text-lg font-black">
                        {product.name}
                      </h3>

                      <p className="mt-2 line-clamp-2 text-xs leading-6 text-[#81786f]">
                        {product.description}
                      </p>

                      <div className="mt-5 flex items-center justify-between border-t border-black/5 pt-4">
                        <div>
                          <p className="text-xl font-black">
                            {product.price.toFixed(2)}

                            <span className="mr-1 text-xs font-bold text-[#8b8279]">
                              د.أ
                            </span>
                          </p>

                          <p className="mt-0.5 text-[10px] text-[#aaa19a]">
                            {product.reviews} تقييم
                          </p>
                        </div>

                        <button
                          onClick={() =>
                            addToCart(product)
                          }
                          className="flex h-11 items-center gap-2 rounded-xl bg-[#1f1d1b] px-4 text-xs font-black text-white transition hover:bg-[#e59819] hover:text-[#1f1d1b]"
                        >
                          <Plus size={16} />
                          أضف للسلة
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            /* EMPTY */

            <div className="mt-6 rounded-[28px] border border-dashed border-black/10 bg-white px-6 py-16 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#f3eee5]">
                <Search
                  size={25}
                  className="text-[#a59b91]"
                />
              </div>

              <h3 className="mt-5 text-lg font-black">
                لم نجد ما تبحث عنه
              </h3>

              <p className="mt-2 text-sm text-[#8c837b]">
                جرّب كلمة أخرى أو اختر تصنيفاً مختلفاً.
              </p>

              <button
                onClick={() => {
                  setSearchQuery("");
                  setSelectedCategory("all");
                }}
                className="mt-5 rounded-xl bg-[#1f1d1b] px-5 py-3 text-xs font-bold text-white"
              >
                عرض جميع المنتجات
              </button>
            </div>
          )}
        </div>
      </main>

      {/* =====================================================
          FEATURES
      ===================================================== */}

      <section className="border-y border-black/5 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            
            <Feature
              icon={ShoppingBag}
              title="طلب مباشر"
              text="أرسل طلبك بسهولة دون انتظار طويل."
            />

            <Feature
              icon={ChefHat}
              title="للمطبخ مباشرة"
              text="طلبك ينتقل مباشرة إلى فريق المطبخ."
            />

            <Feature
              icon={Receipt}
              title="فاتورة واضحة"
              text="تابع تفاصيل طلبك والمبلغ بكل وضوح."
            />

            <Feature
              icon={ShieldCheck}
              title="تجربة آمنة"
              text="خطوات واضحة من الطلب حتى الدفع."
            />
          </div>
        </div>
      </section>

      {/* =====================================================
          STORY
      ===================================================== */}

      <section
        id="story"
        className="bg-[#f7f4ed]"
      >
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="grid items-center gap-10 lg:grid-cols-2">
            
            <div>
              <div className="mb-3 flex items-center gap-2 text-xs font-black text-[#e59819]">
                <span className="h-px w-7 bg-[#e59819]" />
                قصتنا
              </div>

              <h2 className="text-3xl font-black leading-tight sm:text-4xl">
                لأن تجربة المطعم
                <br />
                تبدأ قبل أول لقمة.
              </h2>

              <p className="mt-5 max-w-xl text-sm leading-7 text-[#746c64]">
                صممنا هذه التجربة لتكون عملية وبسيطة.
                بدلاً من الانتظار، يمكن للعميل تصفح
                المنيو وإرسال الطلب ومتابعة حالته بطريقة
                رقمية واضحة.
              </p>
            </div>

            <div className="space-y-3">
              
              <StoryStep
                number="01"
                title="تصفح"
                text="استكشف القائمة واختر وجبتك."
              />

              <StoryStep
                number="02"
                title="اطلب"
                text="خصص طلبك وأرسله للمطبخ."
              />

              <StoryStep
                number="03"
                title="استمتع"
                text="تابع الطلب حتى يصبح جاهزاً."
              />

            </div>
          </div>
        </div>
      </section>

      {/* =====================================================
          FOOTER
      ===================================================== */}

      <footer
        id="contact"
        className="bg-[#1f1d1b] text-white"
      >
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="grid gap-10 md:grid-cols-3">
            
            {/* BRAND */}

            <div>
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#e59819]">
                  <UtensilsCrossed
                    size={20}
                    className="text-[#1f1d1b]"
                  />
                </div>

                <div>
                  <h3 className="font-black">
                    دار النكهة
                  </h3>

                  <p className="text-[11px] text-[#8f8881]">
                    نكهة تُحكى
                  </p>
                </div>
              </div>

              <p className="mt-5 max-w-sm text-sm leading-6 text-[#9d958e]">
                تجربة مطعم رقمية مصممة لتجعل عملية
                تصفح المنيو والطلب أكثر سهولة ووضوحاً.
              </p>
            </div>

            {/* HOURS */}

            <div>
              <h4 className="font-black">
                ساعات العمل
              </h4>

              <div className="mt-4 flex items-center gap-2 text-sm text-[#aaa29b]">
                <Clock3 size={16} />
                يومياً من 10:00 صباحاً حتى 11:30 مساءً
              </div>
            </div>

            {/* CONTACT */}

            <div>
              <h4 className="font-black">
                تواصل معنا
              </h4>

              <div className="mt-4 space-y-2 text-sm text-[#aaa29b]">
                <p>+962 7X XXX XXXX</p>
                <p>hello@daralnakah.com</p>
              </div>
            </div>
          </div>

          <div className="mt-10 border-t border-white/10 pt-6 text-center text-xs text-[#716b65]">
            © 2026 دار النكهة — جميع الحقوق محفوظة
          </div>
        </div>
      </footer>

      {/* =====================================================
          CART DRAWER
      ===================================================== */}

      {isCartOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
          onClick={() => setIsCartOpen(false)}
        >
          <aside
            onClick={(e) => e.stopPropagation()}
            className="absolute left-0 top-0 flex h-full w-full max-w-md flex-col bg-[#f7f4ed] shadow-2xl"
          >
            {/* CART HEADER */}

            <div className="flex items-center justify-between border-b border-black/5 bg-white px-5 py-5">
              <div>
                <h2 className="text-xl font-black">
                  سلة الطلب
                </h2>

                <p className="mt-1 text-xs text-[#8d847c]">
                  {cartItemsCount} عنصر في السلة
                </p>
              </div>

              <button
                onClick={() =>
                  setIsCartOpen(false)
                }
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f3eee7]"
              >
                <X size={19} />
              </button>
            </div>

            {/* CART ITEMS */}

            <div className="flex-1 overflow-y-auto p-5">
              {cart.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-center">
                  <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-white shadow-sm">
                    <ShoppingBag
                      size={29}
                      className="text-[#aaa097]"
                    />
                  </div>

                  <h3 className="mt-5 text-lg font-black">
                    السلة فارغة
                  </h3>

                  <p className="mt-2 max-w-xs text-sm leading-6 text-[#8e857d]">
                    أضف بعض الوجبات من المنيو حتى تظهر هنا.
                  </p>

                  <button
                    onClick={() => {
                      setIsCartOpen(false);
                      scrollToSection("menu");
                    }}
                    className="mt-5 rounded-xl bg-[#1f1d1b] px-5 py-3 text-xs font-black text-white"
                  >
                    تصفح المنيو
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {cart.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-2xl border border-black/5 bg-white p-4 shadow-sm"
                    >
                      <div className="flex gap-3">
                        
                        {/* ITEM ICON */}

                        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-[#f3eee5]">
                          <UtensilsCrossed
                            size={22}
                            className="text-[#e59819]"
                          />
                        </div>

                        {/* ITEM INFO */}

                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h3 className="truncate text-sm font-black">
                                {item.name}
                              </h3>

                              <p className="mt-1 text-xs font-bold text-[#e59819]">
                                {item.price.toFixed(2)} د.أ
                              </p>
                            </div>

                            <button
                              onClick={() =>
                                removeFromCart(
                                  item.id
                                )
                              }
                              className="text-[#a39a91] hover:text-red-500"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>

                          {/* QUANTITY */}

                          <div className="mt-3 flex items-center justify-between">
                            <div className="flex items-center gap-2 rounded-xl bg-[#f6f2ec] p-1">
                              
                              <button
                                onClick={() =>
                                  updateQuantity(
                                    item.id,
                                    -1
                                  )
                                }
                                className="flex h-7 w-7 items-center justify-center rounded-lg bg-white shadow-sm"
                              >
                                <Minus size={13} />
                              </button>

                              <span className="min-w-6 text-center text-xs font-black">
                                {item.quantity}
                              </span>

                              <button
                                onClick={() =>
                                  updateQuantity(
                                    item.id,
                                    1
                                  )
                                }
                                className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#1f1d1b] text-white"
                              >
                                <Plus size={13} />
                              </button>

                            </div>

                            <p className="text-sm font-black">
                              {(
                                item.price *
                                item.quantity
                              ).toFixed(2)}{" "}
                              د.أ
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* CART FOOTER */}

            {cart.length > 0 && (
              <div className="border-t border-black/5 bg-white p-5">
                
                <div className="space-y-3">
                  
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[#827970]">
                      المجموع الفرعي
                    </span>

                    <span className="font-bold">
                      {subtotal.toFixed(2)} د.أ
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[#827970]">
                      رسوم التوصيل
                    </span>

                    <span className="font-bold">
                      {deliveryFee.toFixed(2)} د.أ
                    </span>
                  </div>

                  <div className="my-3 h-px bg-black/5" />

                  <div className="flex items-center justify-between">
                    <span className="font-black">
                      الإجمالي
                    </span>

                    <span className="text-xl font-black text-[#e59819]">
                      {total.toFixed(2)} د.أ
                    </span>
                  </div>
                </div>

                <button
                  onClick={() =>
                    alert(
                      "سيتم الانتقال إلى صفحة إتمام الطلب."
                    )
                  }
                  className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#1f1d1b] py-4 text-sm font-black text-white transition hover:bg-[#e59819] hover:text-[#1f1d1b]"
                >
                  إتمام الطلب
                  <ArrowLeft size={17} />
                </button>

              </div>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}

/* =========================================================
   HERO STEP COMPONENT
========================================================= */

function HeroStep({
  icon: Icon,
  title,
  text,
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-white/5 p-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#e59819]/10">
        <Icon
          size={18}
          className="text-[#e59819]"
        />
      </div>

      <div>
        <p className="text-sm font-bold text-white">
          {title}
        </p>

        <p className="mt-0.5 text-[11px] text-[#958d84]">
          {text}
        </p>
      </div>
    </div>
  );
}

/* =========================================================
   FEATURE COMPONENT
========================================================= */

function Feature({
  icon: Icon,
  title,
  text,
}) {
  return (
    <div className="rounded-2xl border border-black/5 bg-[#faf8f4] p-5">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#1f1d1b]">
        <Icon
          size={19}
          className="text-[#e59819]"
        />
      </div>

      <h3 className="mt-4 text-sm font-black">
        {title}
      </h3>

      <p className="mt-1.5 text-xs leading-5 text-[#8a8179]">
        {text}
      </p>
    </div>
  );
}

/* =========================================================
   STORY STEP COMPONENT
========================================================= */

function StoryStep({
  number,
  title,
  text,
}) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#1f1d1b] text-sm font-black text-[#e59819]">
        {number}
      </div>

      <div>
        <h3 className="font-black">
          {title}
        </h3>

        <p className="mt-1 text-xs text-[#8a8179]">
          {text}
        </p>
      </div>
    </div>
  );
}