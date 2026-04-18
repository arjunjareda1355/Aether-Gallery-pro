import React, { useState, useEffect } from 'react';
import { db, COLLECTIONS } from '../lib/firebase';
import { collection, query, orderBy, onSnapshot, updateDoc, doc, deleteDoc, writeBatch, limit } from 'firebase/firestore';
import { Report, PaymentRequest, Image } from '../types';
import { Shield, Trash2, EyeOff, CheckCircle, ArrowLeft, CreditCard, XCircle, ExternalLink, Image as ImageIcon, Search, CheckSquare, Square, AlertTriangle } from 'lucide-react';
import { formatDate, cn } from '../lib/utils';
import { Link } from 'react-router-dom';

export default function ModerationPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [payments, setPayments] = useState<PaymentRequest[]>([]);
  const [assets, setAssets] = useState<Image[]>([]);
  const [activeTab, setActiveTab] = useState<'reports' | 'payments' | 'assets'>('reports');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedAssetIds, setSelectedAssetIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    setIsLoading(true);
    let unsubscribe: () => void = () => {};

    if (activeTab === 'reports') {
      const q = query(collection(db, COLLECTIONS.REPORTS), orderBy('timestamp', 'desc'));
      unsubscribe = onSnapshot(q, (snapshot) => {
        setReports(snapshot.docs.map(d => ({id: d.id, ...d.data()} as Report)));
        setIsLoading(false);
      });
    } else if (activeTab === 'payments') {
      const q = query(collection(db, COLLECTIONS.PAYMENTS), orderBy('timestamp', 'desc'));
      unsubscribe = onSnapshot(q, (snapshot) => {
        setPayments(snapshot.docs.map(d => ({id: d.id, ...d.data()} as PaymentRequest)));
        setIsLoading(false);
      });
    } else if (activeTab === 'assets') {
      const q = query(collection(db, COLLECTIONS.IMAGES), orderBy('timestamp', 'desc'), limit(100));
      unsubscribe = onSnapshot(q, (snapshot) => {
        setAssets(snapshot.docs.map(d => ({id: d.id, ...d.data()} as Image)));
        setIsLoading(false);
      });
    }

    return () => unsubscribe();
  }, [activeTab]);

  const toggleAssetSelection = (id: string) => {
    const newSelected = new Set(selectedAssetIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedAssetIds(newSelected);
  };

  const selectAllAssets = () => {
    if (selectedAssetIds.size === filteredAssets.length) {
      setSelectedAssetIds(new Set());
    } else {
      setSelectedAssetIds(new Set(filteredAssets.map(a => a.id)));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedAssetIds.size === 0) return;
    if (!window.confirm(`Are you sure you want to delete ${selectedAssetIds.size} assets permanently?`)) return;

    setIsLoading(true);
    try {
      const batch = writeBatch(db);
      selectedAssetIds.forEach(id => {
        batch.delete(doc(db, COLLECTIONS.IMAGES, id));
      });
      await batch.commit();
      setSelectedAssetIds(new Set());
      alert("Selected assets deleted successfully.");
    } catch (e) {
      console.error(e);
      alert("Bulk delete failed.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAction = async (reportId: string, imageId: string, action: 'delete' | 'ignore') => {
    try {
      if (action === 'delete') {
        const confirmDelete = window.confirm("Are you sure you want to delete this asset?");
        if (!confirmDelete) return;
        await deleteDoc(doc(db, COLLECTIONS.IMAGES, imageId));
      }
      await deleteDoc(doc(db, COLLECTIONS.REPORTS, reportId));
    } catch (e) { 
      console.error(e); 
      alert("Moderation action failed.");
    }
  };

  const handlePaymentAction = async (paymentId: string, userId: string, action: 'approve' | 'reject') => {
    try {
      const batch = writeBatch(db);
      if (action === 'approve') {
        batch.update(doc(db, COLLECTIONS.USERS, userId), { isPremium: true, isPremiumPending: false });
        batch.update(doc(db, COLLECTIONS.PAYMENTS, paymentId), { status: 'approved' });
      } else {
        batch.update(doc(db, COLLECTIONS.USERS, userId), { isPremiumPending: false });
        batch.update(doc(db, COLLECTIONS.PAYMENTS, paymentId), { status: 'rejected' });
      }
      await batch.commit();
      alert(`Payment ${action}d successfully.`);
    } catch (e) {
      console.error(e);
      alert("Action failed.");
    }
  };

  const filteredAssets = assets.filter(a => 
    a.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    a.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="pt-32 px-4 md:px-10 pb-20 space-y-10 max-w-7xl mx-auto">
      <div className="flex justify-start">
        <Link to="/" className="flex items-center gap-2 text-text-dim hover:text-white transition-colors group">
          <div className="p-2 rounded-full border border-border-dark group-hover:border-brand-primary/50 transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </div>
          <span className="text-xs font-bold uppercase tracking-widest">Exit Moderation</span>
        </Link>
      </div>

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-red-500/10 rounded-2xl text-red-500"><Shield className="w-8 h-8" /></div>
          <div>
            <h1 className="text-3xl font-display font-extrabold tracking-tight">Gallery Moderation</h1>
            <p className="text-text-dim font-medium uppercase text-xs tracking-widest mt-1">Manage gallery safety and assets</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 p-1 bg-white/5 rounded-2xl border border-white/5">
          {(['reports', 'payments', 'assets'] as const).map((tab) => (
            <button 
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "px-6 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all",
                activeTab === tab ? "bg-white text-bg-dark" : "text-text-dim hover:text-white"
              )}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
              {tab === 'reports' && reports.length > 0 && ` (${reports.length})`}
              {tab === 'payments' && payments.filter(p => p.status === 'pending').length > 0 && ` (${payments.filter(p => p.status === 'pending').length})`}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {activeTab === 'assets' && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-card-dark p-6 rounded-3xl border border-border-dark">
              <div className="relative w-full md:w-80">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-dim" />
                <input 
                  type="text" 
                  placeholder="Search assets..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-brand-primary transition-all"
                />
              </div>
              <div className="flex gap-4 w-full md:w-auto">
                <button 
                  onClick={selectAllAssets}
                  className="flex-1 md:flex-none px-6 py-3 bg-white/5 border border-white/10 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-white/10 transition-all flex items-center justify-center gap-2"
                >
                  {selectedAssetIds.size === filteredAssets.length ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                  {selectedAssetIds.size === filteredAssets.length ? 'Deselect All' : 'Select All'}
                </button>
                <button 
                  disabled={selectedAssetIds.size === 0 || isLoading}
                  onClick={handleBulkDelete}
                  className="flex-1 md:flex-none px-6 py-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-red-500/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete Selected ({selectedAssetIds.size})
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredAssets.map(asset => (
                <div 
                  key={asset.id} 
                  onClick={() => toggleAssetSelection(asset.id)}
                  className={cn(
                    "relative aspect-square rounded-2xl overflow-hidden group cursor-pointer border-2 transition-all",
                    selectedAssetIds.has(asset.id) ? "border-brand-primary ring-4 ring-brand-primary/20" : "border-transparent border-white/5"
                  )}
                >
                  <img src={asset.url} className="w-full h-full object-cover" alt={asset.title} referrerPolicy="no-referrer" />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <p className="text-[10px] font-bold text-white truncate">{asset.title}</p>
                    <p className="text-[8px] font-bold text-brand-primary uppercase tracking-widest">{asset.category}</p>
                  </div>
                  <div className={cn(
                    "absolute top-2 right-2 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
                    selectedAssetIds.has(asset.id) ? "bg-brand-primary border-brand-primary" : "bg-black/40 border-white/20"
                  )}>
                    {selectedAssetIds.has(asset.id) && <CheckCircle className="w-3.5 h-3.5 text-white" />}
                  </div>
                  {asset.isPremium && (
                    <div className="absolute top-2 left-2 p-1 bg-amber-500/20 backdrop-blur-md rounded text-amber-500">
                      <ImageIcon className="w-3 h-3" />
                    </div>
                  )}
                </div>
              ))}
            </div>
            {filteredAssets.length === 0 && !isLoading && (
              <div className="text-center py-20 italic text-text-dim">No assets found matching your criteria.</div>
            )}
          </div>
        )}

        {activeTab === 'reports' && (
          <div className="space-y-4">
            {reports.length === 0 && !isLoading && (
              <div className="text-center py-20 bg-card-dark rounded-3xl border border-border-dark italic text-text-dim">No reports pending. Everything is clear!</div>
            )}
            {reports.map(report => (
              <div key={report.id} className="bg-card-dark border border-border-dark rounded-3xl p-6 flex flex-col md:flex-row items-center gap-6 group hover:border-white/10 transition-colors">
                <div className="w-full md:w-32 h-32 rounded-2xl overflow-hidden bg-black/40 flex-shrink-0">
                  <img src={report.imageUrl} referrerPolicy="no-referrer" className="w-full h-full object-cover" alt="Reported" />
                </div>
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 bg-red-500/10 text-red-500 text-[10px] font-extrabold uppercase tracking-widest rounded-full">Report: {report.type}</span>
                    <span className="text-[10px] font-bold text-text-dim uppercase tracking-widest">{formatDate(report.timestamp)}</span>
                  </div>
                  <p className="text-text-dim text-sm">Image ID: <code className="bg-black/40 px-2 py-0.5 rounded text-xs select-all text-white font-mono">{report.imageId}</code></p>
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                  <button onClick={() => handleAction(report.id, report.imageId, 'ignore')} className="flex-1 px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/5 rounded-2xl text-xs font-bold uppercase tracking-widest transition-all">Ignore</button>
                  <button onClick={() => handleAction(report.id, report.imageId, 'delete')} className="flex-1 px-6 py-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-2xl text-xs font-bold uppercase tracking-widest transition-all">Delete Post</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'payments' && (
          <div className="space-y-4">
            {payments.length === 0 && !isLoading && (
              <div className="text-center py-20 bg-card-dark rounded-3xl border border-border-dark italic text-text-dim">No payment requests found.</div>
            )}
            {payments.map(payment => (
              <div key={payment.id} className="bg-card-dark border border-border-dark rounded-3xl p-6 flex flex-col md:flex-row items-center gap-6 group hover:border-white/10 transition-colors">
                <div className="w-full md:w-32 h-32 rounded-2xl overflow-hidden bg-black/40 flex-shrink-0 cursor-zoom-in" onClick={() => window.open(payment.screenshotUrl, '_blank')}>
                   <img src={payment.screenshotUrl} referrerPolicy="no-referrer" className="w-full h-full object-cover" alt="Screenshot" />
                </div>
                <div className="flex-1 space-y-2 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-3 py-1 bg-brand-primary/10 text-brand-primary text-[10px] font-extrabold uppercase tracking-widest rounded-full">Plan: ₹{payment.plan}</span>
                    <span className={cn( "px-3 py-1 text-[10px] font-extrabold uppercase tracking-widest rounded-full", payment.status === 'pending' ? 'bg-yellow-500/10 text-yellow-500' : payment.status === 'approved' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500' )}> {payment.status} </span>
                    <span className="text-[10px] font-bold text-text-dim uppercase tracking-widest">{formatDate(payment.timestamp)}</span>
                  </div>
                  <div className="space-y-1">
                    <p className="text-white text-sm font-bold truncate">{payment.userEmail}</p>
                    <p className="text-text-dim text-xs truncate select-all font-mono">{payment.userId}</p>
                  </div>
                </div>
                {payment.status === 'pending' && (
                  <div className="flex gap-2 w-full md:w-auto">
                    <button onClick={() => handlePaymentAction(payment.id, payment.userId, 'reject')} className="flex-1 px-6 py-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-2xl text-xs font-bold uppercase tracking-widest transition-all">Reject</button>
                    <button onClick={() => handlePaymentAction(payment.id, payment.userId, 'approve')} className="flex-1 px-6 py-3 bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/20 rounded-2xl text-xs font-bold uppercase tracking-widest transition-all">Approve</button>
                  </div>
                )}
                <a href={payment.screenshotUrl} target="_blank" rel="noreferrer" className="p-3 rounded-xl bg-white/5 border border-white/5 text-text-dim hover:text-white transition-all"> <ExternalLink className="w-4 h-4" /> </a>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
