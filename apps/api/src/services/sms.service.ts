import axios from 'axios';
import { logger } from '../config/logger';

/**
 * Send OTP via Sparrow SMS (Nepal's most popular SMS gateway)
 * Docs: https://sparrowsms.com/sms-api-documentation
 */
export const sendSMS = async (phone: string, message: string): Promise<boolean> => {
  try {
    // Normalize phone number to Nepal format
    const normalized = normalizePhone(phone);

    const response = await axios.get('http://api.sparrowsms.com/v2/sms/', {
      params: {
        url:    'http://api.sparrowsms.com/v2/sms/',
        token:  process.env.SPARROW_SMS_TOKEN,
        from:   process.env.SPARROW_SMS_FROM || 'GMCCollection',
        to:     normalized,
        text:   message,
      },
    });

    if (response.data.response_code === 200) {
      logger.info(`SMS sent to ${normalized}`);
      return true;
    }

    logger.warn(`SMS failed for ${normalized}: ${JSON.stringify(response.data)}`);
    return false;
  } catch (error) {
    logger.error('SMS send error:', error);
    // In development, log OTP to console instead of failing
    if (process.env.NODE_ENV === 'development') {
      logger.info(`[DEV] SMS to ${phone}: ${message}`);
      return true;
    }
    return false;
  }
};

/**
 * Normalize Nepali phone numbers
 * Accepts: 98XXXXXXXX, +97798XXXXXXXX, 97798XXXXXXXX
 * Returns: 98XXXXXXXX (10 digits for Sparrow)
 */
export const normalizePhone = (phone: string): string => {
  let cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('977')) cleaned = cleaned.slice(3);
  if (cleaned.startsWith('0'))   cleaned = cleaned.slice(1);
  return cleaned;
};

/**
 * Validate Nepali mobile number
 * NTC: 98X, Ncell: 97X, Smart: 96X, UTL: 95X
 */
export const isValidNepalPhone = (phone: string): boolean => {
  const normalized = normalizePhone(phone);
  return /^(98|97|96|95)\d{8}$/.test(normalized);
};

export const sendOTPSMS = async (phone: string, otp: string): Promise<boolean> => {
  const message = `Your GM Collection House OTP is: ${otp}. Valid for 10 minutes. Do not share this code.`;
  return sendSMS(phone, message);
};

export const sendOrderConfirmationSMS = async (phone: string, orderNumber: string): Promise<boolean> => {
  const message = `GM Collection House: Your order ${orderNumber} is confirmed! Track at gmcollection.com.np/orders`;
  return sendSMS(phone, message);
};

export const sendShipmentUpdateSMS = async (
  phone: string,
  orderNumber: string,
  status: string,
  trackingNumber?: string,
): Promise<boolean> => {
  let message = `GM Collection House: Your order ${orderNumber} status: ${status}.`;
  if (trackingNumber) message += ` Track: ${trackingNumber}`;
  return sendSMS(phone, message);
};
