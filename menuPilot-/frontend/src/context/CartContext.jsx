/* ==========================================================================
   CartContext.jsx — سلة الزبون قبل إرسال الطلب
   يغطي: FR-12 (إضافة صنف), FR-13 (الكمية), FR-14 (ملاحظة نصية), FR-15 (مراجعة)
   --------------------------------------------------------------------------
   السلة هنا في الذاكرة فقط (React state) وليست في localStorage، لأنها
   مرتبطة بجلسة طعام واحدة (Dining Session) تنتهي بانتهاء الزيارة —
   لا حاجة لحفظها بعد إغلاق المتصفح.
   ========================================================================== */
import { createContext, useContext, useMemo, useState } from "react";

const CartContext = createContext(null);

export function CartProvider({ children }) {
  // كل عنصر: { menuItemId, name, price, quantity, note }
  const [items, setItems] = useState([]);

  function addItem(menuItem, quantity = 1, note = "") {
    setItems((prev) => {
      const existing = prev.find((it) => it.menuItemId === menuItem.id && it.note === note);
      if (existing) {
        return prev.map((it) =>
          it === existing ? { ...it, quantity: it.quantity + quantity } : it
        );
      }
      return [
        ...prev,
        { menuItemId: menuItem.id, name: menuItem.name, price: menuItem.price, quantity, note },
      ];
    });
  }

  function updateQuantity(index, quantity) {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, quantity } : it)));
  }

  function updateNote(index, note) {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, note } : it)));
  }

  function removeItem(index) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  function clearCart() {
    setItems([]);
  }

  const total = useMemo(
    () => items.reduce((sum, it) => sum + it.price * it.quantity, 0),
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
