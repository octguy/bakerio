import { useEffect, useState } from 'react';
import { getProducts } from '@repo/api-client';
import type { Product } from '@repo/api-client';
import type { CartItem } from '@/types';

// Global cache for promise deduplication
const fetchCache = new Map<string, Promise<Product[]>>();

export function useCrossSellProducts(cartItems: CartItem[]) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    
    const cacheKey = 'cross-sell-products';
    let promise = fetchCache.get(cacheKey);

    if (!promise) {
      promise = getProducts();
      fetchCache.set(cacheKey, promise);
      
      promise.finally(() => {
        // Only clean up if the current promise in cache exactly equals THIS promise instance
        if (fetchCache.get(cacheKey) === promise) {
          fetchCache.delete(cacheKey);
        }
      });
    }

    promise
      .then((data) => {
        if (mounted) {
          setProducts(data);
          setLoading(false);
        }
      })
      .catch(() => {
        if (mounted) {
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  const cartItemIds = new Set(cartItems.map((i) => i.product.id));
  
  // Filter out products already in cart, then grab up to 3 items
  const recommendations = products
    .filter((p) => !cartItemIds.has(p.id))
    .slice(0, 3);

  return { recommendations, loading };
}
