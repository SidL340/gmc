'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Store, Phone, MapPin, Globe,
  Save, Truck, CreditCard, QrCode, Eye, EyeOff,
  Check, Zap, AlertCircle, ShieldCheck, RefreshCw,
  Clock, Receipt, Building2, ExternalLink,
  Smartphone, Banknote, CheckCircle2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { adminApi } from '@/lib/api';

type TabType = 'payments' | 'logistics' | 'store' | 'social' | 'receipts';

export default function SettingsPage() {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabType>('payments');
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [isTestingNcm, setIsTestingNcm] = useState(false);
  const [ncmTestResult, setNcmTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Fetch all store settings
  const { data, isLoading } = useQuery({
    queryKey: ['store-settings'],
    queryFn: async () => {
      const res = await adminApi.get('/api/settings');
      return res.data;
    },
  });

  // Populate local form state when settings load
  useEffect(() => {
    if (data?.map) {
      setFormValues(data.map);
    } else if (data?.data && Array.isArray(data.data)) {
      const map: Record<string, string> = {};
      data.data.forEach((s: any) => {
        map[s.key] = s.value;
      });
      setFormValues(map);
    }
  }, [data]);

  // Bulk save mutation
  const saveMutation = useMutation({
    mutationFn: (valuesToSave: Record<string, string>) =>
      adminApi.post('/api/settings/bulk', { settings: valuesToSave }),
    onSuccess: (res) => {
      toast.success(res.data?.message || 'Settings saved successfully!');
      qc.invalidateQueries({ queryKey: ['store-settings'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to save settings.');
    },
  });

  const handleChange = (key: string, value: string) => {
    setFormValues((prev) => ({ ...prev, [key]: value }));
  };

  const toggleSecret = (key: string) => {
    setShowSecrets((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Test Nepal Can Move (NCM) connection
  const handleTestNcm = async () => {
    setIsTestingNcm(true);
    setNcmTestResult(null);
    try {
      const res = await adminApi.post('/api/settings/test-ncm', {
        environment: formValues['ncm_environment'] || 'demo',
        token: formValues['ncm_api_token'] || '',
        fromBranch: formValues['ncm_from_branch'] || 'TINKUNE',
        baseUrl: formValues['ncm_base_url'] || '',
      });

      const resData = res.data;
      setNcmTestResult(resData);
      if (resData.success) {
        toast.success(resData.message);
      } else {
        toast.error(resData.message);
      }
    } catch (err: any) {
      const errMsg = err.response?.data?.message || err.message || 'Failed to connect to NCM API';
      setNcmTestResult({ success: false, message: errMsg });
      toast.error(errMsg);
    } finally {
      setIsTestingNcm(false);
    }
  };

  // Quick preset loader for test environments
  const loadEsewaTestCredentials = () => {
    setFormValues((prev) => ({
      ...prev,
      esewa_enabled: 'true',
      esewa_environment: 'test',
      esewa_merchant_code: 'EPAYTEST',
      esewa_secret_key: '8gBm/:&EnhH.1/q',
    }));
    toast.success('Loaded eSewa Test Credentials (EPAYTEST)');
  };

  const loadKhaltiTestCredentials = () => {
    setFormValues((prev) => ({
      ...prev,
      khalti_enabled: 'true',
      khalti_environment: 'test',
      khalti_public_key: 'test_public_key_dc74e0fd69cb46cd85bb764261b52522',
      khalti_secret_key: 'test_secret_key_f59e8b7d18b4499f826f80d5a004ee10',
    }));
    toast.success('Loaded Khalti Test Sandbox Keys');
  };

  const loadNcmDemoCredentials = () => {
    setFormValues((prev) => ({
      ...prev,
      ncm_enabled: 'true',
      ncm_environment: 'demo',
      ncm_base_url: 'https://demo.nepalcanmove.com',
      ncm_from_branch: 'TINKUNE',
    }));
    toast.success('Loaded NCM Demo Sandbox URLs');
  };

  const handleSaveAll = () => {
    saveMutation.mutate(formValues);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="w-9 h-9 border-3 border-primary-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-gray-500 font-medium">Loading store settings &amp; API credentials…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-5">
        <div>
          <h1 className="text-xl font-bold text-gray-900 font-serif">Admin Settings &amp; Integrations Portal</h1>
          <p className="text-xs text-gray-500 mt-1">
            Configure payment gateways (eSewa, Khalti, FonePay, COD), Nepal Can Move courier APIs, and store preferences.
          </p>
        </div>
        <button
          type="button"
          onClick={handleSaveAll}
          disabled={saveMutation.isPending}
          className="btn-primary flex items-center gap-2 py-2 px-5 text-sm shadow-sm cursor-pointer self-start sm:self-auto"
        >
          {saveMutation.isPending ? (
            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Save size={16} />
          )}
          <span>Save All Settings</span>
        </button>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-gray-200 overflow-x-auto pb-px">
        {[
          { id: 'payments',  label: 'Payment Gateways & APIs', icon: CreditCard },
          { id: 'logistics', label: 'Logistics & Courier APIs', icon: Truck },
          { id: 'store',     label: 'Store Profile & Location', icon: Store },
          { id: 'social',    label: 'Social & Marketing',       icon: Globe },
          { id: 'receipts',  label: 'POS & Thermal Receipts',   icon: Receipt },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold whitespace-nowrap border-b-2 transition-all cursor-pointer ${
                isActive
                  ? 'border-primary-600 text-primary-600 bg-rose-50/50 rounded-t-lg'
                  : 'border-transparent text-gray-500 hover:text-gray-900 hover:border-gray-300'
              }`}
            >
              <Icon size={15} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ───────────────────────────────────────────────────────────────────────────── */}
      {/* TAB 1: PAYMENT GATEWAYS & APIs */}
      {/* ───────────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'payments' && (
        <div className="space-y-6">
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3 text-xs text-amber-900">
            <ShieldCheck size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Encrypted Credentials Storage</p>
              <p className="text-amber-800/90 mt-0.5">
                Secret API keys and merchant tokens are stored securely in your database and are never leaked to client storefront browsers.
              </p>
            </div>
          </div>

          {/* eSewa Portal */}
          <div className="card overflow-hidden border border-gray-200 shadow-sm">
            <div className="p-5 border-b border-gray-100 bg-emerald-50/30 flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white font-bold flex items-center justify-center text-sm shadow-xs">
                  eS
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-sm">eSewa ePay v2 Gateway</h3>
                  <p className="text-[11px] text-gray-500">Nepal's most popular digital wallet (HMAC SHA-256 enabled)</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={loadEsewaTestCredentials}
                  className="text-[11px] font-semibold text-emerald-700 bg-emerald-100/70 hover:bg-emerald-200 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                >
                  Load Test Credentials
                </button>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formValues['esewa_enabled'] === 'true'}
                    onChange={(e) => handleChange('esewa_enabled', e.target.checked ? 'true' : 'false')}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500" />
                  <span className="ml-2 text-xs font-semibold text-gray-700">
                    {formValues['esewa_enabled'] === 'true' ? 'Active' : 'Disabled'}
                  </span>
                </label>
              </div>
            </div>

            <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label text-xs font-semibold text-gray-700">Environment Mode</label>
                <select
                  value={formValues['esewa_environment'] || 'test'}
                  onChange={(e) => handleChange('esewa_environment', e.target.value)}
                  className="input text-sm"
                >
                  <option value="test">Sandbox / UAT Testing (rc-epay.esewa.com.np)</option>
                  <option value="live">Live Production (epay.esewa.com.np)</option>
                </select>
                <p className="text-[10px] text-gray-400 mt-1">Switch to Live Production when launching commercial sales.</p>
              </div>

              <div>
                <label className="label text-xs font-semibold text-gray-700">Merchant Code (Product ID)</label>
                <input
                  type="text"
                  placeholder="EPAYTEST or your eSewa Merchant ID"
                  value={formValues['esewa_merchant_code'] || ''}
                  onChange={(e) => handleChange('esewa_merchant_code', e.target.value)}
                  className="input text-sm font-mono"
                />
              </div>

              <div className="md:col-span-2">
                <label className="label text-xs font-semibold text-gray-700 flex items-center justify-between">
                  <span>Secret Key (HMAC SHA-256 Signature Secret)</span>
                  <button
                    type="button"
                    onClick={() => toggleSecret('esewa_secret_key')}
                    className="text-[11px] text-primary-600 hover:text-primary-800 flex items-center gap-1 cursor-pointer"
                  >
                    {showSecrets['esewa_secret_key'] ? <EyeOff size={13} /> : <Eye size={13} />}
                    <span>{showSecrets['esewa_secret_key'] ? 'Hide' : 'Reveal'}</span>
                  </button>
                </label>
                <input
                  type={showSecrets['esewa_secret_key'] ? 'text' : 'password'}
                  placeholder="e.g. 8gBm/:&EnhH.1/q"
                  value={formValues['esewa_secret_key'] || ''}
                  onChange={(e) => handleChange('esewa_secret_key', e.target.value)}
                  className="input text-sm font-mono"
                />
              </div>
            </div>
          </div>

          {/* Khalti Portal */}
          <div className="card overflow-hidden border border-gray-200 shadow-sm">
            <div className="p-5 border-b border-gray-100 bg-purple-50/30 flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-600 text-white font-bold flex items-center justify-center text-sm shadow-xs">
                  Kh
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-sm">Khalti ePayment v2 Gateway</h3>
                  <p className="text-[11px] text-gray-500">Fast checkout with Khalti wallet, ConnectIPS &amp; Mobile Banking</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={loadKhaltiTestCredentials}
                  className="text-[11px] font-semibold text-purple-700 bg-purple-100/70 hover:bg-purple-200 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                >
                  Load Test Keys
                </button>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formValues['khalti_enabled'] === 'true'}
                    onChange={(e) => handleChange('khalti_enabled', e.target.checked ? 'true' : 'false')}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600" />
                  <span className="ml-2 text-xs font-semibold text-gray-700">
                    {formValues['khalti_enabled'] === 'true' ? 'Active' : 'Disabled'}
                  </span>
                </label>
              </div>
            </div>

            <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label text-xs font-semibold text-gray-700">Environment</label>
                <select
                  value={formValues['khalti_environment'] || 'test'}
                  onChange={(e) => handleChange('khalti_environment', e.target.value)}
                  className="input text-sm"
                >
                  <option value="test">Sandbox (a.khalti.com)</option>
                  <option value="live">Live Production (khalti.com)</option>
                </select>
              </div>

              <div>
                <label className="label text-xs font-semibold text-gray-700">Public Key</label>
                <input
                  type="text"
                  placeholder="test_public_key_... or live_public_key_..."
                  value={formValues['khalti_public_key'] || ''}
                  onChange={(e) => handleChange('khalti_public_key', e.target.value)}
                  className="input text-sm font-mono"
                />
              </div>

              <div className="md:col-span-2">
                <label className="label text-xs font-semibold text-gray-700 flex items-center justify-between">
                  <span>Secret Key (Private API Key)</span>
                  <button
                    type="button"
                    onClick={() => toggleSecret('khalti_secret_key')}
                    className="text-[11px] text-primary-600 hover:text-primary-800 flex items-center gap-1 cursor-pointer"
                  >
                    {showSecrets['khalti_secret_key'] ? <EyeOff size={13} /> : <Eye size={13} />}
                    <span>{showSecrets['khalti_secret_key'] ? 'Hide' : 'Reveal'}</span>
                  </button>
                </label>
                <input
                  type={showSecrets['khalti_secret_key'] ? 'text' : 'password'}
                  placeholder="test_secret_key_... or live_secret_key_..."
                  value={formValues['khalti_secret_key'] || ''}
                  onChange={(e) => handleChange('khalti_secret_key', e.target.value)}
                  className="input text-sm font-mono"
                />
              </div>
            </div>
          </div>

          {/* Fonepay Gateway */}
          <div className="card overflow-hidden border border-gray-200 shadow-sm">
            <div className="p-5 border-b border-gray-100 bg-red-50/30 flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-600 text-white font-bold flex items-center justify-center text-sm shadow-xs">
                  FP
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-sm">Fonepay Merchant API Gateway</h3>
                  <p className="text-[11px] text-gray-500">Direct Fonepay QR dynamic request generator</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formValues['fonepay_enabled'] === 'true'}
                  onChange={(e) => handleChange('fonepay_enabled', e.target.checked ? 'true' : 'false')}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600" />
                <span className="ml-2 text-xs font-semibold text-gray-700">
                  {formValues['fonepay_enabled'] === 'true' ? 'Active' : 'Disabled'}
                </span>
              </label>
            </div>

            <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label text-xs font-semibold text-gray-700">Fonepay Merchant Code (PID)</label>
                <input
                  type="text"
                  placeholder="e.g. 1000000001"
                  value={formValues['fonepay_merchant_code'] || ''}
                  onChange={(e) => handleChange('fonepay_merchant_code', e.target.value)}
                  className="input text-sm font-mono"
                />
              </div>

              <div>
                <label className="label text-xs font-semibold text-gray-700">API Base URL</label>
                <input
                  type="text"
                  placeholder="https://dev-clientapi.fonepay.com or production URL"
                  value={formValues['fonepay_base_url'] || ''}
                  onChange={(e) => handleChange('fonepay_base_url', e.target.value)}
                  className="input text-sm font-mono"
                />
              </div>

              <div className="md:col-span-2">
                <label className="label text-xs font-semibold text-gray-700 flex items-center justify-between">
                  <span>Fonepay Secret Key (HMAC SHA-512)</span>
                  <button
                    type="button"
                    onClick={() => toggleSecret('fonepay_secret_key')}
                    className="text-[11px] text-primary-600 hover:text-primary-800 flex items-center gap-1 cursor-pointer"
                  >
                    {showSecrets['fonepay_secret_key'] ? <EyeOff size={13} /> : <Eye size={13} />}
                    <span>{showSecrets['fonepay_secret_key'] ? 'Hide' : 'Reveal'}</span>
                  </button>
                </label>
                <input
                  type={showSecrets['fonepay_secret_key'] ? 'text' : 'password'}
                  placeholder="Secret key provided by Fonepay"
                  value={formValues['fonepay_secret_key'] || ''}
                  onChange={(e) => handleChange('fonepay_secret_key', e.target.value)}
                  className="input text-sm font-mono"
                />
              </div>
            </div>
          </div>

          {/* Direct Bank Transfer & Store QR */}
          <div className="card overflow-hidden border border-gray-200 shadow-sm">
            <div className="p-5 border-b border-gray-100 bg-blue-50/30 flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
                  <Building2 size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-sm">Direct Bank Transfer &amp; Store QR Voucher</h3>
                  <p className="text-[11px] text-gray-500">Allow customers to transfer to store bank account or scan static shop QR</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formValues['bank_enabled'] === 'true'}
                  onChange={(e) => handleChange('bank_enabled', e.target.checked ? 'true' : 'false')}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600" />
                <span className="ml-2 text-xs font-semibold text-gray-700">
                  {formValues['bank_enabled'] === 'true' ? 'Active' : 'Disabled'}
                </span>
              </label>
            </div>

            <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label text-xs font-semibold text-gray-700">Bank Name</label>
                <input
                  type="text"
                  placeholder="e.g. NIC Asia Bank Ltd. / Nabil Bank"
                  value={formValues['bank_name'] || ''}
                  onChange={(e) => handleChange('bank_name', e.target.value)}
                  className="input text-sm"
                />
              </div>

              <div>
                <label className="label text-xs font-semibold text-gray-700">Account Holder Name</label>
                <input
                  type="text"
                  placeholder="e.g. GM COLLECTION HOUSE"
                  value={formValues['bank_account_name'] || ''}
                  onChange={(e) => handleChange('bank_account_name', e.target.value)}
                  className="input text-sm"
                />
              </div>

              <div>
                <label className="label text-xs font-semibold text-gray-700">Account Number</label>
                <input
                  type="text"
                  placeholder="e.g. 1042000000000001"
                  value={formValues['bank_account_number'] || ''}
                  onChange={(e) => handleChange('bank_account_number', e.target.value)}
                  className="input text-sm font-mono"
                />
              </div>

              <div>
                <label className="label text-xs font-semibold text-gray-700">Branch Name</label>
                <input
                  type="text"
                  placeholder="e.g. New Road / Tinkune Branch, Kathmandu"
                  value={formValues['bank_branch'] || ''}
                  onChange={(e) => handleChange('bank_branch', e.target.value)}
                  className="input text-sm"
                />
              </div>

              <div className="md:col-span-2">
                <label className="label text-xs font-semibold text-gray-700">Store Official QR Code Image URL</label>
                <input
                  type="url"
                  placeholder="https://... image of store's Fonepay or Nepalpay QR"
                  value={formValues['bank_qr_image'] || ''}
                  onChange={(e) => handleChange('bank_qr_image', e.target.value)}
                  className="input text-sm font-mono"
                />
                {formValues['bank_qr_image'] && (
                  <div className="mt-2 p-2 bg-gray-50 border rounded-xl inline-block">
                    <p className="text-[10px] text-gray-400 mb-1">QR Code Preview:</p>
                    <img
                      src={formValues['bank_qr_image']}
                      alt="Bank QR Preview"
                      className="w-32 h-32 object-contain bg-white rounded-lg border p-1"
                    />
                  </div>
                )}
              </div>

              <div className="md:col-span-2">
                <label className="label text-xs font-semibold text-gray-700">Checkout Instructions for Customer</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Please transfer to the above account or scan the QR. Share payment screenshot to WhatsApp 9851107555 with your order number."
                  value={formValues['bank_instructions'] || ''}
                  onChange={(e) => handleChange('bank_instructions', e.target.value)}
                  className="input text-sm"
                />
              </div>
            </div>
          </div>

          {/* Cash on Delivery (COD) */}
          <div className="card overflow-hidden border border-gray-200 shadow-sm">
            <div className="p-5 border-b border-gray-100 bg-gray-50 flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs">
                  <Banknote size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-sm">Cash on Delivery (COD)</h3>
                  <p className="text-[11px] text-gray-500">Pay cash upon parcel delivery by courier rider</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formValues['cod_available'] !== 'false' && formValues['cod_enabled'] !== 'false'}
                  onChange={(e) => {
                    const val = e.target.checked ? 'true' : 'false';
                    handleChange('cod_enabled', val);
                    handleChange('cod_available', val);
                  }}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500" />
                <span className="ml-2 text-xs font-semibold text-gray-700">
                  {formValues['cod_available'] !== 'false' ? 'Active' : 'Disabled'}
                </span>
              </label>
            </div>

            <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label text-xs font-semibold text-gray-700">Max COD Order Value Limit (NPR)</label>
                <input
                  type="number"
                  placeholder="e.g. 25000"
                  value={formValues['cod_max_amount'] || '25000'}
                  onChange={(e) => handleChange('cod_max_amount', e.target.value)}
                  className="input text-sm"
                />
                <p className="text-[10px] text-gray-400 mt-1">Orders above this amount must pay in advance via eSewa/Khalti/Bank.</p>
              </div>

              <div>
                <label className="label text-xs font-semibold text-gray-700">COD Extra Handling Fee (NPR)</label>
                <input
                  type="number"
                  placeholder="0"
                  value={formValues['cod_fee'] || '0'}
                  onChange={(e) => handleChange('cod_fee', e.target.value)}
                  className="input text-sm"
                />
                <p className="text-[10px] text-gray-400 mt-1">Set to 0 for free COD handling.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────────────── */}
      {/* TAB 2: LOGISTICS & COURIER APIs */}
      {/* ───────────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'logistics' && (
        <div className="space-y-6">
          {/* Nepal Can Move (NCM) */}
          <div className="card overflow-hidden border border-gray-200 shadow-sm">
            <div className="p-5 border-b border-gray-100 bg-rose-50/40 flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary-600 text-white flex items-center justify-center shadow-xs">
                  <Truck size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                    Nepal Can Move (NCM) Logistics Vendor Portal
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary-100 text-primary-800">
                      Official Partner
                    </span>
                  </h3>
                  <p className="text-[11px] text-gray-500">
                    Automated parcel manifest creation, door-to-door courier dispatch, and live status sync across 70+ districts in Nepal.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={loadNcmDemoCredentials}
                  className="text-[11px] font-semibold text-primary-700 bg-rose-100 hover:bg-rose-200 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                >
                  Load Demo URLs
                </button>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formValues['ncm_enabled'] !== 'false'}
                    onChange={(e) => handleChange('ncm_enabled', e.target.checked ? 'true' : 'false')}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600" />
                  <span className="ml-2 text-xs font-semibold text-gray-700">
                    {formValues['ncm_enabled'] !== 'false' ? 'Active' : 'Disabled'}
                  </span>
                </label>
              </div>
            </div>

            <div className="p-5 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="label text-xs font-semibold text-gray-700">NCM Environment</label>
                  <select
                    value={formValues['ncm_environment'] || 'demo'}
                    onChange={(e) => {
                      const env = e.target.value;
                      handleChange('ncm_environment', env);
                      if (env === 'production' && !formValues['ncm_base_url']?.includes('nepalcanmove.com')) {
                        handleChange('ncm_base_url', 'https://nepalcanmove.com');
                      } else if (env === 'demo') {
                        handleChange('ncm_base_url', 'https://demo.nepalcanmove.com');
                      }
                    }}
                    className="input text-sm font-semibold"
                  >
                    <option value="demo">Demo / Sandbox Environment (demo.nepalcanmove.com)</option>
                    <option value="production">Live Production (nepalcanmove.com)</option>
                  </select>
                </div>

                <div>
                  <label className="label text-xs font-semibold text-gray-700">Default Origin / Store Pickup Branch</label>
                  <input
                    type="text"
                    placeholder="e.g. TINKUNE or KATHMANDU"
                    value={formValues['ncm_from_branch'] || 'TINKUNE'}
                    onChange={(e) => handleChange('ncm_from_branch', e.target.value.toUpperCase())}
                    className="input text-sm font-mono font-bold"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">Branch code where NCM courier riders will pick up packages.</p>
                </div>

                <div className="md:col-span-2">
                  <label className="label text-xs font-semibold text-gray-700">Base API URL</label>
                  <input
                    type="url"
                    placeholder="https://demo.nepalcanmove.com"
                    value={formValues['ncm_base_url'] || (formValues['ncm_environment'] === 'production' ? 'https://nepalcanmove.com' : 'https://demo.nepalcanmove.com')}
                    onChange={(e) => handleChange('ncm_base_url', e.target.value)}
                    className="input text-sm font-mono"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="label text-xs font-semibold text-gray-700 flex items-center justify-between">
                    <span>NCM Vendor API Token</span>
                    <button
                      type="button"
                      onClick={() => toggleSecret('ncm_api_token')}
                      className="text-[11px] text-primary-600 hover:text-primary-800 flex items-center gap-1 cursor-pointer"
                    >
                      {showSecrets['ncm_api_token'] ? <EyeOff size={13} /> : <Eye size={13} />}
                      <span>{showSecrets['ncm_api_token'] ? 'Hide' : 'Reveal'}</span>
                    </button>
                  </label>
                  <input
                    type={showSecrets['ncm_api_token'] ? 'text' : 'password'}
                    placeholder="Paste NCM Vendor API Token (e.g. Token c857d4f...)"
                    value={formValues['ncm_api_token'] || ''}
                    onChange={(e) => handleChange('ncm_api_token', e.target.value)}
                    className="input text-sm font-mono"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">
                    Obtained from your Nepal Can Move vendor account portal settings.
                  </p>
                </div>
              </div>

              {/* Automatic manifest toggle */}
              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-gray-800">Auto-Push to NCM on Order Pack</p>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    When warehouse staff scans an order into PACKED status, automatically register the consignment on NCM and generate the courier tracking number.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formValues['ncm_auto_create_on_pack'] !== 'false'}
                    onChange={(e) => handleChange('ncm_auto_create_on_pack', e.target.checked ? 'true' : 'false')}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600" />
                </label>
              </div>

              {/* Test Connection Button & Result */}
              <div className="pt-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={handleTestNcm}
                  disabled={isTestingNcm}
                  className="btn-secondary text-xs flex items-center gap-1.5 py-2 px-4 cursor-pointer"
                >
                  {isTestingNcm ? (
                    <span className="w-4 h-4 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Zap size={14} className="text-amber-500" />
                  )}
                  <span>Test NCM API Connection</span>
                </button>

                {ncmTestResult && (
                  <div
                    className={`text-xs px-3 py-1.5 rounded-xl flex items-center gap-2 ${
                      ncmTestResult.success
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : 'bg-rose-50 text-rose-800 border border-rose-200'
                    }`}
                  >
                    {ncmTestResult.success ? (
                      <CheckCircle2 size={14} className="text-emerald-600" />
                    ) : (
                      <AlertCircle size={14} className="text-rose-600" />
                    )}
                    <span>{ncmTestResult.message}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Shipping Rates & Delivery Thresholds */}
          <div className="card overflow-hidden border border-gray-200 shadow-sm">
            <div className="p-5 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
              <CheckCircle2 size={18} className="text-primary-600" />
              <h3 className="font-bold text-gray-900 text-sm">Shipping Charges &amp; Free Delivery Thresholds</h3>
            </div>

            <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="label text-xs font-semibold text-gray-700">Inside Kathmandu Valley (NPR)</label>
                <input
                  type="number"
                  placeholder="100"
                  value={formValues['shippingCharge'] || formValues['shipping_inside_valley'] || '100'}
                  onChange={(e) => {
                    handleChange('shippingCharge', e.target.value);
                    handleChange('shipping_inside_valley', e.target.value);
                  }}
                  className="input text-sm"
                />
                <p className="text-[10px] text-gray-400 mt-1">Standard rate for Kathmandu, Lalitpur, Bhaktapur.</p>
              </div>

              <div>
                <label className="label text-xs font-semibold text-gray-700">Outside Valley / All Nepal (NPR)</label>
                <input
                  type="number"
                  placeholder="180"
                  value={formValues['shipping_outside_valley'] || '180'}
                  onChange={(e) => handleChange('shipping_outside_valley', e.target.value)}
                  className="input text-sm"
                />
                <p className="text-[10px] text-gray-400 mt-1">Pokhara, Butwal, Biratnagar, Narayangarh, etc.</p>
              </div>

              <div>
                <label className="label text-xs font-semibold text-gray-700">Free Shipping Threshold (NPR)</label>
                <input
                  type="number"
                  placeholder="2500"
                  value={formValues['freeShippingThreshold'] || '2500'}
                  onChange={(e) => handleChange('freeShippingThreshold', e.target.value)}
                  className="input text-sm font-bold text-primary-700"
                />
                <p className="text-[10px] text-gray-400 mt-1">Orders above this cart total enjoy free home delivery.</p>
              </div>

              <div className="md:col-span-3">
                <label className="label text-xs font-semibold text-gray-700">Estimated Delivery Timeframe Banner</label>
                <input
                  type="text"
                  placeholder="e.g. 1-2 Business Days in Kathmandu Valley · 3-5 Days across Nepal"
                  value={formValues['shipping_delivery_timeline'] || '1-2 Days Inside Valley · 3-5 Days Nationwide'}
                  onChange={(e) => handleChange('shipping_delivery_timeline', e.target.value)}
                  className="input text-sm"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────────────── */}
      {/* TAB 3: STORE PROFILE & LOCATION */}
      {/* ───────────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'store' && (
        <div className="space-y-6">
          <div className="card overflow-hidden border border-gray-200 shadow-sm">
            <div className="p-5 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
              <Store size={18} className="text-primary-600" />
              <h3 className="font-bold text-gray-900 text-sm">General Business &amp; Boutique Identity</h3>
            </div>

            <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label text-xs font-semibold text-gray-700">Store Name</label>
                <input
                  type="text"
                  value={formValues['storeName'] || 'GM Collection House'}
                  onChange={(e) => handleChange('storeName', e.target.value)}
                  className="input text-sm font-semibold"
                />
              </div>

              <div>
                <label className="label text-xs font-semibold text-gray-700">Brand Tagline</label>
                <input
                  type="text"
                  value={formValues['storeTagline'] || "Nepal's Premier Women's Fashion & Ethnic Boutique"}
                  onChange={(e) => handleChange('storeTagline', e.target.value)}
                  className="input text-sm"
                />
              </div>

              <div>
                <label className="label text-xs font-semibold text-gray-700">Primary Contact Phone</label>
                <input
                  type="tel"
                  placeholder="+977-9851107555"
                  value={formValues['storePhone'] || ''}
                  onChange={(e) => handleChange('storePhone', e.target.value)}
                  className="input text-sm"
                />
              </div>

              <div>
                <label className="label text-xs font-semibold text-gray-700">Secondary Phone / Mobile</label>
                <input
                  type="tel"
                  placeholder="+977-9800000000"
                  value={formValues['storePhone2'] || ''}
                  onChange={(e) => handleChange('storePhone2', e.target.value)}
                  className="input text-sm"
                />
              </div>

              <div>
                <label className="label text-xs font-semibold text-gray-700">WhatsApp Order Support Number</label>
                <input
                  type="tel"
                  placeholder="9851107555"
                  value={formValues['storeWhatsApp'] || formValues['storePhone'] || ''}
                  onChange={(e) => handleChange('storeWhatsApp', e.target.value)}
                  className="input text-sm"
                />
              </div>

              <div>
                <label className="label text-xs font-semibold text-gray-700">Official Store Email</label>
                <input
                  type="email"
                  placeholder="info@gmcollection.com.np"
                  value={formValues['storeEmail'] || ''}
                  onChange={(e) => handleChange('storeEmail', e.target.value)}
                  className="input text-sm"
                />
              </div>

              <div>
                <label className="label text-xs font-semibold text-gray-700">PAN / VAT Registration Number</label>
                <input
                  type="text"
                  placeholder="e.g. 600000000"
                  value={formValues['storePanVat'] || ''}
                  onChange={(e) => handleChange('storePanVat', e.target.value)}
                  className="input text-sm font-mono"
                />
              </div>

              <div>
                <label className="label text-xs font-semibold text-gray-700">Store Website URL</label>
                <input
                  type="url"
                  placeholder="https://gmcollection.com.np"
                  value={formValues['storeWebsite'] || 'https://gmcollection.com.np'}
                  onChange={(e) => handleChange('storeWebsite', e.target.value)}
                  className="input text-sm"
                />
              </div>
            </div>
          </div>

          <div className="card overflow-hidden border border-gray-200 shadow-sm">
            <div className="p-5 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
              <MapPin size={18} className="text-primary-600" />
              <h3 className="font-bold text-gray-900 text-sm">Physical Boutique Location &amp; Address</h3>
            </div>

            <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="label text-xs font-semibold text-gray-700">Street Address</label>
                <input
                  type="text"
                  placeholder="Shop No. 12, Shopping Complex, Tinkune / New Road"
                  value={formValues['storeAddress'] || ''}
                  onChange={(e) => handleChange('storeAddress', e.target.value)}
                  className="input text-sm"
                />
              </div>

              <div>
                <label className="label text-xs font-semibold text-gray-700">City / Municipality</label>
                <input
                  type="text"
                  placeholder="Kathmandu"
                  value={formValues['storeCity'] || 'Kathmandu'}
                  onChange={(e) => handleChange('storeCity', e.target.value)}
                  className="input text-sm"
                />
              </div>

              <div>
                <label className="label text-xs font-semibold text-gray-700">Province</label>
                <select
                  value={formValues['storeProvince'] || 'Bagmati'}
                  onChange={(e) => handleChange('storeProvince', e.target.value)}
                  className="input text-sm"
                >
                  <option value="Bagmati">Bagmati Province</option>
                  <option value="Koshi">Koshi Province</option>
                  <option value="Madhesh">Madhesh Province</option>
                  <option value="Gandaki">Gandaki Province</option>
                  <option value="Lumbini">Lumbini Province</option>
                  <option value="Karnali">Karnali Province</option>
                  <option value="Sudurpashchim">Sudurpashchim Province</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="label text-xs font-semibold text-gray-700">Google Maps Direction Link</label>
                <input
                  type="url"
                  placeholder="https://maps.google.com/..."
                  value={formValues['storeGoogleMaps'] || ''}
                  onChange={(e) => handleChange('storeGoogleMaps', e.target.value)}
                  className="input text-sm font-mono"
                />
              </div>
            </div>
          </div>

          <div className="card overflow-hidden border border-gray-200 shadow-sm">
            <div className="p-5 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
              <Clock size={18} className="text-primary-600" />
              <h3 className="font-bold text-gray-900 text-sm">Business Working Hours</h3>
            </div>

            <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="label text-xs font-semibold text-gray-700">Sunday – Friday (Weekdays)</label>
                <input
                  type="text"
                  placeholder="10:00 AM – 8:00 PM"
                  value={formValues['storeHoursWeekday'] || '10:00 AM – 8:00 PM'}
                  onChange={(e) => handleChange('storeHoursWeekday', e.target.value)}
                  className="input text-sm"
                />
              </div>

              <div>
                <label className="label text-xs font-semibold text-gray-700">Saturday (Weekends)</label>
                <input
                  type="text"
                  placeholder="11:00 AM – 7:00 PM"
                  value={formValues['storeHoursWeekend'] || '11:00 AM – 7:00 PM'}
                  onChange={(e) => handleChange('storeHoursWeekend', e.target.value)}
                  className="input text-sm"
                />
              </div>

              <div>
                <label className="label text-xs font-semibold text-gray-700">Festival Holidays</label>
                <input
                  type="text"
                  placeholder="Open on Dashain &amp; Tihar"
                  value={formValues['storeHolidayClosed'] || 'Open all year'}
                  onChange={(e) => handleChange('storeHolidayClosed', e.target.value)}
                  className="input text-sm"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────────────── */}
      {/* TAB 4: SOCIAL MEDIA & CHANNELS */}
      {/* ───────────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'social' && (
        <div className="space-y-6">
          <div className="card overflow-hidden border border-gray-200 shadow-sm">
            <div className="p-5 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
              <Globe size={18} className="text-primary-600" />
              <h3 className="font-bold text-gray-900 text-sm">Official Social Media Profiles &amp; Links</h3>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="label text-xs font-semibold text-gray-700">Instagram Profile URL</label>
                <input
                  type="url"
                  placeholder="https://instagram.com/gm_collection_house"
                  value={formValues['socialInstagram'] || ''}
                  onChange={(e) => handleChange('socialInstagram', e.target.value)}
                  className="input text-sm"
                />
              </div>

              <div>
                <label className="label text-xs font-semibold text-gray-700">Facebook Page URL</label>
                <input
                  type="url"
                  placeholder="https://facebook.com/gmcollectionhouse"
                  value={formValues['socialFacebook'] || ''}
                  onChange={(e) => handleChange('socialFacebook', e.target.value)}
                  className="input text-sm"
                />
              </div>

              <div>
                <label className="label text-xs font-semibold text-gray-700">TikTok Profile URL</label>
                <input
                  type="url"
                  placeholder="https://tiktok.com/@gm_collection_house"
                  value={formValues['socialTikTok'] || ''}
                  onChange={(e) => handleChange('socialTikTok', e.target.value)}
                  className="input text-sm"
                />
              </div>

              <div>
                <label className="label text-xs font-semibold text-gray-700">YouTube Channel URL</label>
                <input
                  type="url"
                  placeholder="https://youtube.com/@gmcollectionhouse"
                  value={formValues['socialYoutube'] || ''}
                  onChange={(e) => handleChange('socialYoutube', e.target.value)}
                  className="input text-sm"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────────────── */}
      {/* TAB 5: POS & RECEIPT SETTINGS */}
      {/* ───────────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'receipts' && (
        <div className="space-y-6">
          <div className="card overflow-hidden border border-gray-200 shadow-sm">
            <div className="p-5 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
              <Receipt size={18} className="text-primary-600" />
              <h3 className="font-bold text-gray-900 text-sm">In-Store Thermal Bill &amp; Receipt Configuration</h3>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="label text-xs font-semibold text-gray-700">Bill Header Title</label>
                <input
                  type="text"
                  placeholder="GM COLLECTION HOUSE"
                  value={formValues['receiptHeader'] || 'GM COLLECTION HOUSE'}
                  onChange={(e) => handleChange('receiptHeader', e.target.value)}
                  className="input text-sm font-bold"
                />
              </div>

              <div>
                <label className="label text-xs font-semibold text-gray-700">Bill Header Subtitle</label>
                <input
                  type="text"
                  placeholder="Women's Fashion Boutique · Kathmandu, Nepal"
                  value={formValues['receiptSubtitle'] || "Women's Fashion Store Nepal"}
                  onChange={(e) => handleChange('receiptSubtitle', e.target.value)}
                  className="input text-sm"
                />
              </div>

              <div>
                <label className="label text-xs font-semibold text-gray-700">Bill Footer Policy &amp; Thank You Message</label>
                <textarea
                  rows={3}
                  placeholder="Thank you for shopping with us! Exchange within 7 days with tags attached. No cash refund."
                  value={formValues['receiptFooter'] || 'Thank you! Visit us again :) gmcollection.com.np'}
                  onChange={(e) => handleChange('receiptFooter', e.target.value)}
                  className="input text-sm font-mono"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sticky Save Bar */}
      <div className="fixed bottom-4 right-4 sm:right-8 z-40 flex items-center gap-3">
        <button
          type="button"
          onClick={handleSaveAll}
          disabled={saveMutation.isPending}
          className="btn-primary shadow-xl px-6 py-3 text-sm flex items-center gap-2 rounded-2xl cursor-pointer"
        >
          {saveMutation.isPending ? (
            <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Save size={18} />
          )}
          <span>Save Changes</span>
        </button>
      </div>
    </div>
  );
}
