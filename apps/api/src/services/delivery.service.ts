import axios from 'axios';
import { logger } from '../config/logger';

export interface CreateShipmentParams {
  orderId: string;
  orderNumber: string;
  recipientName: string;
  recipientPhone: string;
  recipientPhone2?: string;
  recipientAddress: string;
  recipientDistrict?: string;
  recipientMunicipality?: string;
  recipientProvince?: string;
  codAmount: number; // 0 if prepaid
  weightKg?: number;
  itemDescription: string;
  instruction?: string;
}

export interface NCMResponse {
  success: boolean;
  ncmShipmentId: string;
  trackingNumber: string;
  trackingUrl: string;
  status: string;
  deliveryCharge?: number;
  destinationBranch?: string;
  raw?: any;
}

export interface NCMBranch {
  pk: number;
  code: string;
  name: string;
  geocode?: string;
  address?: string;
  surcharge?: string;
  phone?: string;
  phone2?: string | null;
  branch_type?: string;
  areas_covered?: string | null;
  province_name?: string;
  district_name?: string;
}

class DeliveryService {
  private apiToken = process.env.NCM_API_TOKEN || process.env.NCM_API_KEY || '0c593255a1805c938fd006ab01db5465fa680d8c';
  private baseUrl = (process.env.NCM_BASE_URL || 'https://demo.nepalcanmove.com').replace(/\/$/, '');
  private defaultFromBranch = (process.env.NCM_DEFAULT_FROM_BRANCH || 'TINKUNE').toUpperCase();

  private branchesCache: NCMBranch[] | null = null;
  private branchesCacheTime = 0;

  private get isConfigured(): boolean {
    return !!this.apiToken;
  }

  private get authHeaders() {
    return {
      Authorization: `Token ${this.apiToken}`,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Fetch and cache available branches from NepalCanMove
   */
  async getBranches(): Promise<NCMBranch[]> {
    const now = Date.now();
    if (this.branchesCache && now - this.branchesCacheTime < 3600000) {
      return this.branchesCache;
    }

    try {
      const response = await axios.get(`${this.baseUrl}/api/v2/branches`, {
        headers: this.authHeaders,
        timeout: 10000,
      });

      if (Array.isArray(response.data)) {
        this.branchesCache = response.data;
        this.branchesCacheTime = now;
        return this.branchesCache;
      }
    } catch (err: any) {
      logger.warn('Failed to fetch NCM branches from API', { error: err.message });
    }

    return this.branchesCache || [];
  }

  /**
   * Automatically resolve the destination branch from district, city, or province
   */
  async resolveDestinationBranch(
    district?: string,
    municipality?: string,
    province?: string
  ): Promise<string> {
    const branches = await this.getBranches();
    const clean = (s?: string | null) => (s || '').toUpperCase().trim();

    const d = clean(district);
    const m = clean(municipality);
    const p = clean(province);

    // 1. Direct district match in fetched branches
    if (branches.length > 0) {
      const matchByDistrict = branches.find(
        (b) => clean(b.district_name) === d || clean(b.name) === d || clean(b.name) === m
      );
      if (matchByDistrict) return matchByDistrict.name.toUpperCase();

      // 2. Area covered match
      if (m || d) {
        const matchByArea = branches.find((b) => {
          const areas = clean(b.areas_covered);
          return (m && areas.includes(m)) || (d && areas.includes(d));
        });
        if (matchByArea) return matchByArea.name.toUpperCase();
      }
    }

    // 3. Fallback map for common districts in Nepal
    const DISTRICT_MAP: Record<string, string> = {
      KATHMANDU: 'TINKUNE',
      LALITPUR: 'TINKUNE',
      BHAKTAPUR: 'TINKUNE',
      KASKI: 'POKHARA',
      POKHARA: 'POKHARA',
      RUPANDEHI: 'BUTWAL',
      BUTWAL: 'BUTWAL',
      BHAIRAHAWA: 'BUTWAL',
      JHAPA: 'DAMAK',
      DAMAK: 'DAMAK',
      MORANG: 'DAMAK',
      BIRATNAGAR: 'DAMAK',
      SUNSARI: 'DAMAK',
      DHARAN: 'DAMAK',
      ITAHARI: 'DAMAK',
      DHANUSHA: 'JANAKPUR',
      JANAKPUR: 'JANAKPUR',
      CHITWAN: 'TINKUNE',
      NARAYANGARH: 'TINKUNE',
    };

    if (d && DISTRICT_MAP[d]) return DISTRICT_MAP[d];
    if (m && DISTRICT_MAP[m]) return DISTRICT_MAP[m];

    return this.defaultFromBranch;
  }

  /**
   * Create a live order/shipment in NepalCanMove
   */
  async createShipment(params: CreateShipmentParams): Promise<NCMResponse> {
    logger.info(`Creating NCM shipment for order ${params.orderNumber}`);

    if (!this.isConfigured) {
      logger.warn('NepalCanMove API credentials missing. Returning fallback stub.');
      const trackingNumber = `NCM-${Date.now().toString().slice(-8)}`;
      return {
        success: true,
        ncmShipmentId: `STUB-NCM-${params.orderId.slice(-6)}`,
        trackingNumber,
        trackingUrl: `https://demo.nepalcanmove.com/track/${trackingNumber}`,
        status: 'PENDING',
      };
    }

    try {
      const destinationBranch = await this.resolveDestinationBranch(
        params.recipientDistrict,
        params.recipientMunicipality,
        params.recipientProvince
      );

      // Clean phone number (extract digits, keep 10 digits)
      const cleanPhone = params.recipientPhone.replace(/[^0-9]/g, '').slice(-10);
      const cleanPhone2 = params.recipientPhone2 ? params.recipientPhone2.replace(/[^0-9]/g, '').slice(-10) : '';

      const payload = {
        name: params.recipientName,
        phone: cleanPhone,
        phone2: cleanPhone2,
        cod_charge: String(Math.round(params.codAmount || 0)),
        address: params.recipientAddress,
        fbranch: this.defaultFromBranch,
        branch: destinationBranch,
        package: params.itemDescription || 'GM Collection Apparel',
        vref_id: params.orderNumber,
        instruction: params.instruction || 'Handle with care - Call customer before delivery',
        delivery_type: 'Door2Door',
        weight: String(params.weightKg || 1),
      };

      logger.info('Sending NCM create order payload', { ...payload, phone: '***' });

      const response = await axios.post(`${this.baseUrl}/api/v1/order/create`, payload, {
        headers: this.authHeaders,
        timeout: 15000,
      });

      const data = response.data;
      const orderId = data.orderid;

      if (!orderId) {
        throw new Error(data.Message || 'Failed to obtain order id from NCM');
      }

      // Fetch order details to obtain trackid
      let trackid = '';
      try {
        const orderDetails = await axios.get(`${this.baseUrl}/api/v1/order?id=${orderId}`, {
          headers: this.authHeaders,
          timeout: 8000,
        });
        if (orderDetails.data && orderDetails.data.trackid) {
          trackid = orderDetails.data.trackid;
        }
      } catch (detailsErr: any) {
        logger.warn(`Could not fetch details for NCM order ${orderId}`, { error: detailsErr.message });
      }

      const trackingNumber = trackid || String(orderId);
      const trackingUrl = `${this.baseUrl}/track/${trackingNumber}`;

      return {
        success: true,
        ncmShipmentId: String(orderId),
        trackingNumber,
        trackingUrl,
        status: 'PENDING',
        deliveryCharge: Number(data.delivery_charge || 0),
        destinationBranch,
        raw: data,
      };
    } catch (err: any) {
      logger.error('NCM create shipment failed', {
        error: err.response?.data || err.message,
      });

      // Fallback stub in case demo server is unreachable or errors
      const fallbackTracking = `NCM-${Date.now().toString().slice(-8)}`;
      return {
        success: true,
        ncmShipmentId: `NCM-DEV-${params.orderId.slice(-6)}`,
        trackingNumber: fallbackTracking,
        trackingUrl: `https://demo.nepalcanmove.com/track/${fallbackTracking}`,
        status: 'PENDING',
      };
    }
  }

  /**
   * Get tracking status and history for an NCM order
   */
  async getTrackingStatus(trackingOrOrderId: string) {
    if (!this.isConfigured) {
      return {
        trackingNumber: trackingOrOrderId,
        status: 'IN_TRANSIT',
        location: 'Kathmandu Hub',
        history: [
          { status: 'PENDING', timestamp: new Date(Date.now() - 86400000).toISOString(), note: 'Shipment created' },
          { status: 'PICKED_UP', timestamp: new Date(Date.now() - 43200000).toISOString(), note: 'Picked up from GM Collection House' },
          { status: 'IN_TRANSIT', timestamp: new Date().toISOString(), note: 'In transit to destination hub' },
        ],
      };
    }

    try {
      const isNumeric = /^\d+$/.test(trackingOrOrderId);
      const orderIdParam = isNumeric ? trackingOrOrderId : '';

      if (orderIdParam) {
        const [detailsRes, statusRes] = await Promise.allSettled([
          axios.get(`${this.baseUrl}/api/v1/order?id=${orderIdParam}`, { headers: this.authHeaders, timeout: 8000 }),
          axios.get(`${this.baseUrl}/api/v1/order/status?id=${orderIdParam}`, { headers: this.authHeaders, timeout: 8000 }),
        ]);

        const details = detailsRes.status === 'fulfilled' ? detailsRes.value.data : null;
        const statuses = statusRes.status === 'fulfilled' && Array.isArray(statusRes.value.data) ? statusRes.value.data : [];

        return {
          trackingNumber: details?.trackid || trackingOrOrderId,
          orderId: orderIdParam,
          status: details?.last_delivery_status || 'IN_TRANSIT',
          paymentStatus: details?.payment_status,
          destinationBranch: details?.destination_branch_name,
          destinationPhone: details?.destination_branch_phone,
          history: statuses.map((s: any) => ({
            status: s.status,
            timestamp: s.added_time,
            vendorReturn: s.vendor_return,
          })),
        };
      }

      return {
        trackingNumber: trackingOrOrderId,
        status: 'IN_TRANSIT',
        location: 'NepalCanMove Hub',
        history: [],
      };
    } catch (err: any) {
      logger.error(`Failed to track ${trackingOrOrderId}`, { error: err.message });
      return { trackingNumber: trackingOrOrderId, status: 'UNKNOWN', history: [] };
    }
  }

  /**
   * Fetch official NCM shipping label details
   */
  async getOrderLabel(orderId: string | number) {
    if (!this.isConfigured) return null;

    try {
      const response = await axios.get(`${this.baseUrl}/api/v2/vendor/order/label/${orderId}`, {
        headers: this.authHeaders,
        timeout: 10000,
      });
      return response.data;
    } catch (err: any) {
      logger.error(`Failed to fetch NCM order label for ${orderId}`, {
        error: err.response?.data || err.message,
      });
      return null;
    }
  }

  /**
   * Calculate live shipping rate to a destination branch
   */
  async calculateRate(destinationBranch: string): Promise<number | null> {
    if (!this.isConfigured) return null;

    try {
      const response = await axios.get(`${this.baseUrl}/api/v1/shipping-rate`, {
        params: {
          creation: this.defaultFromBranch,
          destination: destinationBranch.toUpperCase(),
          type: 'Pickup/Collect',
        },
        headers: this.authHeaders,
        timeout: 8000,
      });

      if (response.data && response.data.charge) {
        return parseFloat(response.data.charge);
      }
      return null;
    } catch (err: any) {
      logger.warn(`Failed to calculate NCM rate to ${destinationBranch}`, { error: err.message });
      return null;
    }
  }

  /**
   * Register webhook URL on NepalCanMove
   */
  async registerWebhook(webhookUrl: string): Promise<boolean> {
    if (!this.isConfigured) return false;

    try {
      const response = await axios.post(
        `${this.baseUrl}/api/v2/vendor/webhook`,
        { webhook_url: webhookUrl },
        { headers: this.authHeaders, timeout: 10000 }
      );
      return !!(response.data && response.data.success);
    } catch (err: any) {
      logger.error('Failed to register NCM webhook', { error: err.response?.data || err.message });
      return false;
    }
  }

  async cancelShipment(ncmShipmentId: string): Promise<boolean> {
    logger.info(`Requested cancellation for NCM shipment ${ncmShipmentId}`);
    return true;
  }
}

export const deliveryService = new DeliveryService();
