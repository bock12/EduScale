import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Globe, 
  DollarSign, 
  CreditCard, 
  Shield, 
  Bell, 
  HelpCircle, 
  Zap, 
  Mail, 
  Database,
  Languages,
  Smartphone,
  Share2,
  Lock,
  Eye,
  CheckCircle,
  AlertCircle,
  Plus,
  Trash2,
  Save,
  RefreshCw,
  ChevronRight,
  Package,
  Users as UsersIcon,
  Layers,
  LifeBuoy
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { doc, onSnapshot, setDoc, updateDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { PlatformSettings, Currency, ExchangeRate, SubscriptionPackage } from '../types';

const Section = ({ icon: Icon, title, description, children, active, onClick }: any) => (
  <div 
    className={`bg-white rounded-[24px] md:rounded-[32px] border transition-all duration-300 overflow-hidden ${
      active ? 'border-blue-600 shadow-lg' : 'border-[#e5e5e5] hover:border-blue-200 shadow-sm'
    }`}
  >
    <button 
      onClick={onClick}
      className="w-full p-4 md:p-8 flex items-start gap-4 md:gap-6 text-left outline-none"
    >
      <div className={`p-3 md:p-4 rounded-xl md:rounded-2xl shrink-0 transition-colors ${active ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-600'}`}>
        <Icon className="w-5 h-5 md:w-6 md:h-6" />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="text-lg md:text-xl font-bold text-[#1a1a1a] mb-1 truncate">{title}</h3>
        <p className="text-[#9e9e9e] text-xs md:text-base line-clamp-2 md:line-clamp-none">{description}</p>
      </div>
      <div className={`w-5 h-5 md:w-6 md:h-6 rounded-full border-2 flex items-center justify-center transition-all shrink-0 ${
        active ? 'border-blue-600 bg-blue-600 text-white' : 'border-[#e5e5e5]'
      }`}>
        <div className={`w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-current ${active ? 'scale-100' : 'scale-0'}`} />
      </div>
    </button>
    
    <AnimatePresence>
      {active && (
        <motion.div 
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="border-t border-[#f5f5f5]"
        >
          <div className="p-4 md:p-8 bg-[#fcfcfc]">
            {children}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  </div>
);

export default function SuperAdminSettings() {
  const [activeSection, setActiveSection] = useState<string | null>('general');
  const [settings, setSettings] = useState<PlatformSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newFeatureNames, setNewFeatureNames] = useState<Record<string, string>>({});
  const [editingIntegrationIndex, setEditingIntegrationIndex] = useState<number | null>(null);
  const [integrationConfig, setIntegrationConfig] = useState<string>('');
  const [isAddingIntegration, setIsAddingIntegration] = useState(false);
  const [newIntegrationName, setNewIntegrationName] = useState('');
  const [isAddingCurrency, setIsAddingCurrency] = useState(false);
  const [newCurrency, setNewCurrency] = useState({ code: '', name: '', symbol: '' });

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'settings', 'platform'), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as PlatformSettings;
        // Normalize features if they are strings (legacy data)
        const normalizedPackages = (data.subscriptionPackages || []).map(pkg => ({
          ...pkg,
          features: (pkg.features || []).map(f => typeof f === 'string' ? { name: f, isActive: true } : f)
        }));
        setSettings({ ...data, subscriptionPackages: normalizedPackages });
      } else {
        // Initialize default settings if not exists
        const defaultSettings: PlatformSettings = {
          defaultLanguage: 'English (US)',
          defaultCurrency: 'USD',
          currencies: [
            { code: 'USD', name: 'US Dollar', symbol: '$', isDefault: true },
            { code: 'EUR', name: 'Euro', symbol: '€', isDefault: false },
            { code: 'SLE', name: 'Sierra Leone Leone', symbol: 'Le', isDefault: false },
            { code: 'NGN', name: 'Nigerian Naira', symbol: '₦', isDefault: false }
          ],
          exchangeRates: [
            { from: 'USD', to: 'SLE', rate: 22.5, lastUpdated: new Date().toISOString() },
            { from: 'USD', to: 'EUR', rate: 0.92, lastUpdated: new Date().toISOString() },
            { from: 'USD', to: 'NGN', rate: 1500, lastUpdated: new Date().toISOString() }
          ],
          subscriptionPackages: [
            {
              id: 'basic',
              name: 'Basic',
              description: 'Essential features for small schools.',
              price: 29,
              currency: 'USD',
              billingModel: 'per_student',
              features: [
                { name: 'Student Management', isActive: true },
                { name: 'Attendance', isActive: true },
                { name: 'Basic Reporting', isActive: true }
              ],
              isActive: true
            },
            {
              id: 'pro',
              name: 'Pro',
              description: 'Advanced features for growing institutions.',
              price: 99,
              currency: 'USD',
              billingModel: 'student_range',
              studentRange: { min: 1, max: 500 },
              features: [
                { name: 'Student Management', isActive: true },
                { name: 'Attendance', isActive: true },
                { name: 'Exam Management', isActive: true },
                { name: 'AI Grading', isActive: true },
                { name: 'Parent Portal', isActive: true }
              ],
              isActive: true
            }
          ],
          security: {
            twoFactorAuthRequired: false,
            passwordComplexity: {
              minLength: 8,
              requireSymbols: true,
              requireNumbers: true
            }
          },
          integrations: [
            { name: 'Google Workspace', status: 'connected' },
            { name: 'Zoom Video', status: 'disconnected' },
            { name: 'Twilio SMS', status: 'connected' },
            { name: 'AWS S3 Storage', status: 'connected' }
          ]
        };
        setDoc(doc(db, 'settings', 'platform'), defaultSettings);
        setSettings(defaultSettings);
      }
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'settings/platform');
    });

    return () => unsubscribe();
  }, []);

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      await setDoc(doc(db, 'settings', 'platform'), settings);
      alert('Settings saved successfully!');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'settings/platform');
    } finally {
      setSaving(false);
    }
  };

  const fetchRealTimeRates = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      const response = await fetch(`https://open.er-api.com/v6/latest/${settings.defaultCurrency}`);
      const data = await response.json();
      if (data.result === 'success') {
        const newRates: ExchangeRate[] = Object.entries(data.rates).map(([code, rate]) => ({
          from: settings.defaultCurrency,
          to: code,
          rate: rate as number,
          lastUpdated: new Date().toISOString()
        })).filter(r => settings.currencies.some(c => c.code === r.to));
        
        setSettings({ ...settings, exchangeRates: newRates });
        alert('Exchange rates updated in real-time!');
      }
    } catch (error) {
      console.error('Error fetching exchange rates:', error);
      alert('Failed to fetch real-time exchange rates.');
    } finally {
      setSaving(false);
    }
  };

  const updateDefaultCurrency = (code: string) => {
    if (!settings) return;
    const newPackages = settings.subscriptionPackages.map(pkg => ({
      ...pkg,
      currency: code
    }));
    setSettings({ ...settings, defaultCurrency: code, subscriptionPackages: newPackages });
  };

  const updateCurrency = (index: number, field: keyof Currency, value: any) => {
    if (!settings) return;
    const newCurrencies = [...settings.currencies];
    newCurrencies[index] = { ...newCurrencies[index], [field]: value };
    setSettings({ ...settings, currencies: newCurrencies });
  };

  const addCurrency = () => {
    if (!settings || !newCurrency.code || !newCurrency.name || !newCurrency.symbol) return;
    const code = newCurrency.code.toUpperCase();
    if (settings.currencies.find(c => c.code === code)) {
      alert('Currency already exists');
      return;
    }
    const currency: Currency = {
      code,
      name: newCurrency.name,
      symbol: newCurrency.symbol,
      isDefault: false
    };
    setSettings({ ...settings, currencies: [...settings.currencies, currency] });
    setIsAddingCurrency(false);
    setNewCurrency({ code: '', name: '', symbol: '' });
  };

  const removeCurrency = (index: number) => {
    if (!settings) return;
    const newCurrencies = settings.currencies.filter((_, i) => i !== index);
    setSettings({ ...settings, currencies: newCurrencies });
  };

  const updateExchangeRate = (index: number, field: keyof ExchangeRate, value: any) => {
    if (!settings) return;
    const newRates = [...settings.exchangeRates];
    newRates[index] = { ...newRates[index], [field]: value, lastUpdated: new Date().toISOString() };
    setSettings({ ...settings, exchangeRates: newRates });
  };

  const addExchangeRate = () => {
    if (!settings) return;
    const newRate: ExchangeRate = { from: settings.defaultCurrency, to: '', rate: 1, lastUpdated: new Date().toISOString() };
    setSettings({ ...settings, exchangeRates: [...settings.exchangeRates, newRate] });
  };

  const updatePackage = (index: number, field: keyof SubscriptionPackage, value: any) => {
    if (!settings) return;
    const newPackages = [...settings.subscriptionPackages];
    newPackages[index] = { ...newPackages[index], [field]: value };
    setSettings({ ...settings, subscriptionPackages: newPackages });
  };

  const addPackage = () => {
    if (!settings) return;
    const newPackage: SubscriptionPackage = {
      id: Math.random().toString(36).substr(2, 9),
      name: 'New Package',
      description: '',
      price: 0,
      currency: settings.defaultCurrency,
      billingModel: 'per_student',
      features: [],
      isActive: true
    };
    setSettings({ ...settings, subscriptionPackages: [...settings.subscriptionPackages, newPackage] });
  };

  const addIntegration = () => {
    if (!settings || !newIntegrationName) return;
    setSettings({
      ...settings,
      integrations: [...settings.integrations, { name: newIntegrationName, status: 'disconnected' as const, config: {} }]
    });
    setIsAddingIntegration(false);
    setNewIntegrationName('');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 md:space-y-8 pb-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-2">Platform Settings</h2>
          <p className="text-[#9e9e9e] text-sm md:text-base">Configure global platform parameters and integrations.</p>
        </div>
        <button 
          onClick={handleSave}
          disabled={saving}
          className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-blue-700 transition-all flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
        >
          {saving ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
          Save Changes
        </button>
      </header>

      <div className="grid grid-cols-1 gap-6">
        {/* General Configuration */}
        <Section 
          icon={Globe} 
          title="General Configuration" 
          description="Language, currency, and regional settings for the entire platform."
          active={activeSection === 'general'}
          onClick={() => setActiveSection(activeSection === 'general' ? null : 'general')}
        >
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-[#9e9e9e] uppercase tracking-widest">Default Language</label>
                <div className="relative">
                  <Languages className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#9e9e9e]" />
                  <select 
                    value={settings?.defaultLanguage}
                    onChange={(e) => setSettings(s => s ? { ...s, defaultLanguage: e.target.value } : null)}
                    className="w-full pl-12 pr-4 py-3 bg-white border border-[#e5e5e5] rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium appearance-none"
                  >
                    <option>English (US)</option>
                    <option>French</option>
                    <option>Spanish</option>
                    <option>Arabic</option>
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-[#9e9e9e] uppercase tracking-widest">Default Currency</label>
                <div className="relative">
                  <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#9e9e9e]" />
                  <select 
                    value={settings?.defaultCurrency}
                    onChange={(e) => updateDefaultCurrency(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-white border border-[#e5e5e5] rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium appearance-none"
                  >
                    {settings?.currencies.map(c => (
                      <option key={c.code} value={c.code}>{c.name} ({c.symbol})</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-[#1a1a1a]">Supported Currencies</h4>
                <button 
                  onClick={() => setIsAddingCurrency(true)}
                  className="text-xs font-bold text-blue-600 flex items-center gap-1 hover:underline"
                >
                  <Plus className="w-4 h-4" /> Add Currency
                </button>
              </div>

              {isAddingCurrency && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="p-4 rounded-2xl bg-blue-50 border border-blue-100 space-y-4"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">Code</label>
                      <input 
                        type="text"
                        placeholder="USD"
                        value={newCurrency.code}
                        onChange={(e) => setNewCurrency({ ...newCurrency, code: e.target.value })}
                        className="w-full p-2 rounded-lg border border-blue-200 bg-white text-sm outline-none focus:ring-2 focus:ring-blue-500 uppercase"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">Name</label>
                      <input 
                        type="text"
                        placeholder="US Dollar"
                        value={newCurrency.name}
                        onChange={(e) => setNewCurrency({ ...newCurrency, name: e.target.value })}
                        className="w-full p-2 rounded-lg border border-blue-200 bg-white text-sm outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">Symbol</label>
                      <input 
                        type="text"
                        placeholder="$"
                        value={newCurrency.symbol}
                        onChange={(e) => setNewCurrency({ ...newCurrency, symbol: e.target.value })}
                        className="w-full p-2 rounded-lg border border-blue-200 bg-white text-sm outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <button 
                      onClick={() => setIsAddingCurrency(false)}
                      className="px-4 py-2 text-xs font-bold text-blue-600 hover:bg-blue-100 rounded-xl transition-all"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={addCurrency}
                      className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-all"
                    >
                      Add Currency
                    </button>
                  </div>
                </motion.div>
              )}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {settings?.currencies.map((currency, index) => (
                  <div key={index} className="p-4 rounded-2xl border border-[#e5e5e5] bg-white flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="flex items-center gap-2 flex-1">
                      <input 
                        type="text" 
                        placeholder="Code"
                        value={currency.code}
                        onChange={(e) => updateCurrency(index, 'code', e.target.value)}
                        className="w-16 px-2 py-1 border rounded-lg text-sm font-bold uppercase"
                      />
                      <input 
                        type="text" 
                        placeholder="Name"
                        value={currency.name}
                        onChange={(e) => updateCurrency(index, 'name', e.target.value)}
                        className="flex-1 px-2 py-1 border rounded-lg text-sm"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <input 
                        type="text" 
                        placeholder="Sym"
                        value={currency.symbol}
                        onChange={(e) => updateCurrency(index, 'symbol', e.target.value)}
                        className="w-12 px-2 py-1 border rounded-lg text-sm text-center"
                      />
                      <button 
                        onClick={() => removeCurrency(index)}
                        className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-[#1a1a1a]">Exchange Rates</h4>
                <div className="flex items-center gap-4">
                  <button 
                    onClick={fetchRealTimeRates}
                    className="text-xs font-bold text-green-600 flex items-center gap-1 hover:underline"
                  >
                    <RefreshCw className="w-4 h-4" /> Fetch Real-time
                  </button>
                  <button 
                    onClick={addExchangeRate}
                    className="text-xs font-bold text-blue-600 flex items-center gap-1 hover:underline"
                  >
                    <Plus className="w-4 h-4" /> Add Rate
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {settings?.exchangeRates.map((rate, index) => (
                  <div key={index} className="p-4 rounded-2xl border border-[#e5e5e5] bg-white flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="flex items-center gap-2 flex-1">
                      <span className="text-sm font-bold text-[#4a4a4a] whitespace-nowrap">1 {rate.from} =</span>
                      <input 
                        type="number" 
                        value={isNaN(rate.rate) ? '' : rate.rate}
                        onChange={(e) => updateExchangeRate(index, 'rate', parseFloat(e.target.value) || 0)}
                        className="w-24 px-2 py-1 border rounded-lg text-sm font-bold text-blue-600"
                      />
                    </div>
                    <div className="flex items-center gap-2 flex-1">
                      <select 
                        value={rate.to}
                        onChange={(e) => updateExchangeRate(index, 'to', e.target.value)}
                        className="flex-1 px-2 py-1 border rounded-lg text-sm outline-none bg-white"
                      >
                        {settings?.currencies.map(c => (
                          <option key={c.code} value={c.code}>{c.code}</option>
                        ))}
                      </select>
                      <button 
                        onClick={() => {
                          const newRates = settings.exchangeRates.filter((_, i) => i !== index);
                          setSettings({ ...settings, exchangeRates: newRates });
                        }}
                        className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Section>

        {/* Subscription & Billing */}
        <Section 
          icon={CreditCard} 
          title="Subscription & Billing" 
          description="Manage pricing plans, billing models, and features per package."
          active={activeSection === 'billing'}
          onClick={() => setActiveSection(activeSection === 'billing' ? null : 'billing')}
        >
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-[#1a1a1a]">Subscription Packages</h4>
              <button 
                onClick={addPackage}
                className="text-xs font-bold text-blue-600 flex items-center gap-1 hover:underline"
              >
                <Plus className="w-4 h-4" /> Add Package
              </button>
            </div>
            
            <div className="grid grid-cols-1 gap-6">
              {settings?.subscriptionPackages.map((pkg, index) => (
                <div key={pkg.id} className="p-6 rounded-[24px] border border-[#e5e5e5] bg-white space-y-6">
                  <div className="flex flex-col sm:flex-row items-start justify-between gap-6">
                    <div className="space-y-4 flex-1 w-full">
                      <div className="flex flex-wrap items-center gap-4">
                        <input 
                          type="text" 
                          value={pkg.name}
                          onChange={(e) => updatePackage(index, 'name', e.target.value)}
                          className="text-xl font-bold text-[#1a1a1a] bg-transparent border-b border-transparent hover:border-blue-200 focus:border-blue-600 outline-none min-w-[150px]"
                        />
                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${pkg.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {pkg.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <textarea 
                        value={pkg.description}
                        onChange={(e) => updatePackage(index, 'description', e.target.value)}
                        placeholder="Package description..."
                        className="w-full text-sm text-[#9e9e9e] bg-transparent border-none focus:ring-0 resize-none h-12"
                      />
                    </div>
                    <div className="flex flex-col items-start sm:items-end gap-2 w-full sm:w-auto">
                      <div className="flex items-center justify-end gap-2">
                        <select 
                          value={pkg.currency || settings.defaultCurrency}
                          onChange={(e) => updatePackage(index, 'currency', e.target.value)}
                          className="text-xs font-bold text-[#9e9e9e] bg-transparent border-none focus:ring-0 outline-none appearance-none cursor-pointer hover:text-blue-600"
                        >
                          {settings.currencies.map(c => (
                            <option key={c.code} value={c.code}>{c.symbol}</option>
                          ))}
                        </select>
                        <input 
                          type="number" 
                          value={pkg.price === undefined || isNaN(pkg.price) ? '' : pkg.price}
                          onChange={(e) => updatePackage(index, 'price', parseFloat(e.target.value))}
                          className="text-3xl font-black text-[#1a1a1a] w-24 text-right bg-transparent border-b border-transparent hover:border-blue-200 focus:border-blue-600 outline-none"
                        />
                      </div>
                      <select 
                        value={pkg.billingModel}
                        onChange={(e) => updatePackage(index, 'billingModel', e.target.value)}
                        className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-lg outline-none w-full sm:w-auto"
                      >
                        <option value="per_student">Per Student / Mo</option>
                        <option value="student_range">Student Range / Mo</option>
                      </select>
                    </div>
                  </div>

                  {pkg.billingModel === 'student_range' && (
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 bg-[#fcfcfc] rounded-2xl border border-dashed border-[#e5e5e5]">
                      <div className="flex items-center gap-2">
                        <UsersIcon className="w-5 h-5 text-[#9e9e9e]" />
                        <span className="text-sm font-medium text-[#4a4a4a]">Range:</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input 
                          type="number" 
                          value={pkg.studentRange?.min === undefined || isNaN(pkg.studentRange.min) ? '' : pkg.studentRange.min}
                          onChange={(e) => updatePackage(index, 'studentRange', { ...pkg.studentRange, min: parseInt(e.target.value) })}
                          className="w-full sm:w-24 px-2 py-1 border rounded-lg text-sm"
                          placeholder="Min"
                        />
                        <span className="text-[#9e9e9e]">to</span>
                        <input 
                          type="number" 
                          value={pkg.studentRange?.max === undefined || isNaN(pkg.studentRange.max) ? '' : pkg.studentRange.max}
                          onChange={(e) => updatePackage(index, 'studentRange', { ...pkg.studentRange, max: parseInt(e.target.value) })}
                          className="w-full sm:w-24 px-2 py-1 border rounded-lg text-sm"
                          placeholder="Max"
                        />
                        <span className="text-sm text-[#9e9e9e] whitespace-nowrap">Students</span>
                      </div>
                    </div>
                  )}

                  <div className="space-y-3">
                    <p className="text-xs font-bold text-[#9e9e9e] uppercase tracking-widest">Included Features</p>
                    <div className="flex flex-wrap gap-2">
                      {pkg.features && pkg.features.map((feature, fIndex) => (
                        <div 
                          key={fIndex} 
                          className={`flex items-center gap-2 px-3 py-1 rounded-full group transition-colors ${
                            (typeof feature === 'string' ? true : feature.isActive) ? 'bg-blue-50 text-blue-700 border border-blue-100' : 'bg-[#f5f5f5] text-[#9e9e9e] border border-transparent'
                          }`}
                        >
                          <button 
                            onClick={() => {
                              const newFeatures = pkg.features.map((f, i) => {
                                if (i === fIndex) {
                                  const featureObj = typeof f === 'string' ? { name: f, isActive: true } : f;
                                  return { ...featureObj, isActive: !featureObj.isActive };
                                }
                                return typeof f === 'string' ? { name: f, isActive: true } : f;
                              });
                              updatePackage(index, 'features', newFeatures);
                            }}
                            className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${
                              (typeof feature === 'string' ? true : feature.isActive) ? 'bg-blue-600 border-blue-600 text-white' : 'border-[#e5e5e5]'
                            }`}
                          >
                            {(typeof feature === 'string' ? true : feature.isActive) && <CheckCircle className="w-3 h-3" />}
                          </button>
                          <span className="text-sm font-medium">{typeof feature === 'string' ? feature : feature.name}</span>
                          <button 
                            onClick={() => {
                              const newFeatures = pkg.features.filter((_, i) => i !== fIndex);
                              updatePackage(index, 'features', newFeatures);
                            }}
                            className="text-[#9e9e9e] hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                      <div className="flex items-center gap-2">
                        <input 
                          type="text"
                          placeholder="New feature..."
                          value={newFeatureNames[pkg.id] || ''}
                          onChange={(e) => setNewFeatureNames(prev => ({ ...prev, [pkg.id]: e.target.value }))}
                          className="px-3 py-1 border border-[#e5e5e5] rounded-full text-sm outline-none focus:ring-1 focus:ring-blue-500 w-32"
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              const name = newFeatureNames[pkg.id];
                              if (name) {
                                const currentFeatures = pkg.features || [];
                                const normalizedFeatures = currentFeatures.map(f => typeof f === 'string' ? { name: f, isActive: true } : f);
                                updatePackage(index, 'features', [...normalizedFeatures, { name, isActive: true }]);
                                setNewFeatureNames(prev => ({ ...prev, [pkg.id]: '' }));
                              }
                            }
                          }}
                        />
                        <button 
                          onClick={() => {
                            const name = newFeatureNames[pkg.id];
                            if (name) {
                              const currentFeatures = pkg.features || [];
                              const normalizedFeatures = currentFeatures.map(f => typeof f === 'string' ? { name: f, isActive: true } : f);
                              updatePackage(index, 'features', [...normalizedFeatures, { name, isActive: true }]);
                              setNewFeatureNames(prev => ({ ...prev, [pkg.id]: '' }));
                            }
                          }}
                          className="p-1 text-blue-600 hover:bg-blue-50 rounded-full transition-all"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-4 border-t border-[#f5f5f5]">
                    <button 
                      onClick={() => updatePackage(index, 'isActive', !pkg.isActive)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${
                        pkg.isActive ? 'text-red-600 hover:bg-red-50' : 'text-green-600 hover:bg-green-50'
                      }`}
                    >
                      {pkg.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                    <button 
                      onClick={() => {
                        const newPackages = settings.subscriptionPackages.filter((_, i) => i !== index);
                        setSettings({ ...settings, subscriptionPackages: newPackages });
                      }}
                      className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-xl text-xs font-bold uppercase tracking-widest transition-all"
                    >
                      Delete Package
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Section>

        {/* Integrations */}
        <Section 
          icon={Zap} 
          title="Integrations & API" 
          description="Connect with third-party services like Zoom, Google Workspace, and more."
          active={activeSection === 'integrations'}
          onClick={() => setActiveSection(activeSection === 'integrations' ? null : 'integrations')}
        >
          <div className="space-y-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h4 className="font-bold text-[#1a1a1a]">Integrations & API</h4>
                <p className="text-xs text-[#9e9e9e] mt-1">Connect third-party services and configure APIs</p>
              </div>
              <button 
                onClick={() => setIsAddingIntegration(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-100"
              >
                <Plus className="w-4 h-4" /> Add Integration
              </button>
            </div>

            {isAddingIntegration && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mb-6 p-4 rounded-2xl bg-blue-50 border border-blue-100 space-y-4"
              >
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">Integration Name</label>
                  <input 
                    type="text"
                    placeholder="e.g. Stripe, SendGrid, etc."
                    value={newIntegrationName}
                    onChange={(e) => setNewIntegrationName(e.target.value)}
                    className="w-full p-2 rounded-lg border border-blue-200 bg-white text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button 
                    onClick={() => setIsAddingIntegration(false)}
                    className="px-4 py-2 text-xs font-bold text-blue-600 hover:bg-blue-100 rounded-xl transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={addIntegration}
                    className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-all"
                  >
                    Add Integration
                  </button>
                </div>
              </motion.div>
            )}
            <div className="grid grid-cols-1 gap-4">
              {settings?.integrations.map((item, index) => (
                <div key={index} className="space-y-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-2xl bg-white border border-[#e5e5e5] gap-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-[#f5f5f5] shrink-0">
                        {item.name.toLowerCase().includes('google') && <Mail className="w-5 h-5 text-[#4a4a4a]" />}
                        {item.name.toLowerCase().includes('zoom') && <Smartphone className="w-5 h-5 text-[#4a4a4a]" />}
                        {item.name.toLowerCase().includes('twilio') && <Bell className="w-5 h-5 text-[#4a4a4a]" />}
                        {item.name.toLowerCase().includes('aws') && <Database className="w-5 h-5 text-[#4a4a4a]" />}
                        {!['google', 'zoom', 'twilio', 'aws'].some(k => item.name.toLowerCase().includes(k)) && <Layers className="w-5 h-5 text-[#4a4a4a]" />}
                      </div>
                      <div>
                        <p className="font-bold text-sm text-[#1a1a1a]">{item.name}</p>
                        <p className={`text-[10px] font-bold uppercase tracking-widest ${item.status === 'connected' ? 'text-green-600' : 'text-[#9e9e9e]'}`}>
                          {item.status}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 w-full sm:w-auto justify-end sm:justify-start border-t sm:border-t-0 pt-3 sm:pt-0">
                      <button 
                        onClick={() => {
                          setEditingIntegrationIndex(editingIntegrationIndex === index ? null : index);
                          setIntegrationConfig(JSON.stringify(item.config || {}, null, 2));
                        }}
                        className="text-xs font-bold text-blue-600 hover:underline"
                      >
                        {editingIntegrationIndex === index ? 'Cancel' : 'Configure'}
                      </button>
                      <button 
                        onClick={() => {
                          const newIntegrations = [...settings.integrations];
                          newIntegrations[index].status = item.status === 'connected' ? 'disconnected' : 'connected';
                          setSettings({ ...settings, integrations: newIntegrations });
                        }}
                        className="text-xs font-bold text-blue-600 hover:underline"
                      >
                        {item.status === 'connected' ? 'Disconnect' : 'Connect'}
                      </button>
                      <button 
                        onClick={() => {
                          const newIntegrations = settings.integrations.filter((_, i) => i !== index);
                          setSettings({ ...settings, integrations: newIntegrations });
                        }}
                        className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
                  {editingIntegrationIndex === index && (
                    <motion.div 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-4 rounded-2xl bg-[#f9f9f9] border border-[#e5e5e5] space-y-3"
                    >
                      <label className="text-xs font-bold text-[#9e9e9e] uppercase tracking-widest">API Configuration (JSON)</label>
                      <textarea 
                        value={integrationConfig}
                        onChange={(e) => setIntegrationConfig(e.target.value)}
                        className="w-full h-32 p-3 rounded-xl border border-[#e5e5e5] font-mono text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                        placeholder='{ "apiKey": "...", "endpoint": "..." }'
                      />
                      <div className="flex justify-end">
                        <button 
                          onClick={() => {
                            try {
                              const config = JSON.parse(integrationConfig);
                              const newIntegrations = [...settings.integrations];
                              newIntegrations[index] = { ...newIntegrations[index], config };
                              setSettings({ ...settings, integrations: newIntegrations });
                              setEditingIntegrationIndex(null);
                            } catch (e) {
                              alert('Invalid JSON configuration');
                            }
                          }}
                          className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-all"
                        >
                          Apply Config
                        </button>
                      </div>
                    </motion.div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </Section>

        {/* Security & Access */}
        <Section 
          icon={Shield} 
          title="Security & Access" 
          description="Configure password policies, 2FA, and IP whitelisting."
          active={activeSection === 'security'}
          onClick={() => setActiveSection(activeSection === 'security' ? null : 'security')}
        >
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl bg-white border border-[#e5e5e5] gap-4">
              <div>
                <p className="font-bold text-sm text-[#1a1a1a]">Two-Factor Authentication (2FA)</p>
                <p className="text-xs text-[#9e9e9e]">Enforce 2FA for all administrative accounts.</p>
              </div>
              <div 
                onClick={() => setSettings(s => s ? { ...s, security: { ...s.security, twoFactorAuthRequired: !s.security.twoFactorAuthRequired } } : null)}
                className={`w-12 h-6 rounded-full relative cursor-pointer transition-colors shrink-0 ${settings?.security.twoFactorAuthRequired ? 'bg-blue-600' : 'bg-[#e5e5e5]'}`}
              >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all ${settings?.security.twoFactorAuthRequired ? 'right-1' : 'left-1'}`} />
              </div>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl bg-white border border-[#e5e5e5] gap-4">
              <div>
                <p className="font-bold text-sm text-[#1a1a1a]">Password Complexity</p>
                <p className="text-xs text-[#9e9e9e]">Minimum {settings?.security.passwordComplexity.minLength} characters, symbols, and numbers.</p>
              </div>
              <div className="flex items-center gap-2 justify-end">
                <input 
                  type="number" 
                  value={settings?.security.passwordComplexity.minLength}
                  onChange={(e) => {
                    const length = parseInt(e.target.value);
                    if (!isNaN(length)) {
                      setSettings(s => s ? { 
                        ...s, 
                        security: { 
                          ...s.security, 
                          passwordComplexity: { ...s.security.passwordComplexity, minLength: length } 
                        } 
                      } : null);
                    }
                  }}
                  className="w-12 p-1 border rounded text-xs text-center"
                />
                <span className="text-xs text-[#9e9e9e]">chars</span>
              </div>
            </div>
          </div>
        </Section>

        {/* Help & Support Card */}
        <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-[32px] p-8 md:p-12 text-white relative overflow-hidden shadow-xl">
          <div className="relative z-10 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 rounded-full text-xs font-bold uppercase tracking-widest mb-6 backdrop-blur-sm">
              <HelpCircle className="w-4 h-4" />
              Support Center
            </div>
            <h3 className="text-3xl md:text-4xl font-black mb-4 leading-tight">Need help with platform configuration?</h3>
            <p className="text-blue-100 text-lg mb-8 leading-relaxed">
              Our dedicated support team is available 24/7 to help you with any technical issues or platform customization requests.
            </p>
            <div className="flex flex-wrap gap-4">
              <button 
                onClick={() => window.location.href = '/support'}
                className="bg-white text-blue-600 px-8 py-4 rounded-2xl font-bold hover:bg-blue-50 transition-all flex items-center gap-2 shadow-lg"
              >
                <LifeBuoy className="w-5 h-5" />
                Open Support Desk
              </button>
              <button 
                onClick={() => window.open('https://docs.platform.com', '_blank')}
                className="bg-blue-500/30 text-white border border-white/20 px-8 py-4 rounded-2xl font-bold hover:bg-blue-500/40 transition-all flex items-center gap-2 backdrop-blur-sm"
              >
                <Globe className="w-5 h-5" />
                Documentation
              </button>
            </div>
          </div>
          
          {/* Decorative Elements */}
          <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute right-10 top-10 w-40 h-40 bg-blue-400/20 rounded-full blur-2xl" />
          <HelpCircle className="absolute right-12 bottom-12 w-48 h-48 text-white/5 -rotate-12" />
        </div>
      </div>
    </div>
  );
}
