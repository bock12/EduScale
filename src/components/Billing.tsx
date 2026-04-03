import React, { useState, useEffect } from 'react';
import { Organization, PlatformSettings, SubscriptionPackage } from '../types';
import { CreditCard, CheckCircle2, AlertCircle, Users, Zap, Shield, RefreshCw } from 'lucide-react';
import { collection, query, where, getCountFromServer, doc, getDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';

interface BillingProps {
  organization: Organization;
}

export default function Billing({ organization }: BillingProps) {
  const [studentCount, setStudentCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);
  const [platformSettings, setPlatformSettings] = useState<PlatformSettings | null>(null);
  const [displayCurrency, setDisplayCurrency] = useState<string>('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch student count
        const studentsQuery = query(collection(db, 'organizations', organization.id, 'students'));
        const snapshotCount = await getCountFromServer(studentsQuery);
        setStudentCount(snapshotCount.data().count);

        // Fetch platform settings
        const settingsDoc = await getDoc(doc(db, 'settings', 'platform'));
        if (settingsDoc.exists()) {
          const data = settingsDoc.data() as PlatformSettings;
          setPlatformSettings(data);
          setDisplayCurrency(data.defaultCurrency);
        }
      } catch (error) {
        console.error("Error fetching billing data:", error);
        handleFirestoreError(error, OperationType.GET, 'billing_data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [organization.id]);

  // Find the current package based on organization's plan name (mapping for now)
  const currentPackage = platformSettings?.subscriptionPackages.find(
    p => p.name.toLowerCase() === organization.subscriptionPlan.toLowerCase()
  );

  const getExchangeRate = (from: string, to: string) => {
    if (from === to) return 1;
    const rate = platformSettings?.exchangeRates.find(r => r.from === from && r.to === to);
    if (rate) return rate.rate;
    // Try reverse rate
    const reverseRate = platformSettings?.exchangeRates.find(r => r.from === to && r.to === from);
    if (reverseRate) return 1 / reverseRate.rate;
    return 1;
  };

  const calculateTotal = () => {
    if (!currentPackage) return 0;
    
    let baseTotal = 0;
    if (currentPackage.billingModel === 'per_student') {
      baseTotal = currentPackage.price * studentCount;
    } else if (currentPackage.billingModel === 'student_range') {
      baseTotal = currentPackage.price; // Flat rate for the range
    }

    // Convert to display currency
    const rate = getExchangeRate(currentPackage.currency, displayCurrency);
    return baseTotal * rate;
  };

  const monthlyTotal = calculateTotal();
  const currencySymbol = platformSettings?.currencies.find(c => c.code === displayCurrency)?.symbol || '$';

  const handlePayment = () => {
    setProcessing(true);
    // Mock payment processing
    setTimeout(() => {
      setProcessing(false);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 5000);
    }, 2000);
  };

  const handleProcessPayment = async () => {
    setProcessing(true);
    setSuccess(false);
    
    // Mock processing time
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    setProcessing(false);
    setSuccess(true);
    
    // Reset success message after 5 seconds
    setTimeout(() => setSuccess(false), 5000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-6 md:space-y-8 pb-12">
      <header>
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-2">Billing & Subscription</h2>
        <p className="text-[#9e9e9e] text-sm md:text-base">Manage your school's subscription plan and payment methods.</p>
      </header>

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 p-4 rounded-xl flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <p className="font-medium text-sm md:text-base">Payment processed successfully! Your subscription is active.</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        {/* Current Plan Details */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl md:rounded-[32px] border border-[#e5e5e5] shadow-sm overflow-hidden">
            <div className="p-6 md:p-8 border-b border-[#e5e5e5]">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                    <Zap className="w-5 h-5" />
                  </div>
                  <h3 className="text-xl font-bold">Current Plan</h3>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[#9e9e9e] uppercase tracking-widest">Display Currency:</span>
                  <select 
                    value={displayCurrency}
                    onChange={(e) => setDisplayCurrency(e.target.value)}
                    className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-lg outline-none cursor-pointer"
                  >
                    {platformSettings?.currencies.map(c => (
                      <option key={c.code} value={c.code}>{c.code} ({c.symbol})</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                <div className="bg-[#f5f5f5] p-4 rounded-2xl">
                  <p className="text-xs text-[#9e9e9e] font-bold uppercase tracking-widest mb-1">
                    {currentPackage?.billingModel === 'per_student' ? 'Per Student' : 'Flat Rate'}
                  </p>
                  <p className="text-2xl font-black">{currencySymbol}{isNaN(currentPackage?.price || 0) ? '0' : (currentPackage?.price || 0)}<span className="text-sm text-[#9e9e9e] font-medium">/mo</span></p>
                </div>
                <div className="bg-[#f5f5f5] p-4 rounded-2xl">
                  <p className="text-xs text-[#9e9e9e] font-bold uppercase tracking-widest mb-1">Billing Model</p>
                  <p className="text-lg font-bold text-blue-600">
                    {currentPackage?.billingModel === 'per_student' ? 'Per Student' : 'Student Range'}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6 md:p-8 bg-[#f9f9f9]">
              <h4 className="font-bold mb-4">Usage Summary</h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-[#4a4a4a] flex items-center gap-2"><Users className="w-4 h-4" /> Active Students</span>
                  <span className="font-bold">{studentCount}</span>
                </div>
                {currentPackage?.billingModel === 'per_student' ? (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-[#4a4a4a]">Student Cost ({studentCount} × {currencySymbol}{currentPackage.price})</span>
                    <span className="font-bold">{currencySymbol}{studentCount * currentPackage.price}</span>
                  </div>
                ) : (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-[#4a4a4a]">Range Included ({currentPackage?.studentRange?.min} - {currentPackage?.studentRange?.max} students)</span>
                    <span className="font-bold text-green-600">Included</span>
                  </div>
                )}
                <div className="pt-3 border-t border-[#e5e5e5] flex justify-between items-center">
                  <span className="font-bold text-lg">Total Monthly</span>
                  <span className="font-black text-2xl text-blue-600">{currencySymbol}{isNaN(monthlyTotal) ? '0' : monthlyTotal}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl md:rounded-[32px] border border-[#e5e5e5] shadow-sm p-6 md:p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-green-50 text-green-600 rounded-lg">
                <Shield className="w-5 h-5" />
              </div>
              <h3 className="text-xl font-bold">Payment Method</h3>
            </div>
            
            <div className="border border-[#e5e5e5] rounded-2xl p-4 flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-8 bg-[#f5f5f5] rounded flex items-center justify-center border border-[#e5e5e5] shrink-0">
                  <CreditCard className="w-5 h-5 text-[#9e9e9e]" />
                </div>
                <div>
                  <p className="font-bold text-sm">•••• •••• •••• 4242</p>
                  <p className="text-xs text-[#9e9e9e]">Expires 12/28</p>
                </div>
              </div>
              <button className="text-blue-600 text-sm font-bold hover:underline">Edit</button>
            </div>

            <button 
              onClick={handlePayment}
              disabled={processing}
              className="w-full flex items-center justify-center gap-2 bg-[#1a1a1a] text-white font-bold py-4 rounded-xl hover:bg-black transition-all disabled:opacity-50"
            >
              {processing ? (
                <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              ) : (
                <CreditCard className="w-5 h-5" />
              )}
              {processing ? 'Processing...' : `Pay ${currencySymbol}${monthlyTotal} Now`}
            </button>
            <p className="text-center text-xs text-[#9e9e9e] mt-4 flex items-center justify-center gap-1">
              <Shield className="w-3 h-3" /> Secure payment processing by Stripe
            </p>
          </div>
        </div>

        {/* Plan Comparison or Info */}
        <div className="space-y-6">
          <div className="bg-[#1a1a1a] text-white rounded-2xl md:rounded-[32px] p-6 md:p-8">
            <h3 className="text-xl font-bold mb-2">Package Features</h3>
            <p className="text-[#9e9e9e] text-sm mb-6">Included features for your current plan.</p>
            
            <ul className="space-y-3 mb-8">
              {currentPackage?.features ? (
                currentPackage.features.filter(f => typeof f === 'string' ? true : f.isActive).map((feature, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" />
                    <span>{typeof feature === 'string' ? feature : feature.name}</span>
                  </li>
                ))
              ) : (
                ['Student Management', 'Attendance', 'Basic Reporting'].map((feature, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))
              )}
            </ul>
            
            <button 
              onClick={handleProcessPayment}
              disabled={processing}
              className={`w-full font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 ${
                success 
                  ? 'bg-green-100 text-green-700' 
                  : 'bg-white text-[#1a1a1a] hover:bg-[#f5f5f5]'
              }`}
            >
              {processing ? (
                <>
                  <div className="w-4 h-4 border-2 border-[#1a1a1a]/20 border-t-[#1a1a1a] rounded-full animate-spin" />
                  Processing...
                </>
              ) : success ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Payment Successful
                </>
              ) : (
                'Pay Now'
              )}
            </button>
          </div>

          <div className="bg-blue-50 border border-blue-100 rounded-2xl md:rounded-[32px] p-6 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-blue-900 text-sm mb-1">Billing Cycle</h4>
              <p className="text-blue-700 text-xs leading-relaxed">Your next billing date is <strong>{new Date(new Date().setMonth(new Date().getMonth() + 1)).toLocaleDateString()}</strong>. Charges are automatically applied to your default payment method.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
