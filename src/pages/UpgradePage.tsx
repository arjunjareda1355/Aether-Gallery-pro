import React, { useState } from 'react';
import { db, COLLECTIONS, auth, storage } from '../lib/firebase';
import { collection, addDoc, serverTimestamp, updateDoc, doc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { User } from '../types';
import { CreditCard, CheckCircle, Smartphone, ArrowLeft, Upload, Info, MessageSquare, X, ExternalLink, Copy, Sparkles } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { cn, copyToClipboard } from '../lib/utils';
import { handleFirestoreError } from '../lib/firebase';

interface UpgradePageProps {
  user: User | null;
  onLogin?: () => void;
}

const PLANS = [
  { id: '99', name: 'Starter Sanctuary', price: '99', period: 'month', features: ['Premium Image Access', 'Video Downloads', 'Exclusive Categories'] },
  { id: '199', name: 'Elite Curator', price: '199', period: 'month', features: ['All Starter Features', '4K Media Access', 'Priority Support', 'No Watermarks'] },
  { id: '499', name: 'Divine Aether', price: '499', period: 'month', features: ['All Elite Features', 'Beta Feature Access', 'Early Content Drops', 'Developer Direct Line'] }
];

export default function UpgradePage({ user, onLogin }: UpgradePageProps) {
  const [selectedPlan, setSelectedPlan] = useState<typeof PLANS[0] | null>(null);
  const [screenshotUrl, setScreenshotUrl] = useState('');
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);
  const [requestData, setRequestData] = useState({
    fullName: '',
    whatsapp: '',
    purpose: '',
    details: ''
  });
  const navigate = useNavigate();

  const PAYMENT_UPI = '8233538355@ybl';

  const [uploadTask, setUploadTask] = useState<any>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!user) {
      onLogin?.();
      return;
    }
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert("Please upload an image file.");
      return;
    }

    const storageRef = ref(storage, `payments/${user.uid}/${Date.now()}_${file.name}`);
    const task = uploadBytesResumable(storageRef, file);
    setUploadTask(task);

    task.on('state_changed', 
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        setUploadProgress(progress);
      }, 
      (error) => {
        console.error("Upload failed:", error);
        alert("Upload failed. If it was interrupted, you can try again.");
        setUploadProgress(null);
        setUploadTask(null);
      }, 
      async () => {
        const downloadURL = await getDownloadURL(task.snapshot.ref);
        setScreenshotUrl(downloadURL);
        setUploadProgress(null);
        setUploadTask(null);
      }
    );
  };

  const handleResumeUpload = () => {
    if (uploadTask) {
      uploadTask.resume();
    }
  };

  const handlePauseUpload = () => {
    if (uploadTask) {
      uploadTask.pause();
    }
  };

  const handleCustomRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      onLogin?.();
      return;
    }
    if (!requestData.fullName.trim() || !requestData.details.trim()) {
      alert("Please provide your identity and architectural details.");
      return;
    }

    setIsSubmitting(true);
    try {
      console.log("Transmitting custom expansion intent...");
      await addDoc(collection(db, COLLECTIONS.UPGRADE_REQUESTS), {
        userId: user.uid,
        userEmail: user.email || 'hidden@sanctuary.aether',
        ...requestData,
        timestamp: serverTimestamp(),
        status: 'pending'
      });
      alert("Custom upgrade request sent! The architect will review your vision soon.");
      setRequestData({ fullName: '', whatsapp: '', purpose: '', details: '' });
      setIsRequesting(false);
    } catch (error) {
      console.error("Custom Request Detailed Failure:", error);
      try {
        handleFirestoreError(error, 'create', COLLECTIONS.UPGRADE_REQUESTS);
      } catch (e: any) {
        alert("Failed to send request: " + (e.message || "Permissions error"));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      onLogin?.();
      return;
    }
    if (!selectedPlan || !screenshotUrl) return;

    setIsSubmitting(true);
    try {
      // 1. Create a payment request
      await addDoc(collection(db, COLLECTIONS.PAYMENTS), {
        userId: user.uid,
        userEmail: user.email || 'no-email@sanctuary.aether',
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
      try {
        handleFirestoreError(error, 'create', COLLECTIONS.PAYMENTS);
      } catch (e: any) {
        alert("Submission failed: " + (e.message || "Please check your details."));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (user?.isPremium) {
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
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <Link to="/profile" className="flex items-center gap-2 text-text-dim hover:text-text-main transition-colors group">
          <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
          <span className="text-[10px] font-black uppercase tracking-[0.2em]">Sanctuary</span>
        </Link>
        <button 
          onClick={() => setIsRequesting(true)}
          className="flex items-center gap-3 px-6 py-2.5 bg-white/[0.03] border border-white/5 rounded-full hover:bg-white/[0.08] transition-all group"
        >
          <Sparkles className="w-3.5 h-3.5 text-brand-primary group-hover:rotate-12 transition-transform" />
          <span className="text-[9px] font-black uppercase tracking-widest text-text-main">Custom Expansion</span>
        </button>
      </div>

      <div className="text-center space-y-4 pt-4">
        <h1 className="text-3xl md:text-5xl font-display font-black tracking-tight text-text-main uppercase leading-none">Aether Elevation</h1>
        <p className="text-text-dim max-w-xl mx-auto font-medium text-xs md:text-sm tracking-wide uppercase opacity-60">Unlock divine cinematic capabilities and high-fidelity access.</p>
      </div>

      {isRequesting && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-xl bg-card-dark border border-border-dark rounded-[40px] p-8 md:p-12 space-y-8 shadow-2xl scale-in-center">
            <div className="flex justify-between items-center border-b border-white/5 pb-6">
              <div>
                <h3 className="text-2xl font-display font-black uppercase tracking-tight">Divine Intent Request</h3>
                <p className="text-[10px] font-extrabold uppercase tracking-widest text-brand-primary mt-1">Direct Architect Consultation</p>
              </div>
              <button onClick={() => setIsRequesting(false)} className="p-3 hover:bg-white/5 rounded-full text-text-dim hover:text-white transition-colors"><X className="w-6 h-6" /></button>
            </div>
            
            <form onSubmit={handleCustomRequest} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-extrabold uppercase tracking-widest text-text-dim ml-1">Full Identity</label>
                  <input 
                    required
                    type="text" 
                    placeholder="Real Name" 
                    value={requestData.fullName}
                    onChange={e => setRequestData({...requestData, fullName: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm focus:outline-none focus:ring-1 focus:ring-brand-primary transition-all text-white"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-extrabold uppercase tracking-widest text-text-dim ml-1">Universal Contact (WhatsApp)</label>
                  <input 
                    type="text" 
                    placeholder="+91 XXXX XXXX XX" 
                    value={requestData.whatsapp}
                    onChange={e => setRequestData({...requestData, whatsapp: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm focus:outline-none focus:ring-1 focus:ring-brand-primary transition-all text-white"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-extrabold uppercase tracking-widest text-text-dim ml-1">Primary Purpose</label>
                <select 
                  value={requestData.purpose}
                  onChange={e => setRequestData({...requestData, purpose: e.target.value})}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm focus:outline-none focus:ring-1 focus:ring-brand-primary transition-all text-white appearance-none"
                >
                  <option value="" className="bg-bg-dark">Select Purpose</option>
                  <option value="enterprise" className="bg-bg-dark">Enterprise/Bulk Access</option>
                  <option value="collaboration" className="bg-bg-dark">Artistic Collaboration</option>
                  <option value="special" className="bg-bg-dark">Special Features Unlock</option>
                  <option value="other" className="bg-bg-dark">Other Requests</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-extrabold uppercase tracking-widest text-text-dim ml-1">Architectural Details</label>
                <textarea 
                  required
                  rows={4}
                  placeholder="Elaborate your vision or reason for custom elevation..."
                  value={requestData.details}
                  onChange={e => setRequestData({...requestData, details: e.target.value})}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-sm focus:outline-none focus:ring-1 focus:ring-brand-primary transition-all resize-none text-white h-[120px]"
                />
              </div>

              <button
                disabled={isSubmitting}
                className="w-full py-5 bg-white text-bg-dark rounded-[24px] font-black uppercase tracking-[0.2em] text-xs disabled:opacity-50 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-2xl"
              >
                {isSubmitting ? "Transmitting Intent..." : "Submit to Sanctuary"}
              </button>
            </form>
          </div>
        </div>
      )}

      {!selectedPlan ? (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
        {PLANS.map((plan, idx) => (
          <div 
            key={`plan-card-${plan.id}-${idx}`}
            className={cn(
              "bg-card-dark/40 backdrop-blur-3xl border p-8 md:p-10 rounded-[40px] flex flex-col hover:scale-[1.02] transition-all group relative overflow-hidden shadow-2xl",
              idx === 1 ? "border-brand-primary/30 ring-1 ring-brand-primary/10 scale-105" : "border-white/5",
              idx === 2 ? "border-brand-secondary/30" : ""
            )}
          >
            {idx === 1 && (
              <div className="absolute top-6 right-6">
                 <div className="px-3 py-1 bg-brand-primary text-bg-dark text-[8px] font-black uppercase tracking-widest rounded-lg shadow-lg">Most Revered</div>
              </div>
            )}
            
            <div className="space-y-4 mb-10 relative">
              <div className="space-y-1">
                <p className="text-[9px] font-black uppercase tracking-[0.4em] text-text-dim/40">Resonance Tier</p>
                <h3 className="text-2xl font-display font-black text-text-main uppercase tracking-tighter italic leading-none">{plan.name}</h3>
              </div>
              <div className="flex items-baseline gap-2 pt-2">
                <span className="text-5xl font-display font-black tracking-tighter text-text-main">₹{plan.price}</span>
                <span className="text-text-dim text-[10px] font-black uppercase tracking-[0.2em] opacity-40">/ Cycle</span>
              </div>
            </div>
            
            <div className="w-full h-px bg-white/5 mb-8" />

            <ul className="space-y-4 mb-10 flex-1 relative">
              {plan.features.map((feature, i) => (
                <li key={`${plan.id}-${i}`} className="flex items-start gap-4 text-[10px] text-text-dim/80 group-hover:text-text-main transition-colors">
                  <div className="w-5 h-5 rounded-lg bg-white/5 flex items-center justify-center shrink-0 mt-0.5">
                    <CheckCircle className="w-3 h-3 text-brand-primary" />
                  </div>
                  <span className="font-bold uppercase tracking-[0.1em] leading-relaxed">{feature}</span>
                </li>
              ))}
            </ul>
            
            <button 
              onClick={() => setSelectedPlan(plan)}
              className={cn(
                "w-full py-5 rounded-[24px] text-[10px] font-black uppercase tracking-[0.3em] transition-all shadow-xl active:scale-95",
                idx === 1 
                  ? "bg-brand-primary text-bg-dark shadow-[0_15px_30px_rgba(var(--brand-primary-rgb),0.3)] hover:brightness-110" 
                  : "bg-white/[0.05] border border-white/10 text-text-main hover:bg-white/[0.1] hover:border-brand-primary/40"
              )}
            >
              Select Frequency
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
              <div className="grid grid-cols-1 gap-6">
                <div className="p-8 bg-white/5 rounded-[32px] border border-white/10 space-y-6 relative overflow-hidden group">
                   <div className="flex flex-col items-center justify-center p-4 bg-white rounded-[24px] shadow-2xl relative z-10">
                      <img 
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`upi://pay?pa=${PAYMENT_UPI}&pn=AetherSanctuary&am=${selectedPlan.price}&cu=INR&tn=SanctuaryUpgrade-${user.uid}`)}`}
                        alt="UPI QR Code"
                        className="w-48 h-48"
                      />
                      <p className="mt-4 text-[10px] font-black uppercase tracking-[0.2em] text-bg-dark">Scan to Elevate</p>
                   </div>
                   <div className="absolute inset-0 bg-brand-primary/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                </div>

                <div className="p-8 bg-brand-primary/5 rounded-[32px] border border-brand-primary/10 space-y-6 relative overflow-hidden group">
                  <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity">
                     <CreditCard className="w-24 h-24 rotate-12" />
                  </div>
                  <div className="flex items-center gap-3 text-brand-primary relative">
                    <Smartphone className="w-5 h-5" />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em]">Pay via Secured UPI</span>
                  </div>
                  <div className="space-y-4 relative">
                    <div>
                      <p className="text-[10px] uppercase font-black text-text-dim tracking-widest mb-1">Merchant UPI ID</p>
                      <div className="flex items-center gap-3">
                        <p className="text-xl md:text-3xl font-display font-black text-white select-all break-all leading-none">{PAYMENT_UPI}</p>
                        <button 
                          onClick={async () => {
                            const success = await copyToClipboard(PAYMENT_UPI);
                            if (success) alert("UPI ID copied!");
                          }}
                          className="p-2 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
                        >
                          <Copy className="w-4 h-4 text-brand-primary" />
                        </button>
                      </div>
                    </div>
                    
                    <div className="pt-2">
                      <a 
                        href={`upi://pay?pa=${PAYMENT_UPI}&pn=AetherSanctuary&am=${selectedPlan.price}&cu=INR&tn=SanctuaryUpgrade-${user.uid}`}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-brand-primary text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-brand-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                      >
                        <ExternalLink className="w-4 h-4" />
                        Open in Payment App
                      </a>
                    </div>
                  </div>
                  <div className="space-y-2 relative">
                    <p className="text-[10px] uppercase font-black text-text-dim tracking-widest">Total Amount Due</p>
                    <p className="text-3xl md:text-4xl font-display font-black text-white tracking-tighter leading-none">₹{selectedPlan.price}</p>
                  </div>
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
                             <div className="flex items-center gap-3">
                                <span className="text-[10px] font-black uppercase">{Math.round(uploadProgress)}% Uploading</span>
                                {uploadTask && (
                                  <div className="flex gap-2">
                                    <button type="button" onClick={(e) => { e.stopPropagation(); handlePauseUpload(); }} className="text-[8px] font-bold uppercase text-brand-primary/60 hover:text-brand-primary underline">Pause</button>
                                    <button type="button" onClick={(e) => { e.stopPropagation(); handleResumeUpload(); }} className="text-[8px] font-bold uppercase text-brand-primary/60 hover:text-brand-primary underline">Resume</button>
                                  </div>
                                )}
                             </div>
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
