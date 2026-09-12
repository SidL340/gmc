import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from '../lib/api';

export interface CartItem {
  id: string;
  productId: string;
  variantId?: string | null;
  name: string;
  slug: string;
  image?: string | null;
  size?: string | null;
  color?: string | null;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  stock: number;
}

interface CartStore {
  items: CartItem[];
  itemCount: number;
  subtotal: number;
  shippingCharge: number;
  total: number;
  setCart: (data: any) => void;
  addItem: (item: CartItem) => void;
  removeItem: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  clearCart: () => void;
  syncWithServer: () => Promise<void>;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      itemCount: 0,
      subtotal: 0,
      shippingCharge: 0,
      total: 0,

      setCart: (data) => {
        set({
          items: data.items || [],
          itemCount: data.itemCount || 0,
          subtotal: data.subtotal || 0,
          shippingCharge: data.shippingCharge || 0,
          total: data.total || 0,
        });
      },

      addItem: (item) => {
        const current = get().items;
        const key = `${item.productId}-${item.variantId || 'base'}`;
        const existing = current.find(
          (i) => `${i.productId}-${i.variantId || 'base'}` === key
        );

        let newItems: CartItem[];
        if (existing) {
          newItems = current.map((i) =>
            `${i.productId}-${i.variantId || 'base'}` === key
              ? {
                  ...i,
                  quantity: i.quantity + item.quantity,
                  totalPrice: (i.quantity + item.quantity) * i.unitPrice,
                }
              : i
          );
        } else {
          newItems = [...current, item];
        }

        const subtotal = newItems.reduce((acc, i) => acc + i.totalPrice, 0);
        const shipping = subtotal >= 2000 || subtotal === 0 ? 0 : 150;
        set({
          items: newItems,
          itemCount: newItems.reduce((acc, i) => acc + i.quantity, 0),
          subtotal,
          shippingCharge: shipping,
          total: subtotal + shipping,
        });
      },

      removeItem: (itemId) => {
        const newItems = get().items.filter((i) => i.id !== itemId);
        const subtotal = newItems.reduce((acc, i) => acc + i.totalPrice, 0);
        const shipping = subtotal >= 2000 || subtotal === 0 ? 0 : 150;
        set({
          items: newItems,
          itemCount: newItems.reduce((acc, i) => acc + i.quantity, 0),
          subtotal,
          shippingCharge: shipping,
          total: subtotal + shipping,
        });
      },

      updateQuantity: (itemId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(itemId);
          return;
        }
        const newItems = get().items.map((i) =>
          i.id === itemId
            ? { ...i, quantity, totalPrice: quantity * i.unitPrice }
            : i
        );
        const subtotal = newItems.reduce((acc, i) => acc + i.totalPrice, 0);
        const shipping = subtotal >= 2000 || subtotal === 0 ? 0 : 150;
        set({
          items: newItems,
          itemCount: newItems.reduce((acc, i) => acc + i.quantity, 0),
          subtotal,
          shippingCharge: shipping,
          total: subtotal + shipping,
        });
      },

      clearCart: () => {
        set({ items: [], itemCount: 0, subtotal: 0, shippingCharge: 0, total: 0 });
      },

      syncWithServer: async () => {
        try {
          const res = await api.get('/api/cart');
          if (res.data?.success) {
            get().setCart(res.data.data);
          }
        } catch {
          // guest mode or error
        }
      },
    }),
    {
      name: 'gmc-cart',
    }
  )
);
