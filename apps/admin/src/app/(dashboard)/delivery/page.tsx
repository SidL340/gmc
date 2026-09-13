'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Truck, Search, MapPin, Calculator, ExternalLink,
  Printer, CheckCircle2, Clock, PackageCheck, AlertCircle,
  Settings, Key, ShieldCheck, Eye, EyeOff, Check, X, RefreshCw
} from 'lucide-react';
import { adminApi } from '@/lib/api';
import { formatNPR, formatDateTime } from '@/lib/utils';
import toast from 'react-hot-toast';

export default function DeliveryManagementPage() {
  const [selectedBranch, setSelectedBranch] = useState('POKHARA');
  const [rateEstimate, setRateEstimate] = useState<number | null>(null);
  const [calcLoading, setCalcLoading] = useState(false);
  const [labelOrderId, setLabelOrderId] = useState<string | null>(null);
  const [showVendorModal, setShowVendorModal] = useState(false);
  const [requestingPickup, setRequestingPickup] = useState(false);

  // Fetch NCM config (demo vs production)
  const { data: ncmConfig } = useQuery({
    queryKey: ['ncm-config'],
    queryFn: () => adminApi.get('/api/shipments/config').then((r) => r.data.data),
  });

  // Fetch branches
  const { data: branchesData, isLoading: branchesLoading } = useQuery({
    queryKey: ['ncm-branches'],
    queryFn: () => adminApi.get('/api/shipments/branches').then((r) => r.data.data),
  });

  // Fetch orders with shipments
  const { data: ordersData, isLoading: ordersLoading } = useQuery({
    queryKey: ['orders-delivery'],
    queryFn: () => adminApi.get('/api/orders?limit=50').then((r) => r.data.data),
    refetchInterval: 30000,
  });

  const readyToShipOrders = ordersData?.orders?.filter((o: any) => o.status === 'PACKED') || [];

  const handleRequestPickup = async () => {
    const count = readyToShipOrders.length || 1;
    setRequestingPickup(true);
    try {
      const res = await adminApi.post('/api/shipments/pickup-ticket', {
        packetCount: count,
        branch: ncmConfig?.defaultFromBranch || 'TINKUNE',
        note: `${count} boutique parcel(s) ready for pickup at GM Collection House`,
      });
      if (res.data?.data?.ticketId) {
        toast.success(`NCM Pickup Ticket #${res.data.data.ticketId} created! Rider requested for store pickup.`);
      } else {
        toast.success(res.data?.data?.message || 'Pickup requested with NepalCanMove!');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to request pickup.');
    } finally {
      setRequestingPickup(false);
    }
  };

  const calculateRate = async () => {
    setCalcLoading(true);
    try {
      const res = await adminApi.get(`/api/shipments/rate?branch=${selectedBranch}`);
      setRateEstimate(res.data?.data?.charge || 175);
      toast.success(`Shipping rate to ${selectedBranch}: NPR ${res.data?.data?.charge || 175}`);
    } catch {
      toast.error('Failed to calculate rate');
    } finally {
      setCalcLoading(false);
    }
  };

  const shippedOrders = ordersData?.orders?.filter((o: any) => o.shipment || ['PACKED', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED'].includes(o.status)) || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2.5">
            <Truck className="text-primary-600" size={28} />
            NepalCanMove Logistics Hub
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage nationwide dispatch, live package tracking, shipping rates, and thermal labels.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {ncmConfig?.isDemo ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              Demo Environment
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-green-50 text-green-700 border border-green-200">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              Live Production
            </span>
          )}
          <button
            onClick={handleRequestPickup}
            disabled={requestingPickup}
            className="btn-secondary text-xs flex items-center gap-1.5 cursor-pointer"
          >
            <PackageCheck size={13} className={requestingPickup ? 'animate-spin' : 'text-primary-600'} />
            {requestingPickup
              ? 'Requesting...'
              : `Request Rider Pickup ${readyToShipOrders.length > 0 ? `(${readyToShipOrders.length} Ready)` : ''}`}
          </button>
          <button
            onClick={() => setShowVendorModal(true)}
            className="btn-primary text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Settings size={13} /> Vendor API Setup
          </button>
          <a
            href={ncmConfig?.portalUrl || 'https://demo.nepalcanmove.com/'}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary text-xs flex items-center gap-1"
          >
            {ncmConfig?.isDemo ? 'Demo NCM Portal' : 'NCM Portal'} <ExternalLink size={12} />
          </a>
        </div>
      </div>

      {/* Demo Notice Banner */}
      {ncmConfig?.isDemo && (
        <div className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl flex items-start justify-between gap-4 text-xs text-amber-900 shadow-sm">
          <div className="space-y-1">
            <p className="font-bold flex items-center gap-1.5 text-amber-950">
              <AlertCircle size={15} className="text-amber-600 flex-shrink-0" />
              NepalCanMove Demo Server Active (Development Mode)
            </p>
            <p className="text-amber-800">
              Shipment dispatches, rate lookups, and branch resolutions are connected to NepalCanMove's demo portal. Physical couriers will not be dispatched.
            </p>
            <p className="text-amber-700 text-[11px] pt-1">
              🚀 <strong>When ready for Live Orders:</strong> Set <code className="bg-white/80 px-1.5 py-0.5 rounded border border-amber-300 font-mono text-amber-900">NCM_ENV=production</code> and paste your live token in <code className="bg-white/80 px-1.5 py-0.5 rounded border border-amber-300 font-mono text-amber-900">apps/api/.env</code>. The entire platform will switch seamlessly without code edits!
            </p>
          </div>
          <span className="px-2.5 py-1 rounded-lg bg-amber-100 text-amber-800 font-mono text-[10px] font-bold uppercase whitespace-nowrap">
            REST v2 API
          </span>
        </div>
      )}

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="card p-5 space-y-2">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Default Pickup Hub</p>
          <div className="flex items-center justify-between">
            <span className="text-lg font-bold text-gray-900">TINKUNE (Kathmandu)</span>
            <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-50 text-primary-700">Code: TINK1</span>
          </div>
          <p className="text-xs text-gray-500">GM Collection House central warehouse & fulfillment center</p>
        </div>

        <div className="card p-5 space-y-2">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Active Shipments</p>
          <div className="flex items-center justify-between">
            <span className="text-2xl font-bold text-primary-600">{shippedOrders.length}</span>
            <PackageCheck size={24} className="text-primary-400" />
          </div>
          <p className="text-xs text-gray-500">Orders packed, in transit, or delivered via NCM</p>
        </div>

        {/* Rate Calculator Card */}
        <div className="card p-5 space-y-3 bg-gradient-to-br from-rose-50/50 to-white">
          <p className="text-xs font-bold text-primary-800 uppercase tracking-wider flex items-center gap-1">
            <Calculator size={14} /> Quick Shipping Rate Calculator
          </p>
          <div className="flex gap-2">
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="input text-xs flex-1 py-1.5"
            >
              {branchesData?.map((b: any) => (
                <option key={b.name} value={b.name}>
                  {b.name} ({b.district_name || b.code})
                </option>
              )) || (
                <>
                  <option value="POKHARA">POKHARA (Kaski)</option>
                  <option value="BUTWAL">BUTWAL (Rupandehi)</option>
                  <option value="DAMAK">DAMAK (Jhapa)</option>
                  <option value="JANAKPUR">JANAKPUR (Dhanusha)</option>
                  <option value="TINKUNE">TINKUNE (Kathmandu)</option>
                </>
              )}
            </select>
            <button
              onClick={calculateRate}
              disabled={calcLoading}
              className="btn-primary text-xs py-1.5 px-3"
            >
              {calcLoading ? '...' : 'Estimate'}
            </button>
          </div>
          {rateEstimate !== null && (
            <p className="text-xs font-bold text-green-700">
              Estimated Delivery: NPR {rateEstimate} (Door2Door)
            </p>
          )}
        </div>
      </div>

      {/* Dispatched / Shipped Orders Table */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-base font-bold text-gray-900">Active Shipments & Labels</h2>
          <span className="text-xs text-gray-500 font-medium">{shippedOrders.length} orders</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100 text-xs text-gray-500 uppercase">
              <tr>
                <th className="text-left px-4 py-3">Order Ref</th>
                <th className="text-left px-4 py-3">Recipient</th>
                <th className="text-left px-4 py-3">Destination / Branch</th>
                <th className="text-left px-4 py-3">Tracking Code</th>
                <th className="text-left px-4 py-3">Payment</th>
                <th className="text-left px-4 py-3">Logistics Status</th>
                <th className="text-right px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {ordersLoading && (
                <tr><td colSpan={7} className="text-center py-10 text-gray-400">Loading shipments…</td></tr>
              )}
              {shippedOrders.map((order: any) => (
                <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs font-semibold text-gray-900">
                    {order.orderNumber}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{order.shippingAddress?.fullName || order.user?.name}</p>
                    <p className="text-xs text-gray-400">📞 {order.shippingAddress?.phone || order.user?.phone}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-xs font-medium text-gray-800">
                      {order.shippingAddress?.municipality || order.shippingAddress?.district || 'Kathmandu'}
                    </p>
                    <p className="text-[11px] text-gray-400">{order.shippingAddress?.province}</p>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs font-medium text-primary-700">
                    {order.shipment?.trackingNumber || (
                      <span className="text-amber-600 bg-amber-50 px-2 py-0.5 rounded text-[10px]">
                        Pending Dispatch
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="badge badge-gray text-xs font-semibold">
                      {order.payment?.method === 'COD' ? `COD: ${formatNPR(order.total)}` : 'PREPAID'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-gray-800">
                      <Clock size={12} className="text-primary-500" />
                      {order.shipment?.status || order.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => setLabelOrderId(order.id)}
                        className="btn-secondary text-xs py-1 px-2.5 flex items-center gap-1"
                        title="Print official shipping label"
                      >
                        <Printer size={13} /> Label
                      </button>
                      {order.shipment?.trackingUrl && (
                        <a
                          href={order.shipment.trackingUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-rose-50 rounded"
                          title="Track on NepalCanMove"
                        >
                          <ExternalLink size={14} />
                        </a>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {shippedOrders.length === 0 && !ordersLoading && (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-gray-400">
                    No active shipments. When you mark an order as <strong>PACKED</strong>, it is automatically pushed to NepalCanMove.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Available Delivery Hubs / Branches */}
      <div className="card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-gray-900">NepalCanMove Branch Network</h3>
            <p className="text-xs text-gray-500">Live operational branches configured in demo/production portal</p>
          </div>
          <span className="text-xs bg-gray-100 text-gray-700 px-3 py-1 rounded-full font-medium">
            {branchesData?.length || 6} Branches Active
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {(branchesData || [
            { name: 'TINKUNE', code: 'TINK1', district_name: 'KATHMANDU', phone: '9851107555', address: 'By BG Futsal, Jadibuti' },
            { name: 'POKHARA', code: 'POKH1', district_name: 'KASKI', phone: '9801984277', address: 'Sabhagriya Chowk' },
            { name: 'BUTWAL', code: 'BUTW1', district_name: 'RUPANDEHI', phone: '9801984355', address: 'Dev Siddha Chowk' },
            { name: 'DAMAK', code: 'DAMA1', district_name: 'JHAPA', phone: '9801984106', address: 'Near Traffic Office' },
            { name: 'JANAKPUR', code: 'JANA1', district_name: 'DHANUSHA', phone: '9801984468', address: 'Devi Chowk, Janakpur-10' },
            { name: 'SANKHU', code: 'SANK1', district_name: 'KATHMANDU', phone: '9701003682', address: 'Opp. Police Station' },
          ]).map((branch: any) => (
            <div key={branch.name} className="p-3.5 rounded-xl border border-gray-100 bg-gray-50/50 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-gray-900">{branch.name}</span>
                <span className="text-[10px] font-mono bg-white px-1.5 py-0.5 rounded border border-gray-200">
                  {branch.code}
                </span>
              </div>
              <p className="text-xs text-gray-500 flex items-center gap-1">
                <MapPin size={12} className="text-primary-500" /> {branch.district_name || 'Nepal'} · {branch.address || ''}
              </p>
              {branch.phone && (
                <p className="text-[11px] text-gray-600">📞 {branch.phone}</p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Label Modal Trigger */}
      {labelOrderId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-gray-900">NepalCanMove Shipping Label</h3>
              <button onClick={() => setLabelOrderId(null)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="border-2 border-dashed border-gray-300 rounded-xl p-5 text-xs space-y-3 font-sans">
              <div className="flex justify-between border-b pb-2">
                <div>
                  <h4 className="font-bold text-sm">GM COLLECTION HOUSE</h4>
                  <p className="text-gray-500">Kathmandu, Nepal · 📞 9851107555</p>
                </div>
                <span className="font-bold text-primary-700 bg-rose-50 px-2 py-0.5 rounded">NCM Express</span>
              </div>
              <div className="bg-gray-50 p-2.5 rounded font-mono text-xs flex justify-between">
                <span>Hub: TINKUNE → DESTINATION</span>
                <span className="font-bold text-gray-900">DOOR TO DOOR</span>
              </div>
              <p className="text-gray-500 text-center py-2">Click below to print formatted thermal packing slip & label</p>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setLabelOrderId(null)} className="btn-secondary text-xs">Close</button>
              <button onClick={() => window.print()} className="btn-primary text-xs flex items-center gap-1">
                <Printer size={13} /> Print Label
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Vendor Setup Modal */}
      {showVendorModal && (
        <NCMVendorSetupModal
          config={ncmConfig}
          onClose={() => setShowVendorModal(false)}
        />
      )}
    </div>
  );
}

function NCMVendorSetupModal({
  config,
  onClose,
}: {
  config: any;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [env, setEnv] = useState<'demo' | 'production'>(config?.environment || 'demo');
  const [token, setToken] = useState('');
  const [branch, setBranch] = useState(config?.defaultFromBranch || 'TINKUNE');
  const [showToken, setShowToken] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const promises = [
        adminApi.put('/api/settings', { key: 'ncm_environment', value: env }),
        adminApi.put('/api/settings', { key: 'ncm_from_branch', value: branch.toUpperCase().trim() }),
      ];
      if (token.trim()) {
        promises.push(adminApi.put('/api/settings', { key: 'ncm_api_token', value: token.trim() }));
      }
      return Promise.all(promises);
    },
    onSuccess: () => {
      toast.success('Logistics vendor settings saved successfully!');
      qc.invalidateQueries({ queryKey: ['ncm-config'] });
      qc.invalidateQueries({ queryKey: ['ncm-branches'] });
      onClose();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to save settings.');
    },
  });

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await adminApi.get('/api/shipments/branches');
      const count = Array.isArray(res.data?.data) ? res.data.data.length : 0;
      setTestResult({
        success: true,
        message: `Successfully connected! Fetched ${count} delivery hub branches across Nepal.`,
      });
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.response?.data?.message || 'Connection test failed. Verify network or credentials.',
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 space-y-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-rose-50 text-primary-600 flex items-center justify-center">
              <Truck size={20} />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-base font-serif">Logistics Partner Vendor Setup</h3>
              <p className="text-[11px] text-gray-500">NepalCanMove REST v2 API Credentials &amp; Fulfillment</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Instructions */}
        <div className="p-3.5 bg-blue-50/70 rounded-2xl border border-blue-100 text-xs space-y-1.5 text-blue-900">
          <p className="font-bold flex items-center gap-1.5 text-blue-950">
            <ShieldCheck size={14} className="text-blue-600" />
            How to Link your Official Vendor Account:
          </p>
          <ol className="list-decimal list-inside space-y-1 text-[11px] text-blue-800">
            <li>Register as a Merchant on <a href="https://nepalcanmove.com" target="_blank" rel="noopener noreferrer" className="font-bold underline text-blue-900">nepalcanmove.com</a> for COD bank payout settlement.</li>
            <li>In your NCM Merchant Portal, open <strong>Settings ➡️ API Credentials</strong>.</li>
            <li>Copy your <strong>API Token</strong>, select <strong>Production</strong> below, and click Save.</li>
          </ol>
        </div>

        <div className="space-y-4 text-xs">
          {/* Environment */}
          <div>
            <label className="font-bold text-gray-700 block mb-1">Environment Mode</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setEnv('demo')}
                className={`py-2 px-3 rounded-xl border text-left flex items-center justify-between cursor-pointer transition-all ${
                  env === 'demo'
                    ? 'border-amber-400 bg-amber-50 text-amber-900 font-bold'
                    : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                <div>
                  <p className="text-xs">Demo (Sandbox)</p>
                  <p className="text-[10px] text-gray-500 font-normal">Safe testing with demo token</p>
                </div>
                {env === 'demo' && <Check size={16} className="text-amber-600" />}
              </button>

              <button
                type="button"
                onClick={() => setEnv('production')}
                className={`py-2 px-3 rounded-xl border text-left flex items-center justify-between cursor-pointer transition-all ${
                  env === 'production'
                    ? 'border-green-500 bg-green-50 text-green-900 font-bold'
                    : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                <div>
                  <p className="text-xs">Production (Live)</p>
                  <p className="text-[10px] text-gray-500 font-normal">Real pickups &amp; deliveries</p>
                </div>
                {env === 'production' && <Check size={16} className="text-green-600" />}
              </button>
            </div>
          </div>

          {/* Current Status */}
          <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-between">
            <span className="text-gray-500 font-medium">Active Token Status:</span>
            <span className="font-mono font-bold text-gray-800">
              {config?.maskedToken || (env === 'demo' ? 'Default NCM Demo Token' : 'Not configured')}
            </span>
          </div>

          {/* API Token Input */}
          <div>
            <label className="font-bold text-gray-700 block mb-1">
              {env === 'production' ? 'Live NCM Vendor API Token' : 'Custom Token (Optional)'}
            </label>
            <div className="relative">
              <input
                type={showToken ? 'text' : 'password'}
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder={config?.hasCustomToken ? 'Leave blank to keep existing token' : 'Paste NCM Vendor API Token'}
                className="input w-full pr-10 text-xs font-mono"
              />
              <button
                type="button"
                onClick={() => setShowToken(!showToken)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                {showToken ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            <p className="text-[10px] text-gray-400 mt-1">
              {env === 'demo'
                ? 'Leave blank to use the built-in verified NCM Demo vendor token.'
                : 'Obtain from your official NepalCanMove merchant profile.'}
            </p>
          </div>

          {/* Default Pickup Hub */}
          <div>
            <label className="font-bold text-gray-700 block mb-1">Store Pickup Branch / Hub</label>
            <input
              type="text"
              value={branch}
              onChange={(e) => setBranch(e.target.value.toUpperCase())}
              placeholder="TINKUNE"
              className="input w-full text-xs font-mono"
            />
            <p className="text-[10px] text-gray-400 mt-1">
              GM Collection House central store location (default: <span className="font-bold">TINKUNE</span>).
            </p>
          </div>

          {/* Connection Test */}
          <div className="pt-1">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={testing}
              className="btn-secondary text-xs w-full justify-center flex items-center gap-1.5 py-2 cursor-pointer"
            >
              <RefreshCw size={13} className={testing ? 'animate-spin' : ''} />
              {testing ? 'Testing Connection...' : 'Test Connection to NCM Server'}
            </button>
            {testResult && (
              <p
                className={`mt-2 p-2 rounded-lg text-[11px] font-medium ${
                  testResult.success ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'
                }`}
              >
                {testResult.message}
              </p>
            )}
          </div>
        </div>

        <div className="flex gap-2 justify-end pt-3 border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary text-xs py-2 px-4 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className="btn-primary text-xs py-2 px-5 flex items-center gap-1.5 cursor-pointer"
          >
            <Check size={14} />
            {saveMutation.isPending ? 'Saving...' : 'Save Vendor Setup'}
          </button>
        </div>
      </div>
    </div>
  );
}
