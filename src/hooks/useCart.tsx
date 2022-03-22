import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {

  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const productInCart = findProductInCart(productId);
      const stock = await getStock(productId);

      if (productInCart) {

        if (stock.amount <= productInCart.amount) {
          toast.error('Quantidade solicitada fora de estoque');
          return;
        }

        const newCart = cart.map(product => {
          if (product.id === productId) {
            return { ...product, amount: product.amount + 1 }
          }
          return product;
        });

        updateCart(newCart);
      } else {

        if (stock.amount === 0) {
          toast.error('Quantidade solicitada fora de estoque');
          return;
        }

        const product = await getProduct(productId);
        const newCart = [...cart, { ...product, amount: 1 }];

        updateCart(newCart);
      }
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const productInCart = findProductInCart(productId);

      if (productInCart) {
        const newCart = cart.filter(product => product.id !== productId);

        updateCart(newCart);
      } else {
        toast.error('Erro na remoção do produto');
      }
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {

      if (amount <= 0) return;

      const stock = await getStock(productId);
      const productInCart = findProductInCart(productId);

      if (productInCart) {
        if (stock.amount < amount) {
          toast.error('Quantidade solicitada fora de estoque');
          return;
        }

        const newCart = cart.map(product => {
          if (product.id === productId) {
            return { ...productInCart, amount: amount }
          }
          return product;
        });

        updateCart(newCart);
      }
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  async function getStock(productId: number): Promise<Stock> {
    const { data } = await api.get(`/stock/${productId}`);
    return data as Stock;
  }

  async function getProduct(productId: number): Promise<Product> {
    const { data } = await api.get(`/products/${productId}`);
    return data;
  }

  function findProductInCart(productId: number): Product | undefined {
    return cart.find(product => product.id === productId);
  }

  function updateCart(newCart: Product[]) {
    setCart(newCart);
    localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
  }

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
