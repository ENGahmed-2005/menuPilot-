/* ==========================================================================
   CartContext.jsx — سلة الزبون قبل إرسال الطلب
   يغطي: FR-12 (إضافة صنف), FR-13 (الكمية), FR-14 (ملاحظة نصية), FR-15 (مراجعة)
   --------------------------------------------------------------------------
   السلة هنا في الذاكرة فقط (React state) وليست في localStorage، لأنها
   مرتبطة بجلسة طعام واحدة (Dining Session) تنتهي بانتهاء الزيارة —
   لا حاجة لحفظها بعد إغلاق المتصفح.
   الإضافات المدفوعة (options): الصنف نفسه بإضافات مختلفة = سطران مختلفان.
   السعر هنا للعرض فقط؛ الخادم يعيد حسابه من المنيو عند الإرسال.
   ========================================================================== */
import { createContext, useContext, useMemo, useState } from "react";
import { lineKey, unitPrice } from "../components/menu/cartLine";

const CartContext = createContext(null);

export function CartProvider({ children }) {
  // كل سطر: { key, menuItemId, name, imageUrl, category, basePrice, options, price, quantity, note }
  const [items, setItems] = useState([]);

  function addItem(menuItem, quantity = 1, note = "", options = []) {
    const key = lineKey(menuItem.id, options, note);
    setItems((prev) => {
      if (prev.some((it) => it.key === key)) {
        return prev.map((it) => (it.key === key ? { ...it, quantity: Math.min(99, it.quantity + quantity) } : it));
      }
      return [
        ...prev,
        {
          key,
          menuItemId: menuItem.id,
          name: menuItem.name,
          imageUrl: menuItem.imageUrl || "",
          category: menuItem.category || "",
          basePrice: Number(menuItem.price) || 0,
          options,
          price: unitPrice(menuItem.price, options),
          quantity,
          note,
        },
      ];
    });
  }

  function updateQuantity(index, quantity) {
    const nextQuantity = Math.min(99, Math.max(1, Number(quantity) || 1));
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, quantity: nextQuantity } : it)));
  }

  // The note is part of the line's identity, so the key follows it.
  function updateNote(index, note) {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, note, key: lineKey(it.menuItemId, it.options, note) } : it)));
  }

  function removeItem(index) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  function clearCart() {
    setItems([]);
  }

  const total = useMemo(
    () => items.reduce((sum, it) => sum + (Number(it.price) || 0) * (Number(it.quantity) || 0), 0),
    [items]
  );

  const value = { items, addItem, updateQuantity, updateNote, removeItem, clearCart, total };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

/** الاستخدام: const { items, addItem, total } = useCart(); */
export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within a CartProvider");
  return ctx;
}
