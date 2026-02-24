/**
 * Hook for managing In-App Purchase state and operations.
 *
 * Handles initialization, purchase listeners, and provides
 * methods for purchasing and restoring subscriptions.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { Alert } from 'react-native';
import {
  IAP_AVAILABLE,
  initializeIAP,
  endIAPConnection,
  getProducts,
  purchaseSubscription,
  processPurchase,
  restorePurchases,
  setPurchaseUpdateListener,
  setPurchaseErrorListener,
  ErrorCode,
  type IAPProduct,
  type ProductInterval,
  type Purchase,
  type PurchaseError,
} from '@/lib/iap/service';
import { useAuth } from '@/contexts/AuthContext';

interface UseIAPReturn {
  /** Whether IAP is available on this platform */
  isAvailable: boolean;
  /** Whether IAP is initializing */
  isInitializing: boolean;
  /** Whether a purchase is in progress */
  isPurchasing: boolean;
  /** Whether restore is in progress */
  isRestoring: boolean;
  /** Available products from App Store */
  products: IAPProduct[];
  /** Error message if any operation failed */
  error: string | null;
  /** Purchase a subscription by interval */
  purchase: (interval: ProductInterval) => Promise<boolean>;
  /** Restore previous purchases */
  restore: () => Promise<boolean>;
  /** Refresh products from App Store */
  refreshProducts: () => Promise<void>;
}

export function useIAP(): UseIAPReturn {
  const { user } = useAuth();
  const [isInitializing, setIsInitializing] = useState(true);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [products, setProducts] = useState<IAPProduct[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Track pending purchase resolution
  const purchaseResolverRef = useRef<{
    resolve: (success: boolean) => void;
    reject: (error: Error) => void;
  } | null>(null);

  // Handle completed purchases
  const handlePurchaseUpdate = useCallback(
    async (purchase: Purchase) => {
      if (!user?.id) {
        console.error('[useIAP] No user ID for purchase processing');
        setError('Please sign in to complete purchase');
        purchaseResolverRef.current?.reject(new Error('No user ID'));
        purchaseResolverRef.current = null;
        setIsPurchasing(false);
        return;
      }

      try {
        console.log('[useIAP] Processing purchase:', purchase.productId);
        const result = await processPurchase(purchase, user.id);

        if (result.success) {
          console.log('[useIAP] Purchase successful!');
          setError(null);
          purchaseResolverRef.current?.resolve(true);
        } else {
          console.error('[useIAP] Purchase verification failed:', result.error);
          setError(result.error || 'Purchase verification failed');
          purchaseResolverRef.current?.reject(new Error(result.error || 'Verification failed'));
        }
      } catch (err) {
        console.error('[useIAP] Purchase processing error:', err);
        const message = err instanceof Error ? err.message : 'Purchase failed';
        setError(message);
        purchaseResolverRef.current?.reject(err instanceof Error ? err : new Error(message));
      } finally {
        purchaseResolverRef.current = null;
        setIsPurchasing(false);
      }
    },
    [user?.id]
  );

  // Handle purchase errors
  const handlePurchaseError = useCallback((err: PurchaseError) => {
    console.error('[useIAP] Purchase error:', err);

    // User cancelled is not really an error
    if (err.code === ErrorCode.UserCancelled) {
      setIsPurchasing(false);
      purchaseResolverRef.current?.resolve(false);
      purchaseResolverRef.current = null;
      return;
    }

    const message = err.message || 'Purchase failed';
    setError(message);
    setIsPurchasing(false);
    purchaseResolverRef.current?.reject(new Error(message));
    purchaseResolverRef.current = null;
  }, []);

  // Initialize IAP and set up listeners
  useEffect(() => {
    if (!IAP_AVAILABLE) {
      setIsInitializing(false);
      return;
    }

    let cleanupPurchaseListener: () => void = () => {};
    let cleanupErrorListener: () => void = () => {};

    async function init() {
      try {
        setIsInitializing(true);
        await initializeIAP();

        // Set up listeners
        cleanupPurchaseListener = setPurchaseUpdateListener(handlePurchaseUpdate);
        cleanupErrorListener = setPurchaseErrorListener(handlePurchaseError);

        // Fetch products
        const fetchedProducts = await getProducts();
        setProducts(fetchedProducts);
        console.log('[useIAP] Initialized with products:', fetchedProducts.length);
      } catch (err) {
        console.error('[useIAP] Initialization error:', err);
        setError('Failed to initialize in-app purchases');
      } finally {
        setIsInitializing(false);
      }
    }

    init();

    // Cleanup on unmount
    return () => {
      cleanupPurchaseListener();
      cleanupErrorListener();
      endIAPConnection();
    };
  }, [handlePurchaseUpdate, handlePurchaseError]);

  // Purchase a subscription
  const purchase = useCallback(
    async (interval: ProductInterval): Promise<boolean> => {
      if (!IAP_AVAILABLE) {
        Alert.alert('Not Available', 'In-app purchases are not available on this device.');
        return false;
      }

      if (!user?.id) {
        Alert.alert('Sign In Required', 'Please sign in to purchase a subscription.');
        return false;
      }

      setError(null);
      setIsPurchasing(true);

      return new Promise((resolve, reject) => {
        // Store resolver for when purchase completes via listener
        purchaseResolverRef.current = { resolve, reject };

        // Initiate the purchase
        purchaseSubscription(interval).catch((err) => {
          if (err.message === 'Purchase cancelled') {
            setIsPurchasing(false);
            purchaseResolverRef.current = null;
            resolve(false);
            return;
          }

          console.error('[useIAP] Purchase initiation error:', err);
          setError(err.message || 'Failed to start purchase');
          setIsPurchasing(false);
          purchaseResolverRef.current = null;
          reject(err);
        });
      });
    },
    [user?.id]
  );

  // Restore previous purchases
  const restore = useCallback(async (): Promise<boolean> => {
    if (!IAP_AVAILABLE) {
      Alert.alert('Not Available', 'In-app purchases are not available on this device.');
      return false;
    }

    if (!user?.id) {
      Alert.alert('Sign In Required', 'Please sign in to restore purchases.');
      return false;
    }

    setError(null);
    setIsRestoring(true);

    try {
      const restored = await restorePurchases(user.id);

      if (restored.length > 0) {
        Alert.alert('Restored', 'Your subscription has been restored successfully.');
        return true;
      } else {
        Alert.alert('No Purchases Found', 'No previous purchases were found to restore.');
        return false;
      }
    } catch (err) {
      console.error('[useIAP] Restore error:', err);
      const message = err instanceof Error ? err.message : 'Failed to restore purchases';
      setError(message);
      Alert.alert('Restore Failed', message);
      return false;
    } finally {
      setIsRestoring(false);
    }
  }, [user?.id]);

  // Refresh products from App Store
  const refreshProducts = useCallback(async () => {
    if (!IAP_AVAILABLE) return;

    try {
      const fetchedProducts = await getProducts();
      setProducts(fetchedProducts);
    } catch (err) {
      console.error('[useIAP] Failed to refresh products:', err);
    }
  }, []);

  return {
    isAvailable: IAP_AVAILABLE,
    isInitializing,
    isPurchasing,
    isRestoring,
    products,
    error,
    purchase,
    restore,
    refreshProducts,
  };
}
