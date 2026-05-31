import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useCrossSellProducts } from './use-cross-sell';
import { getProducts } from '@repo/api-client';

vi.mock('@repo/api-client', () => ({
  getProducts: vi.fn(),
}));

describe('useCrossSellProducts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('deduplicates concurrent fetches', async () => {
    const mockData = [{ id: '1', name: 'p1' }];
    let resolvePromise: any;
    const promise = new Promise((resolve) => {
      resolvePromise = resolve;
    });

    (getProducts as any).mockReturnValue(promise);

    const { result: res1 } = renderHook(() => useCrossSellProducts([]));
    const { result: res2 } = renderHook(() => useCrossSellProducts([]));

    expect(getProducts).toHaveBeenCalledTimes(1);

    resolvePromise(mockData);

    await waitFor(() => {
      expect(res1.current.loading).toBe(false);
      expect(res2.current.loading).toBe(false);
    });

    expect(res1.current.recommendations.length).toBe(1);
    expect(res2.current.recommendations.length).toBe(1);
  });

  it('finally() only deletes the exact same promise instance', async () => {
    let resolvePromise1: any;
    const promise1 = new Promise((resolve) => {
      resolvePromise1 = resolve;
    });
    
    (getProducts as any).mockReturnValueOnce(promise1);
    
    const mapDeleteSpy = vi.spyOn(Map.prototype, 'delete');
    const mapSetSpy = vi.spyOn(Map.prototype, 'set');
    
    renderHook(() => useCrossSellProducts([]));
    
    const cacheMap = mapSetSpy.mock.instances[0] as Map<string, any>;
    
    const dummyPromise = Promise.resolve([]);
    cacheMap.set('cross-sell-products', dummyPromise);
    
    mapDeleteSpy.mockClear();
    
    resolvePromise1([]);
    await promise1;
    await new Promise(r => setTimeout(r, 0));
    
    expect(mapDeleteSpy).not.toHaveBeenCalledWith('cross-sell-products');
    
    cacheMap.clear();
  });
});
