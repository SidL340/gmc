import axios from 'axios';
import crypto from 'crypto';
import { logger } from '../config/logger';

// ─────────────────────────────────────────────────────────────────────────────
// PAYMENT SERVICE — FonePay + NepalPay + COD
// 
// NOTE: FonePay and NepalPay API credentials are NOT yet configured.
// These are production-ready stubs that will activate once the owner
// provides API credentials. Sandbox/test mode is used in development.
// ─────────────────────────────────────────────────────────────────────────────

export type PaymentGateway = 'FONEPAY' | 'NEPALPAY' | 'COD';

export interface InitiatePaymentResult {
  gateway:       PaymentGateway;
  referenceId:   string;   // Our internal reference
  qrCodeUrl?:    string;   // FonePay / NepalPay QR image URL
  paymentUrl?:   string;   // Redirect URL if applicable
  deepLink?:     string;   // Mobile app deep link
  instructions:  string;   // Human-readable instructions
  expiresAt:     Date;
}

export interface PaymentVerificationResult {
  success:        boolean;
  gatewayRef:     string;
  transactionId?: string;
  amount:         number;
  message:        string;
}

// ─────────────────────────────────────────────────────────────────────────────
// FONEPAY
// Docs: https://developer.fonepay.com
// ─────────────────────────────────────────────────────────────────────────────

export const initiateFonePay = async (
  orderId:      string,
  amount:       number,
  orderNumber:  string,
): Promise<InitiatePaymentResult> => {
  const merchantCode = process.env.FONEPAY_MERCHANT_CODE;
  const secretKey    = process.env.FONEPAY_SECRET_KEY;

  if (!merchantCode || !secretKey) {
    logger.warn('[FonePay] Credentials not configured — running in stub mode');
    return stubPaymentResult('FONEPAY', orderId, amount);
  }

  try {
    const prn         = `GMC-${orderId.slice(-8).toUpperCase()}`;
    const returnUrl   = `${process.env.API_URL}/api/webhooks/fonepay/return`;
    const failureUrl  = `${process.env.CLIENT_URL}/checkout/payment-failed`;

    // FonePay QR payment initiation
    const params: Record<string, string> = {
      PID: merchantCode,
      MD:  'P',       // P = Production, U = UAT
      AMT: amount.toFixed(2),
      CRN: 'NPR',
      DT:  formatFonePayDate(new Date()),
      R1:  `Order ${orderNumber}`,
      R2:  'GM Collection House',
      DV:  '',        // will be set below after HMAC
      PRN: prn,
      RU:  returnUrl,
    };

    // HMAC-SHA512 signature
    const message  = `${merchantCode},${params.MD},${params.PRN},${params.AMT},${params.CRN},${params.DT},${params.R1},${params.R2},${returnUrl}`;
    params.DV      = crypto.createHmac('sha512', secretKey).update(message).digest('hex');

    const response = await axios.post(
      process.env.FONEPAY_BASE_URL || 'https://dev-clientapi.fonepay.com/api/merchantRequest',
      new URLSearchParams(params).toString(),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, timeout: 15000 },
    );

    const qrImageUrl = response.data?.qrUrl || response.data?.qrMessage;

    return {
      gateway:      'FONEPAY',
      referenceId:  prn,
      qrCodeUrl:    qrImageUrl,
      instructions: 'Scan this QR code with your FonePay app to complete payment.',
      expiresAt:    new Date(Date.now() + 15 * 60 * 1000), // 15 min
    };
  } catch (error: any) {
    logger.error('[FonePay] Initiation error:', error?.message);
    throw new Error('Failed to initiate FonePay payment. Please try another method.');
  }
};

/**
 * Verify FonePay webhook / return callback
 */
export const verifyFonePayCallback = (params: Record<string, string>): boolean => {
  const secretKey = process.env.FONEPAY_SECRET_KEY;
  if (!secretKey) return false;

  const { PID, PRN, AMT, CRN, DT, R1, R2, RU, PS, RC, UID, BC, INI, P_AMT, R_AMT, DV } = params;

  if (PS !== 'true') return false;

  const message    = `${PID},${PRN},${AMT},${CRN},${DT},${R1},${R2},${RU},${PS},${RC},${UID},${BC},${INI},${P_AMT},${R_AMT}`;
  const expected   = crypto.createHmac('sha512', secretKey).update(message).digest('hex');

  return expected === DV;
};

const formatFonePayDate = (date: Date): string => {
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const y = date.getFullYear();
  return `${m}/${d}/${y}`;
};

// ─────────────────────────────────────────────────────────────────────────────
// NEPALPAY
// Docs: Will be integrated once API credentials are provided
// ─────────────────────────────────────────────────────────────────────────────

export const initiateNepalPay = async (
  orderId:     string,
  amount:      number,
  orderNumber: string,
): Promise<InitiatePaymentResult> => {
  const merchantId = process.env.NEPALPAY_MERCHANT_ID;
  const secretKey  = process.env.NEPALPAY_SECRET_KEY;

  if (!merchantId || !secretKey) {
    logger.warn('[NepalPay] Credentials not configured — running in stub mode');
    return stubPaymentResult('NEPALPAY', orderId, amount);
  }

  try {
    const transactionId = `GMC${Date.now()}`;
    const signature     = crypto
      .createHmac('sha256', secretKey)
      .update(`${merchantId}|${transactionId}|${amount}|NPR`)
      .digest('hex');

    const response = await axios.post(
      `${process.env.NEPALPAY_BASE_URL}/payment/initiate`,
      {
        merchantId,
        transactionId,
        amount:      amount.toFixed(2),
        currency:    'NPR',
        description: `Order ${orderNumber} - GM Collection House`,
        returnUrl:   `${process.env.API_URL}/api/webhooks/nepalpay/return`,
        failureUrl:  `${process.env.CLIENT_URL}/checkout/payment-failed`,
        signature,
      },
      { headers: { 'Content-Type': 'application/json' }, timeout: 15000 },
    );

    return {
      gateway:      'NEPALPAY',
      referenceId:  transactionId,
      qrCodeUrl:    response.data?.qrUrl,
      paymentUrl:   response.data?.paymentUrl,
      instructions: 'Scan the QR code with NepalPay app or click the payment link.',
      expiresAt:    new Date(Date.now() + 15 * 60 * 1000),
    };
  } catch (error: any) {
    logger.error('[NepalPay] Initiation error:', error?.message);
    throw new Error('Failed to initiate NepalPay payment. Please try another method.');
  }
};

export const verifyNepalPayCallback = (params: Record<string, string>): boolean => {
  const secretKey = process.env.NEPALPAY_SECRET_KEY;
  if (!secretKey) return false;

  const { merchantId, transactionId, status, amount, signature } = params;
  if (status !== 'SUCCESS') return false;

  const expected = crypto
    .createHmac('sha256', secretKey)
    .update(`${merchantId}|${transactionId}|${amount}|NPR`)
    .digest('hex');

  return expected === signature;
};

// ─────────────────────────────────────────────────────────────────────────────
// COD (Cash on Delivery)
// ─────────────────────────────────────────────────────────────────────────────

export const initiateCOD = (orderId: string, amount: number): InitiatePaymentResult => {
  return {
    gateway:      'COD',
    referenceId:  `COD-${orderId.slice(-8).toUpperCase()}`,
    instructions: `Pay Rs. ${amount.toFixed(2)} in cash when your order is delivered. No advance payment needed.`,
    expiresAt:    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// STUB for when credentials are not yet configured
// ─────────────────────────────────────────────────────────────────────────────

const stubPaymentResult = (
  gateway:  PaymentGateway,
  orderId:  string,
  amount:   number,
): InitiatePaymentResult => {
  logger.info(`[Payment Stub] ${gateway} — Rs. ${amount} for order ${orderId}`);
  return {
    gateway,
    referenceId:  `STUB-${Date.now()}`,
    qrCodeUrl:    'https://placehold.co/300x300?text=QR+Code+(Test+Mode)',
    instructions: `[TEST MODE] ${gateway} payment of Rs. ${amount}. Will be live once API credentials are configured.`,
    expiresAt:    new Date(Date.now() + 15 * 60 * 1000),
  };
};
