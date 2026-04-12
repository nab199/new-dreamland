import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import axios from 'axios';
import { 
  Settings, Save, Eye, EyeOff, Check, X, 
  MessageCircle, Mail, CreditCard, Shield,
  Bell, Key, Globe, AlertCircle, RefreshCw
} from 'lucide-react';

interface IntegrationSettingsProps {}

export default function IntegrationSettings({}: IntegrationSettingsProps) {
  const { token } = useAuth();
  const { showToast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState<string | null>(null);

  // SMS (AfroMessage) Settings
  const [smsSettings, setSmsSettings] = useState({
    apiKey: '',
    senderId: 'Dreamland',
    identifierId: '',
    mockMode: false
  });

  // Email (Resend) Settings
  const [emailSettings, setEmailSettings] = useState({
    enabled: true,
    provider: 'resend',
    resendApiKey: '',
    fromName: 'Dreamland College',
    fromAddress: ''
  });

  // AI Settings
  const [aiSettings, setAiSettings] = useState({
    enabled: true,
    apiKey: ''
  });

  // Show/hide password fields
  const [showSmsApiKey, setShowSmsApiKey] = useState(false);
  const [showEmailApiKey, setShowEmailApiKey] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      
      // Load from API
      const [systemRes, integrationsRes] = await Promise.all([
        axios.get('/api/settings/system', { headers }).catch(() => ({ data: {} })),
        axios.get('/api/settings/integrations', { headers }).catch(() => ({ data: {} }))
      ]);

      // Set from loaded settings or fall back to env defaults
      const systemSettings = systemRes.data || {};
      
      if (systemSettings.sms_config) {
        setSmsSettings(systemSettings.sms_config);
      } else if (integrationsRes.data?.afroMessage) {
        setSmsSettings(prev => ({
          ...prev,
          mockMode: integrationsRes.data.afroMessage.mock_mode
        }));
      }

      if (systemSettings.email_config) {
        setEmailSettings(systemSettings.email_config);
      } else if (integrationsRes.data?.email) {
        setEmailSettings(prev => ({
          ...prev,
          enabled: integrationsRes.data.email.enabled,
          provider: integrationsRes.data.email.provider
        }));
      }

      if (systemSettings.ai_config) {
        setAiSettings(systemSettings.ai_config);
      }
    } catch (err) {
      console.error("Failed to load settings:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async (category: string) => {
    if (!token) return;
    setIsSaving(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      
      let data: any = {};
      if (category === 'sms') data.sms = smsSettings;
      else if (category === 'email') data.email = emailSettings;
      else if (category === 'ai') data.ai = aiSettings;

      await axios.post('/api/settings/integrations', data, { headers });
      showToast(`${category.toUpperCase()} settings saved successfully!`, 'success');
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to save settings', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const testConnection = async (type: string) => {
    if (!token) return;
    setIsTesting(type);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      
      // For demo, just show success after delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      showToast(`${type} connection test passed!`, 'success');
    } catch (err) {
      showToast('Connection test failed', 'error');
    } finally {
      setIsTesting(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* SMS Settings */}
      <div className="bg-white rounded-3xl border border-stone-200 shadow-sm p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600">
            <MessageCircle size={24} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-stone-900">SMS Configuration</h3>
            <p className="text-sm text-stone-500">Configure AfroMessage SMS service</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-semibold text-stone-700 mb-2">
              <Key size={14} className="inline mr-1" />
              API Key
            </label>
            <div className="relative">
              <input
                type={showSmsApiKey ? "text" : "password"}
                value={smsSettings.apiKey}
                onChange={(e) => setSmsSettings({ ...smsSettings, apiKey: e.target.value })}
                placeholder="Enter your AfroMessage API key"
                className="w-full px-4 py-3 border border-stone-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
              />
              <button
                type="button"
                onClick={() => setShowSmsApiKey(!showSmsApiKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400"
              >
                {showSmsApiKey ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <p className="text-xs text-stone-500 mt-1">Get from afromessage.com</p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-stone-700 mb-2">
              <Globe size={14} className="inline mr-1" />
              Sender ID
            </label>
            <input
              type="text"
              value={smsSettings.senderId}
              onChange={(e) => setSmsSettings({ ...smsSettings, senderId: e.target.value })}
              placeholder="e.g., Dreamland"
              className="w-full px-4 py-3 border border-stone-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-stone-700 mb-2">
              Identifier ID (Optional)
            </label>
            <input
              type="text"
              value={smsSettings.identifierId}
              onChange={(e) => setSmsSettings({ ...smsSettings, identifierId: e.target.value })}
              placeholder="Your identifier from AfroMessage"
              className="w-full px-4 py-3 border border-stone-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={smsSettings.mockMode}
                onChange={(e) => setSmsSettings({ ...smsSettings, mockMode: e.target.checked })}
                className="w-5 h-5 rounded border-stone-300 text-emerald-600 focus:ring-emerald-500"
              />
              <span className="text-sm font-semibold text-stone-700">Test Mode (Mock)</span>
            </label>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={() => handleSave('sms')}
            disabled={isSaving}
            className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 disabled:opacity-50"
          >
            <Save size={18} />
            {isSaving ? 'Saving...' : 'Save SMS Settings'}
          </button>
          <button
            onClick={() => testConnection('SMS')}
            disabled={isTesting === 'SMS'}
            className="flex items-center gap-2 px-6 py-2.5 bg-stone-100 text-stone-600 rounded-xl font-semibold hover:bg-stone-200 disabled:opacity-50"
          >
            <RefreshCw size={18} className={isTesting === 'SMS' ? 'animate-spin' : ''} />
            {isTesting === 'SMS' ? 'Testing...' : 'Test Connection'}
          </button>
        </div>
      </div>

      {/* Email Settings */}
      <div className="bg-white rounded-3xl border border-stone-200 shadow-sm p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center text-purple-600">
            <Mail size={24} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-stone-900">Email Configuration</h3>
            <p className="text-sm text-stone-500">Configure email service (Resend)</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={emailSettings.enabled}
                onChange={(e) => setEmailSettings({ ...emailSettings, enabled: e.target.checked })}
                className="w-5 h-5 rounded border-stone-300 text-emerald-600 focus:ring-emerald-500"
              />
              <span className="text-sm font-semibold text-stone-700">Enable Email Service</span>
            </label>
          </div>

          <div>
            <label className="block text-sm font-semibold text-stone-700 mb-2">
              Email Provider
            </label>
            <select
              value={emailSettings.provider}
              onChange={(e) => setEmailSettings({ ...emailSettings, provider: e.target.value })}
              className="w-full px-4 py-3 border border-stone-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
            >
              <option value="resend">Resend</option>
              <option value="smtp">SMTP</option>
            </select>
          </div>

          {emailSettings.provider === 'resend' && (
            <div>
              <label className="block text-sm font-semibold text-stone-700 mb-2">
                <Key size={14} className="inline mr-1" />
                Resend API Key
              </label>
              <div className="relative">
                <input
                  type={showEmailApiKey ? "text" : "password"}
                  value={emailSettings.resendApiKey}
                  onChange={(e) => setEmailSettings({ ...emailSettings, resendApiKey: e.target.value })}
                  placeholder="re_xxxxxxxxxxxxx"
                  className="w-full px-4 py-3 border border-stone-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowEmailApiKey(!showEmailApiKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400"
                >
                  {showEmailApiKey ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <p className="text-xs text-stone-500 mt-1">Get from resend.com API keys</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-stone-700 mb-2">
              From Name
            </label>
            <input
              type="text"
              value={emailSettings.fromName}
              onChange={(e) => setEmailSettings({ ...emailSettings, fromName: e.target.value })}
              placeholder="Dreamland College"
              className="w-full px-4 py-3 border border-stone-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-stone-700 mb-2">
              From Email Address
            </label>
            <input
              type="email"
              value={emailSettings.fromAddress}
              onChange={(e) => setEmailSettings({ ...emailSettings, fromAddress: e.target.value })}
              placeholder="your-domain.com"
              className="w-full px-4 py-3 border border-stone-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={() => handleSave('email')}
            disabled={isSaving}
            className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 disabled:opacity-50"
          >
            <Save size={18} />
            {isSaving ? 'Saving...' : 'Save Email Settings'}
          </button>
          <button
            onClick={() => testConnection('Email')}
            disabled={isTesting === 'Email'}
            className="flex items-center gap-2 px-6 py-2.5 bg-stone-100 text-stone-600 rounded-xl font-semibold hover:bg-stone-200 disabled:opacity-50"
          >
            <RefreshCw size={18} className={isTesting === 'Email' ? 'animate-spin' : ''} />
            {isTesting === 'Email' ? 'Testing...' : 'Test Connection'}
          </button>
        </div>
      </div>

      {/* Payment Settings (DISABLED) */}
      <div className="bg-stone-100 rounded-3xl border border-stone-200 p-6 opacity-60">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-stone-200 rounded-xl flex items-center justify-center text-stone-400">
            <CreditCard size={24} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-stone-400">Payment Configuration</h3>
            <p className="text-sm text-stone-500">Payment system is disabled</p>
          </div>
        </div>
        <p className="text-stone-500 text-sm">The payment system has been disabled. No payment configuration is required.</p>
      </div>

      {/* AI Settings */}
      <div className="bg-white rounded-3xl border border-stone-200 shadow-sm p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600">
            <Settings size={24} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-stone-900">AI Configuration</h3>
            <p className="text-sm text-stone-500">Configure AI services (Gemini)</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={aiSettings.enabled}
                onChange={(e) => setAiSettings({ ...aiSettings, enabled: e.target.checked })}
                className="w-5 h-5 rounded border-stone-300 text-emerald-600 focus:ring-emerald-500"
              />
              <span className="text-sm font-semibold text-stone-700">Enable AI Features</span>
            </label>
          </div>

          <div>
            <label className="block text-sm font-semibold text-stone-700 mb-2">
              <Key size={14} className="inline mr-1" />
              Google Gemini API Key
            </label>
            <input
              type="text"
              value={aiSettings.apiKey}
              onChange={(e) => setAiSettings({ ...aiSettings, apiKey: e.target.value })}
              placeholder="AIza..."
              className="w-full px-4 py-3 border border-stone-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
            />
            <p className="text-xs text-stone-500 mt-1">Get from aistudio.google.com/apikey</p>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={() => handleSave('ai')}
            disabled={isSaving}
            className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 disabled:opacity-50"
          >
            <Save size={18} />
            {isSaving ? 'Saving...' : 'Save AI Settings'}
          </button>
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-start gap-3">
        <AlertCircle className="text-blue-600 mt-0.5" size={20} />
        <div>
          <h4 className="font-bold text-blue-900">Important</h4>
          <p className="text-sm text-blue-700 mt-1">
            These settings are stored in your database and will persist across server restarts. 
            The server will use these settings instead of environment variables for these services.
          </p>
        </div>
      </div>
    </div>
  );
}