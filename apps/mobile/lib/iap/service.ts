/**
 * iOS In-App Purchase Service
 *
 * Handles iOS StoreKit integration for Pro subscriptions.
 * Uses react-native-iap v14+ with StoreKit 2 support.
 */

import { Platform } from 'react-native';
import {
  initConnection,
  endConnection,
  fetchProducts,
  requestPurchase,
  getAvailablePurchases,
  finishTransaction as rniapFinishTransaction,
  purchaseUpdatedListener,
  purchaseErrorListener,
  getReceiptIOS,
  ErrorCode,
  type ProductOrSubscription,
  type Purchase,
  type PurchaseError,
  type EventSubscription,
} from 'react-native-iap';
import { fetchApi } from '@/lib/api';

// Product IDs - must match App Store Connect configuration
export const PRODUCT_IDS = {
  monthly: 'com.seatsignal.maximfit.pro.monthly',
  annual: 'com.seatsignal.maximfit.pro.annual',
} as const;

export type ProductInterval = keyof typeof PRODUCT_IDS;

export interface IAPProduct {
  productId: string;
  title: string;
  description: string;
  price: string;
  localizedPrice: string;
  currency: string;
}

export interface IAPPurchase {
  productId: string;
  transactionId: string;
  transactionReceipt: string;
  transactionDate: string;
}

export interface VerifyReceiptResponse {
  success: boolean;
  subscription?: {
    tier: string;
    status: string;
    expiresAt: string | null;
    isTrialing: boolean;
    cancelAtPeriodEnd: boolean;
    environment: string;
  };
  error?: string;
}

// IAP is only available on iOS for now
export const IAP_AVAILABLE = Platform.OS === 'ios';

// Track connection state
let isConnected = false;

/**
 * Initialize the IAP connection.
 * Must be called before any other IAP operations.
 */
export async function initializeIAP(): Promise<boolean> {
  if (!IAP_AVAILABLE) {
    console.log('[IAP] Not available on this platform');
    return false;
  }

  if (isConnected) {
    console.log('[IAP] Already connected');
    return true;
  }

  try {
    await initConnection();
    isConnected = true;
    console.log('[IAP] Connection initialized');
    return true;
  } catch (error) {
    console.error('[IAP] Failed to initialize:', error);
    return false;
  }
}

/**
 * End the IAP connection.
 * Should be called when the app is closing or user logs out.
 */
export async function endIAPConnection(): Promise<void> {
  if (!IAP_AVAILABLE || !isConnected) return;

  try {
    await endConnection();
    isConnected = false;
    console.log('[IAP] Connection ended');
  } catch (error) {
    console.error('[IAP] Failed to end connection:', error);
  }
}

/**
 * Convert react-native-iap Product to our IAPProduct type.
 * Uses the unified ProductOrSubscription type from v14.
 */
function mapProductToIAPProduct(product: ProductOrSubscription): IAPProduct {
  return {
    productId: product.id,
    title: product.title ?? product.id,
    description: product.description ?? '',
    price: product.price?.toString() ?? '0',
    localizedPrice: product.displayPrice ?? '$0.00',
    currency: product.currency ?? 'USD',
  };
}

/**
 * Get available subscription products from the App Store.
 */
export async function getProducts(): Promise<IAPProduct[]> {
  if (!IAP_AVAILABLE) {
    return [];
  }

  try {
    await initializeIAP();
    const products = await fetchProducts({
      skus: [PRODUCT_IDS.monthly, PRODUCT_IDS.annual],
      type: 'subs',
    });

    if (!products) {
      console.log('[IAP] No products returned');
      return [];
    }

    console.log('[IAP] Got products:', products.length);
    return products.map(mapProductToIAPProduct);
  } catch (error) {
    console.error('[IAP] Failed to get products:', error);
    return [];
  }
}

/**
 * Convert react-native-iap purchase to our IAPPurchase type.
 */
function mapPurchase(purchase: Purchase, receipt: string): IAPPurchase {
  return {
    productId: purchase.productId,
    transactionId: purchase.id ?? '',
    transactionReceipt: receipt,
    transactionDate: purchase.transactionDate?.toString() ?? new Date().toISOString(),
  };
}

/**
 * Verify the purchase receipt with our backend.
 */
export async function verifyReceiptWithServer(
  receiptData: string,
  userId: string
): Promise<VerifyReceiptResponse> {
  try {
    const response = await fetchApi<VerifyReceiptResponse>('/api/apple/verify-receipt', {
      method: 'POST',
      body: JSON.stringify({
        receiptData,
        userId,
      }),
    });
    console.log('[IAP] Receipt verified:', response);
    return response;
  } catch (error) {
    console.error('[IAP] Receipt verification failed:', error);
    throw error;
  }
}

/**
 * Get the iOS receipt data for verification.
 */
export async function getReceipt(): Promise<string | null> {
  if (!IAP_AVAILABLE) {
    return null;
  }

  try {
    const receipt = await getReceiptIOS();
    return receipt;
  } catch (error) {
    console.error('[IAP] Failed to get receipt:', error);
    return null;
  }
}

/**
 * Purchase a subscription.
 *
 * @param interval - 'monthly' or 'annual'
 * @throws Error if purchase fails or is cancelled
 */
export async function purchaseSubscription(
  interval: ProductInterval
): Promise<void> {
  if (!IAP_AVAILABLE) {
    throw new Error('In-app purchases are not available on this platform');
  }

  const productId = PRODUCT_IDS[interval];

  try {
    await initializeIAP();
    console.log('[IAP] Requesting subscription:', productId);

    // Request the purchase using the v14 API structure
    await requestPurchase({
      type: 'subs',
      request: {
        apple: {
          sku: productId,
          andDangerouslyFinishTransactionAutomatically: false,
        },
      },
    });

    // Note: The actual purchase will be delivered via purchaseUpdatedListener
  } catch (error: unknown) {
    const purchaseError = error as PurchaseError;
    // User cancelled - this is normal, not an error
    if (purchaseError?.code === ErrorCode.UserCancelled) {
      throw new Error('Purchase cancelled');
    }
    console.error('[IAP] Purchase failed:', error);
    throw error;
  }
}

/**
 * Process a completed purchase: verify with server and finish transaction.
 */
export async function processPurchase(
  purchase: Purchase,
  userId: string
): Promise<VerifyReceiptResponse> {
  console.log('[IAP] Processing purchase:', purchase.productId);

  try {
    // Get the full receipt for server verification
    const receipt = await getReceipt();

    if (!receipt) {
      throw new Error('Failed to get receipt data');
    }

    // Verify with our backend
    const result = await verifyReceiptWithServer(receipt, userId);

    if (result.success) {
      // Finish the transaction with Apple
      await rniapFinishTransaction({ purchase, isConsumable: false });
      console.log('[IAP] Transaction finished successfully');
    }

    return result;
  } catch (error) {
    console.error('[IAP] Failed to process purchase:', error);
    throw error;
  }
}

/**
 * Restore previous purchases.
 * Used when user reinstalls app or switches devices.
 */
export async function restorePurchases(userId: string): Promise<IAPPurchase[]> {
  if (!IAP_AVAILABLE) {
    return [];
  }

  try {
    await initializeIAP();
    console.log('[IAP] Restoring purchases...');

    const purchases = await getAvailablePurchases();
    const results: IAPPurchase[] = [];

    // Get the receipt for verification
    const receipt = await getReceipt();

    if (receipt && purchases && purchases.length > 0) {
      // Verify the receipt with our backend
      try {
        await verifyReceiptWithServer(receipt, userId);
        // Map purchases for return
        for (const purchase of purchases) {
          results.push(mapPurchase(purchase, receipt));
        }
      } catch (error) {
        console.warn('[IAP] Failed to verify restored purchases:', error);
      }
    }

    console.log('[IAP] Restored purchases:', results.length);
    return results;
  } catch (error) {
    console.error('[IAP] Restore failed:', error);
    throw error;
  }
}

/**
 * Finish a transaction after processing.
 * Must be called after successfully verifying the receipt with the server.
 */
export async function finishTransaction(purchase: Purchase): Promise<void> {
  if (!IAP_AVAILABLE) return;

  try {
    await rniapFinishTransaction({ purchase, isConsumable: false });
    console.log('[IAP] Transaction finished:', purchase.id);
  } catch (error) {
    console.error('[IAP] Failed to finish transaction:', error);
  }
}

/**
 * Set up a listener for purchase updates.
 * This handles purchases initiated outside the app (e.g., from App Store).
 * Returns a cleanup function to remove the listener.
 */
export function setPurchaseUpdateListener(
  callback: (purchase: Purchase) => void
): () => void {
  if (!IAP_AVAILABLE) {
    return () => {};
  }

  const subscription: EventSubscription = purchaseUpdatedListener((purchase) => {
    console.log('[IAP] Purchase updated:', purchase.productId);
    callback(purchase);
  });

  return () => {
    subscription.remove();
  };
}

/**
 * Set up a listener for purchase errors.
 * Returns a cleanup function to remove the listener.
 */
export function setPurchaseErrorListener(
  callback: (error: PurchaseError) => void
): () => void {
  if (!IAP_AVAILABLE) {
    return () => {};
  }

  const subscription: EventSubscription = purchaseErrorListener((error) => {
    console.error('[IAP] Purchase error:', error);
    callback(error);
  });

  return () => {
    subscription.remove();
  };
}

// Re-export types for convenience
export { ErrorCode };
export type { Purchase, PurchaseError };
