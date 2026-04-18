import React, { useState } from 'react';
import { db, COLLECTIONS, auth, storage } from '../lib/firebase';
import { collection, addDoc, serverTimestamp, updateDoc, doc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { User } from '../types';
import { CreditCard, CheckCircle, Smartphone, ArrowLeft, Upload, Info, MessageSquare, X } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';

interface UpgradePageProps {
  user: User;
}

const PLANS = [
  { id: '99', name: 'Starter Sanctuary', price: '99', period: 'month', features: ['Premium Image Access', 'Video Downloads', 'Exclusive Categories'] },
  { id: '199', name: 'Elite Curator', price: '199', period: 'month', features: ['All Starter Features', '4K Media Access', 'Priority Support', 'No Watermarks'] },
  { id: '499', name: 'Divine Aether', price: '499', period: 'month', features: ['All Elite Features', 'Beta Feature Access', 'Early Content Drops', 'Developer Direct Line'] }
];

export default function UpgradePage({ user }: UpgradePageProps) {
  const [selectedPlan, setSelectedPlan] = useState<typeof PLANS[0] | null>(null);
  const [screenshotUrl, setScreenshotUrl] = useState('');
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);
  const [requestMsg, setRequestMsg] = useState('');
  const navigate = useNavigate();

  const PAYMENT_UPI = '8233538355@ybl';

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert("Please upload an image file.");
      return;
    }

    const storageRef = ref(storage, `payments/${user.uid}/${Date.now()}_${file.name}`);
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on('state_changed', 
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        setUploadProgress(progress);
      }, 
      (error) => {
        console.error("Upload failed:", error);
        alert("Upload failed. Try using a link instead.");
        setUploadProgress(null);
      }, 
      async () => {
        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
        setScreenshotUrl(downloadURL);
        setUploadProgress(null);
      }
    );
  };

  const handleCustomRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestMsg.trim()) return;

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, COLLECTIONS.UPGRADE_REQUESTS), {
        userId: user.uid,
        userEmail: user.email,
        message: requestMsg,
        timestamp: serverTimestamp(),
        status: 'pending'
      });
      alert("Custom upgrade request sent! The developer will get back to you soon.");
      setRequestMsg('');
      setIsRequesting(false);
    } catch (error) {
      console.error(error);
      alert("Failed to send request.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlan || !screenshotUrl) return;

    setIsSubmitting(true);
    try {
      // 1. Create a payment request
      await addDoc(collection(db, COLLECTIONS.PAYMENTS), {
        userId: user.uid,
        userEmail: user.email,
        plan: selectedPlan.price,
        screenshotUrl,
        status: 'pending',
        timestamp: serverTimestamp()
      });

      // 2. Update user pending status
      await updateDoc(doc(db, COLLECTIONS.USERS, user.uid), {
        isPremiumPending: true,
        subscriptionPlan: selectedPlan.price
      });

      alert("Upgrade request submitted! Our moderators will verify your payment within 24 hours.");
      navigate('/profile');
    } catch (error) {
      console.error(error);
      alert("Submission failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (user.isPremium) {
    return (
      <div className="pt-32 px-4 text-center space-y-6">
        <div className="w-20 h-20 bg-green-500/10 text-green-500 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle className="w-10 h-10" />
        </div>
        <h1 className="text-3xl font-display font-bold">You are a Premium Member</h1>
        <p className="text-text-dim max-w-md mx-auto">Enjoy your exclusive access to the highest quality media in the sanctuary.</p>
        <Link to="/" className="inline-block px-8 py-4 bg-white text-bg-dark rounded-2xl font-bold">Back to Gallery</Link>
      </div>
    );
  }

  return (
    <div className="pt-32 px-4 md:px-10 pb-20 max-w-7xl mx-auto space-y-12">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-6">
        <Link to="/profile" className="flex items-center gap-2 text-text-dim hover:text-white transition-colors group">
          <div className="p-2 rounded-full border border-border-dark group-hover:border-brand-primary/50 transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </div>
          <span className="text-xs font-bold uppercase tracking-widest">Back to Profile</span>
        </Link>
        <button 
          onClick={() => setIsRequesting(true)}
          className="flex items-center gap-3 px-6 py-3 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-all group"
        >
          <MessageSquare className="w-4 h-4 text-brand-primary group-hover:scale-110 transition-transform" />
          <span className="text-xs font-bold uppercase tracking-widest text-white">Request Custom Plan</span>
        </button>
      </div>

      <div className="text-center space-y-6">
        <h1 className="text-4xl md:text-6xl font-display font-black tracking-tighter text-gradient uppercase">Elevate Your Sanctuary</h1>
        <p className="text-text-dim max-w-2xl mx-auto font-medium md:text-lg leading-relaxed">Unlock premium cinematic moments and high-performance media access across the Aether network.</p>
      </div>

      {isRequesting && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-md bg-card-dark border border-border-dark rounded-[32px] p-8 md:p-10 space-y-6 shadow-2xl scale-in-center">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-display font-bold">Request Developer Unlock</h3>
              <button onClick={() => setIsRequesting(false)} className="p-2 hover:bg-white/5 rounded-full"><X className="w-5 h-5" /></button>
            </div>
            <p className="text-xs text-text-dim leading-relaxed uppercase font-bold tracking-tight">Send a request directly to the developer for a custom plan or enterprise access.</p>
            <form onSubmit={handleCustomRequest} className="space-y-4">
              <textarea 
                required
                rows={4}
                placeholder="Describe your request..."
                value={requestMsg}
                onChange={e => setRequestMsg(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-sm focus:outline-none focus:ring-1 focus:ring-brand-primary transition-all resize-none text-white"
              />
              <button
                disabled={isSubmitting}
                className="w-full py-4 bg-brand-primary text-white rounded-2xl font-black uppercase tracking-widest text-xs disabled:opacity-50"
              >
                {isSubmitting ? "Sending..." : "Submit Request"}
              </button>
            </form>
          </div>
        </div>
      )}

      {!selectedPlan ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {PLANS.map((plan) => (
            <div 
              key={plan.id}
              className="bg-card-dark border border-border-dark p-8 md:p-10 rounded-[32px] md:rounded-[40px] flex flex-col hover:border-brand-primary/50 transition-all group relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                <Smartphone className="w-16 h-16" />
              </div>
              <div className="space-y-3 mb-10 relative">
                <h3 className="text-xl md:text-2xl font-display font-bold text-white tracking-tight">{plan.name}</h3>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-display font-black tracking-tighter">₹{plan.price}</span>
                  <span className="text-text-dim text-xs font-bold uppercase tracking-widest">/ {plan.period}</span>
                </div>
              </div>
              <ul className="space-y-5 mb-10 flex-1 relative">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-4 text-sm text-text-dim group-hover:text-white/80 transition-colors">
                    <CheckCircle className="w-5 h-5 text-brand-primary shrink-0 mt-0.5" />
                    <span className="font-medium">{feature}</span>
                  </li>
                ))}
              </ul>
              <button 
                onClick={() => setSelectedPlan(plan)}
                className="w-full py-5 bg-white text-bg-dark rounded-2xl text-xs font-black uppercase tracking-[0.2em] transform transition-all active:scale-95 shadow-xl hover:shadow-white/10"
              >
                Select this Plan
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="max-w-4xl mx-auto bg-card-dark border border-border-dark p-6 md:p-12 rounded-[32px] md:rounded-[48px] space-y-10 animate-in fade-in slide-in-from-bottom-6 duration-500">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/5 pb-8">
            <div>
              <h2 className="text-2xl md:text-3xl font-display font-black uppercase tracking-tight">Payment Verification</h2>
              <p className="text-brand-primary text-xs font-bold uppercase tracking-widest mt-1">Plan: {selectedPlan.name} (₹{selectedPlan.price})</p>
            </div>
            <button 
              onClick={() => setSelectedPlan(null)} 
              className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-[10px] font-black text-white/40 uppercase tracking-widest hover:text-white transition-all"
            >
              Switch Plan
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            <div className="space-y-8">
              <div className="p-8 bg-brand-primary/5 rounded-[32px] border border-brand-primary/10 space-y-6 relative overflow-hidden group">
                <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity">
                   <CreditCard className="w-24 h-24 rotate-12" />
                </div>
                <div className="flex items-center gap-3 text-brand-primary relative">
                  <Smartphone className="w-5 h-5" />
                  <span className="text-[10px] font-black uppercase tracking-[0.2em]">Pay via Secured UPI</span>
                </div>
                <div className="space-y-2 relative">
                  <p className="text-[10px] uppercase font-black text-text-dim tracking-widest">Merchant UPI ID</p>
                  <p className="text-2xl md:text-3xl font-display font-black text-white select-all break-all leading-none">{PAYMENT_UPI}</p>
                </div>
                <div className="space-y-2 relative">
                  <p className="text-[10px] uppercase font-black text-text-dim tracking-widest">Total Amount Due</p>
                  <p className="text-3xl md:text-4xl font-display font-black text-white tracking-tighter leading-none">₹{selectedPlan.price}</p>
                </div>
              </div>

              <div className="p-6 bg-white/5 rounded-2xl border border-white/5 flex gap-4">
                 <div className="shrink-0 p-2 rounded-lg bg-brand-secondary/10 text-brand-secondary">
                    <Info className="w-5 h-5" />
                 </div>
                 <p className="text-xs text-text-dim leading-relaxed font-bold tracking-tight uppercase">
                   Please upload a clear screenshot of the successful transaction. 
                   Ensure the date and time (matching today) are visible for verification.
                 </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="space-y-4">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-text-dim ml-1">Screenshot Proof</label>
                <div className="grid grid-cols-1 gap-4">
                   <div className="relative group overflow-hidden">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="absolute inset-0 opacity-0 cursor-pointer z-10"
                      />
                      <div className="w-full h-24 border-2 border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center gap-2 bg-white/[0.02] group-hover:border-brand-primary/50 group-hover:bg-brand-primary/5 transition-all">
                        {uploadProgress !== null ? (
                          <div className="flex flex-col items-center gap-2">
                             <div className="w-32 h-1 bg-white/10 rounded-full overflow-hidden">
                                <div className="h-full bg-brand-primary" style={{ width: `${uploadProgress}%` }} />
                             </div>
                             <span className="text-[10px] font-black uppercase">{Math.round(uploadProgress)}% Uploading</span>
                          </div>
                        ) : (
                          <>
                            <Upload className="w-5 h-5 text-text-dim group-hover:text-brand-primary transition-colors" />
                            <span className="text-[10px] font-black uppercase text-text-dim group-hover:text-white">Upload Screenshot Image</span>
                          </>
                        )}
                      </div>
                   </div>

                   <div className="relative flex items-center gap-4 py-2">
                      <div className="flex-1 h-px bg-white/5"></div>
                      <span className="text-[10px] font-black text-white/20 uppercase tracking-widest">OR</span>
                      <div className="flex-1 h-px bg-white/5"></div>
                   </div>

                  <div className="relative group">
                    <Smartphone className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-dim group-focus-within:text-brand-primary transition-colors" />
                    <input
                      type="url"
                      placeholder="Paste link to proof (optional if uploaded)"
                      value={screenshotUrl}
                      onChange={e => setScreenshotUrl(e.target.value)}
                      className="w-full h-16 bg-white/5 border border-white/10 rounded-2xl pl-14 pr-6 text-sm focus:outline-none focus:ring-1 focus:ring-brand-primary transition-all text-white font-medium placeholder:text-white/20"
                    />
                  </div>
                </div>
              </div>

              {screenshotUrl && (
                <div className="aspect-video bg-black/40 rounded-3xl border border-white/5 overflow-hidden ring-1 ring-white/10 animate-in zoom-in-95 duration-300">
                  <img src={screenshotUrl} alt="Screenshot Preview" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                </div>
              )}

              <button
                disabled={isSubmitting || uploadProgress !== null}
                className="w-full h-16 md:h-18 bg-brand-primary text-white rounded-2xl font-black uppercase tracking-[0.2em] text-sm hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 shadow-2xl shadow-brand-primary/20 flex items-center justify-center gap-3"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    <span>Verifying...</span>
                  </>
                ) : "Submit for Sanctification"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
