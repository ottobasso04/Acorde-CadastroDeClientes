import { createContext, useCallback, useContext, useMemo, useState } from "react";

const MAX_PER_PRODUCT = 10;

const CartContext = createContext(null);

function limitFor(product) {
  return Math.max(0, Math.min(MAX_PER_PRODUCT, product.stock));
}

export function CartProvider({ children }) {
  const [lines, setLines] = useState([]);

  const add = useCallback(
    (product, quantity = 1) => {
      const existing = lines.find((line) => line.product.id === product.id);
      const current = existing?.quantity ?? 0;
      const allowed = Math.min(current + quantity, limitFor(product));
      if (allowed <= current) return false;
      setLines((list) =>
        existing
          ? list.map((line) => (line.product.id === product.id ? { product, quantity: allowed } : line))
          : [...list, { product, quantity: allowed }]
      );
      return true;
    },
    [lines]
  );

  const setQuantity = useCallback((productId, quantity) => {
    setLines((current) =>
      current
        .map((line) =>
          line.product.id === productId
            ? { ...line, quantity: Math.max(0, Math.min(quantity, limitFor(line.product))) }
            : line
        )
        .filter((line) => line.quantity > 0)
    );
  }, []);

  const remove = useCallback((productId) => {
    setLines((current) => current.filter((line) => line.product.id !== productId));
  }, []);

  const clear = useCallback(() => setLines([]), []);

  const value = useMemo(() => {
    const count = lines.reduce((sum, line) => sum + line.quantity, 0);
    const total = lines.reduce((sum, line) => sum + line.quantity * line.product.price, 0);
    const quantityOf = (productId) => lines.find((line) => line.product.id === productId)?.quantity ?? 0;
    return { lines, count, total, quantityOf, add, setQuantity, remove, clear, maxPerProduct: MAX_PER_PRODUCT };
  }, [lines, add, setQuantity, remove, clear]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart precisa ser usado dentro de <CartProvider>.");
  return context;
}
