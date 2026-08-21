import React, { useState, useEffect, useMemo } from 'react';
import { db, COLLECTIONS, handleFirestoreError } from '../lib/firebase';
import { collection, query, orderBy, onSnapshot, updateDoc, doc, deleteDoc, writeBatch, limit, serverTimestamp, addDoc, where, getDocs, setDoc, getDoc } from 'firebase/firestore';
import { Report, PaymentRequest, Image } from '../types';
import { Shield, Trash2, EyeOff, CheckCircle, ArrowLeft, CreditCard, XCircle, ExternalLink, Image as ImageIcon, Search, CheckSquare, Square, AlertTriangle, MessageSquare, Sparkles, Wand2, Play, Zap, Users, UserCheck, UserMinus, UserX } from 'lucide-react';
import { formatDate, cn } from '../lib/utils';
import { captureVideoThumbnail } from '../lib/videoUtils';
import { Link } from 'react-router-dom';
import { analyzeFromTitle } from '../services/geminiService';
import Logo from '../components/layout/Logo';

export default function ModerationPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [payments, setPayments] = useState<PaymentRequest[]>([]);
  const [upgrades, setUpgrades] = useState<any[]>([]);
  const [assets, setAssets] = useState<Image[]>([]);
   const [activeTab, setActiveTab] = useState<'reports' | 'payments' | 'assets' | 'upgrades' | 'bulk' | 'users' | 'branding'>('reports');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedAssetIds, setSelectedAssetIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [bulkUrls, setBulkUrls] = useState('');
  const [galleryToSync, setGalleryToSync] = useState('');
  const [bulkMasterTitle, setBulkMasterTitle] = useState('');
  const [runAiMagicOnBulk, setRunAiMagicOnBulk] = useState(false);
  const [isBulkImporting, setIsBulkImporting] = useState(false);

  // Branding configuration states
  const [logoText, setLogoText] = useState('Æ');
  const [logoLink, setLogoLink] = useState('/');
  const [logoIconUrl, setLogoIconUrl] = useState('');
  const [logoTitle, setLogoTitle] = useState('Aether');
  const [savingBranding, setSavingBranding] = useState(false);

  // Privacy protection & identity hiding states
  const [hideCreatorDetails, setHideCreatorDetails] = useState(false);
  const [hideExistingPosts, setHideExistingPosts] = useState(false);
  const [existingPostsCutoff, setExistingPostsCutoff] = useState<number | null>(null);

  // Users Account Curation Management States
  const [usersList, setUsersList] = useState<any[]>([]);
  const [usersSearchQuery, setUsersSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [editUserEmail, setEditUserEmail] = useState('');
  const [isFetchingUser, setIsFetchingUser] = useState(false);
  const [customPlanValue, setCustomPlanValue] = useState('Divine Curator');

  useEffect(() => {
    // Fetch dynamic branding options
    const fetchBranding = async () => {
      try {
        const snap = await getDoc(doc(db, COLLECTIONS.APP_SETTINGS, 'global_config'));
        if (snap.exists()) {
          const data = snap.data();
          setLogoText(data.logoText || 'Æ');
          setLogoLink(data.logoLink || '/');
          setLogoIconUrl(data.logoIconUrl || '');
          setLogoTitle(data.logoTitle || 'Aether');
          setHideCreatorDetails(data.hideCreatorDetails || false);
          setHideExistingPosts(data.hideExistingPosts || false);
          setExistingPostsCutoff(data.existingPostsCutoff || null);
        }
      } catch (err) {
        console.warn("Failed to load global config:", err);
      }
    };
    fetchBranding();
  }, []);

  useEffect(() => {
    setIsLoading(true);
    let unsubscribe: () => void = () => {};

    if (activeTab === 'reports') {
      const q = query(collection(db, COLLECTIONS.REPORTS), orderBy('timestamp', 'desc'));
      unsubscribe = onSnapshot(q, (snapshot) => {
        const docs = snapshot.docs.map(d => ({ ...d.data(), id: d.id } as Report));
        const unique = docs.filter((item, idx, self) => idx === self.findIndex(t => t.id === item.id));
        setReports(unique);
        setIsLoading(false);
      }, (error) => {
        handleFirestoreError(error, 'list', COLLECTIONS.REPORTS);
        setIsLoading(false);
      });
    } else if (activeTab === 'payments') {
      const q = query(collection(db, COLLECTIONS.PAYMENTS), orderBy('timestamp', 'desc'));
      unsubscribe = onSnapshot(q, (snapshot) => {
        const docs = snapshot.docs.map(d => ({ ...d.data(), id: d.id } as PaymentRequest));
        const unique = docs.filter((item, idx, self) => idx === self.findIndex(t => t.id === item.id));
        setPayments(unique);
        setIsLoading(false);
      }, (error) => {
        handleFirestoreError(error, 'list', COLLECTIONS.PAYMENTS);
        setIsLoading(false);
      });
    } else if (activeTab === 'upgrades') {
      const q = query(collection(db, COLLECTIONS.UPGRADE_REQUESTS), orderBy('timestamp', 'desc'));
      unsubscribe = onSnapshot(q, (snapshot) => {
        const docs = snapshot.docs.map(d => ({ ...d.data(), id: d.id }));
        const unique = docs.filter((item, idx, self) => idx === self.findIndex(t => t.id === item.id));
        setUpgrades(unique);
        setIsLoading(false);
      }, (error) => {
        handleFirestoreError(error, 'list', COLLECTIONS.UPGRADE_REQUESTS);
        setIsLoading(false);
      });
    } else if (activeTab === 'assets') {
      const q = query(collection(db, COLLECTIONS.IMAGES), orderBy('timestamp', 'desc'), limit(150));
      unsubscribe = onSnapshot(q, (snapshot) => {
        const docs = snapshot.docs.map(d => ({ ...d.data(), id: d.id } as Image));
        const unique = docs.filter((item, idx, self) => idx === self.findIndex(t => t.id === item.id));
        setAssets(unique);
        setIsLoading(false);
      }, (error) => {
        handleFirestoreError(error, 'list', COLLECTIONS.IMAGES);
        setIsLoading(false);
      });
    } else if (activeTab === 'users') {
      const q = query(collection(db, COLLECTIONS.USERS), limit(100));
      unsubscribe = onSnapshot(q, (snapshot) => {
        const docs = snapshot.docs.map(d => ({ ...d.data(), id: d.id }));
        const unique = docs.filter((item, idx, self) => item && item.id && idx === self.findIndex(t => t.id === item.id));
        setUsersList(unique);
        setIsLoading(false);
      }, (error) => {
        console.error("Failed to fetch users list registry:", error);
        setIsLoading(false);
      });
    } else {
      setIsLoading(false);
    }

    return () => unsubscribe();
  }, [activeTab]);

  const handleBulkImport = async () => {
    const urls = bulkUrls.split('\n').map(u => u.trim()).filter(Boolean);
    if (urls.length === 0) return;

    setIsBulkImporting(true);
    let successCount = 0;
    try {
      let currentBatch = writeBatch(db);
      
      for (const url of urls) {
        let meta = {
          title: bulkMasterTitle || 'Auto-added from Gallery',
          description: 'This asset was automatically imported via sanctuary sync.',
          category: 'Sanctuary Curation',
          tags: ['auto-sync', 'sanctuary', 'imported'],
          sceneContext: 'Content pending analysis'
        };

        const isVideo = !!url.match(/\.(mp4|webm|mov)$/i);
        let thumbUrl = url;

        if (isVideo) {
          try {
            // Seek to 10% for potentially clearer frame
            const captured = await captureVideoThumbnail(url, 0.1);
            if (captured) thumbUrl = captured;
          } catch (e) {
            console.warn("Thumbnail extraction fail for", url, e);
          }
        }

        if (runAiMagicOnBulk) {
          try {
            const aiResult = await analyzeFromTitle(bulkMasterTitle || url.split('/').pop() || 'Untitled');
            if (aiResult) {
              meta = {
                title: aiResult.title,
                description: aiResult.description,
                category: aiResult.category || meta.category,
                tags: [...meta.tags, ...aiResult.tags],
                sceneContext: aiResult.sceneContext
              };
            }
          } catch (e) {
            console.warn("AI Analysis failed for item in bulk:", e);
          }
        }

        const newRef = doc(collection(db, COLLECTIONS.IMAGES));
        currentBatch.set(newRef, {
          ...meta,
          url,
          thumbnailUrl: thumbUrl,
          type: isVideo ? 'video' : 'image',
          likes: 0,
          views: 0,
          saves: 0,
          isPremium: false,
          timestamp: serverTimestamp(),
          uploaderName: 'Sanctuary System',
          uploaderEmail: 'arjunjareda1355@gmail.com'
        });
        
        successCount++;
        // Limit batch size to 450 to be safe (Firestore limit is 500)
        if (successCount % 450 === 0) {
           await currentBatch.commit();
           currentBatch = writeBatch(db);
        }
      }
      
      await currentBatch.commit();
      alert(`Successfully imported ${successCount} assets.`);
      setBulkUrls('');
      setBulkMasterTitle('');
      setActiveTab('assets');
    } catch (e) {
      console.error(e);
      alert(`Bulk import failure. ${successCount} might have been synced.`);
    } finally {
      setIsBulkImporting(false);
    }
  };

  const handleSyncPostImg = async () => {
    const galleryUrl = galleryToSync || 'https://postimg.cc/gallery/Hx2kdY4';
    if (!galleryUrl.includes('postimg.cc')) {
      alert("Please provide a valid PostImg gallery URL.");
      return;
    }
    
    setBulkUrls('Initializing sanctuary bridge to PostImg...');
    setIsBulkImporting(true);
    
    try {
      // Using a JSON-P / CORS proxy for scraping
      const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(galleryUrl)}`;
      const response = await fetch(proxyUrl);
      const data = await response.json();
      const html = data.contents;
      
      // Improved PostImg extraction logic
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      
      // Strategy 1: Look for direct download links in data attributes or known patterns
      const images = Array.from(doc.querySelectorAll('img[src*="postimg.cc"]'));
      let directUrls = images.map(img => {
        const src = img.getAttribute('src') || '';
        // PostImg thumbs: i.postimg.cc/xxxx/thumb.jpg -> i.postimg.cc/xxxx/image.jpg
        // Usually thumbnail is /t/xxxx/yyyy.jpg or has _t in it
        return src.replace('/t/', '/').replace('/thumb/', '/').replace(/_t\.([a-z]+)$/i, '.$1');
      }).filter(u => u.includes('i.postimg.cc'));

      // Strategy 2: Regex fallback for the entire HTML
      if (directUrls.length === 0) {
        const matches = html.matchAll(/https:\/\/i\.postimg\.cc\/[a-zA-Z0-9]+\/[a-zA-Z0-9_-]+\.(jpg|png|jpeg|webp)/g);
        directUrls = [...new Set([...matches].map(m => m[0]))];
      }

      if (directUrls.length > 0) {
        setBulkUrls(directUrls.join('\n'));
        alert(`Discovered ${directUrls.length} vessels in the aether. Click 'Perform Bulk Inscription' to finalize.`);
      } else {
        alert("Could not extract links from this sanctuary. Please check if the gallery is public.");
        setBulkUrls('');
      }
    } catch (e) {
      console.error(e);
      alert('Sanctuary bridge interrupted. PostImg might be protected or the proxy is down.');
      setBulkUrls('');
    } finally {
      setIsBulkImporting(false);
    }
  };

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

  const handleUpgradeAction = async (requestId: string, action: 'delete' | 'resolve') => {
    try {
      console.log(`Performing ${action} on request:`, requestId);
      if (action === 'delete') {
        if (!window.confirm("Delete this request record?")) return;
        await deleteDoc(doc(db, COLLECTIONS.UPGRADE_REQUESTS, requestId));
      } else {
        await updateDoc(doc(db, COLLECTIONS.UPGRADE_REQUESTS, requestId), { status: 'resolved' });
      }
      alert(`Request ${action === 'delete' ? 'deleted' : 'marked as resolved'}.`);
    } catch (error) {
      console.error("Upgrade Action Failure:", error);
      try {
        handleFirestoreError(error, 'write', COLLECTIONS.UPGRADE_REQUESTS);
      } catch (e: any) {
        alert("Action failed: " + (e.message || "Permissions error"));
      }
    }
  };

  const handleBulkDelete = async () => {
    if (selectedAssetIds.size === 0) return;
    if (!window.confirm(`Are you sure you want to delete ${selectedAssetIds.size} assets permanently?`)) return;

    setIsLoading(true);
    try {
      console.log(`Initiating bulk purge of ${selectedAssetIds.size} assets...`);
      const batch = writeBatch(db);
      selectedAssetIds.forEach(id => {
        batch.delete(doc(db, COLLECTIONS.IMAGES, id));
      });
      await batch.commit();
      setSelectedAssetIds(new Set());
      alert("Selected assets deleted successfully from the sanctuary.");
    } catch (error) {
      console.error("Bulk Delete Failure:", error);
      try {
        handleFirestoreError(error, 'write', COLLECTIONS.IMAGES);
      } catch (e: any) {
        alert("Bulk delete failed: " + (e.message || "Unknown error"));
      }
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
      alert(`Asset ${action === 'delete' ? 'deleted' : 'report cleared'}.`);
    } catch (error) { 
      console.error(error); 
      try {
        handleFirestoreError(error, 'write', COLLECTIONS.IMAGES);
      } catch (e: any) {
        alert("Operation failed: " + (e.message || "Permissions error"));
      }
    }
  };

  const handlePaymentAction = async (paymentId: string, userId: string, action: 'approve' | 'reject' | 'delete') => {
    try {
      if (action === 'delete') {
        if (!window.confirm("Are you sure you want to delete this payment record permanently?")) return;
        await deleteDoc(doc(db, COLLECTIONS.PAYMENTS, paymentId));
        alert("Payment record deleted.");
        return;
      }

      if (!userId) {
        throw new Error("No Resident User ID linked with this payment proof.");
      }

      const userDocRef = doc(db, COLLECTIONS.USERS, userId);
      const userSnap = await getDoc(userDocRef);
      const batch = writeBatch(db);

      if (action === 'approve') {
        if (!userSnap.exists()) {
          batch.set(userDocRef, {
            uid: userId,
            isPremium: true,
            isPremiumPending: false,
            subscriptionPlan: 'Divine Curator',
            createdAt: serverTimestamp()
          }, { merge: true });
        } else {
          batch.update(userDocRef, { 
            isPremium: true, 
            isPremiumPending: false 
          });
        }
        batch.update(doc(db, COLLECTIONS.PAYMENTS, paymentId), { status: 'approved' });
      } else {
        if (userSnap.exists()) {
          batch.update(userDocRef, { isPremiumPending: false });
        }
        batch.update(doc(db, COLLECTIONS.PAYMENTS, paymentId), { status: 'rejected' });
      }
      await batch.commit();
      alert(`Payment ${action}d successfully.`);
    } catch (error: any) {
      console.error(error);
      alert("Operation failed: " + (error.message || "Please check your network and permissions."));
    }
  };

  const uniqueAssets = useMemo(() => {
    const seen = new Set<string>();
    return assets.filter((img) => {
      if (!img || !img.id || seen.has(img.id)) return false;
      seen.add(img.id);
      return true;
    });
  }, [assets]);

  const filteredAssets = useMemo(() => {
    return uniqueAssets.filter(a => 
      a.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      a.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [uniqueAssets, searchQuery]);

  const uniqueReports = useMemo(() => {
    const seen = new Set<string>();
    return reports.filter((item) => {
      if (!item || !item.id || seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });
  }, [reports]);

  const uniquePayments = useMemo(() => {
    const seen = new Set<string>();
    return payments.filter((item) => {
      if (!item || !item.id || seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });
  }, [payments]);

  const uniqueUpgrades = useMemo(() => {
    const seen = new Set<string>();
    return upgrades.filter((item) => {
      if (!item || !item.id || seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });
  }, [upgrades]);

  const handleSearchUserByEmail = async (emailToSearch: string) => {
    if (!emailToSearch.trim()) return;
    setIsFetchingUser(true);
    try {
      const emailLower = emailToSearch.trim().toLowerCase();
      const q = query(collection(db, COLLECTIONS.USERS), where('email', '==', emailLower));
      const snap = await getDocs(q);
      
      if (!snap.empty) {
        const docSnap = snap.docs[0];
        const data = docSnap.data();
        setSelectedUser({ ...data, id: docSnap.id });
        setCustomPlanValue(data.subscriptionPlan || 'Divine Curator');
      } else {
        // Offer pre-grant
        setSelectedUser({
          id: `pregrant_${emailLower.replace(/[^a-zA-Z0-9]/g, '_')}`,
          email: emailLower,
          displayName: 'Pre-granted Sanctuary Resident',
          isPregrant: true,
          isPremium: false,
          isAdmin: false,
          isBanned: false,
          isHold: false
        });
        setCustomPlanValue('Divine Curator');
      }
    } catch (e: any) {
      console.error("Failed to query user:", e);
      alert("Aether Protocol: User lookup failed: " + e.message);
    } finally {
      setIsFetchingUser(false);
    }
  };

  const handleSaveUserPermissions = async (userToUpdate: any) => {
    try {
      setIsLoading(true);
      const emailLower = userToUpdate.email.toLowerCase();
      
      if (userToUpdate.isPregrant) {
        const customId = `pregrant_${emailLower.replace(/[^a-zA-Z0-9]/g, '_')}`;
        const docRef = doc(db, COLLECTIONS.USERS, customId);
        await setDoc(docRef, {
          uid: customId,
          email: emailLower,
          displayName: 'Pre-granted Sanctuary Resident',
          isPremium: userToUpdate.isPremium,
          subscriptionPlan: userToUpdate.isPremium ? (customPlanValue || 'Divine Curator') : null,
          isAdmin: userToUpdate.isAdmin,
          isBanned: userToUpdate.isBanned,
          isHold: userToUpdate.isHold,
          isPregranted: true,
          createdAt: serverTimestamp()
        });
        alert(`Aether Protocol: Pre-grant status created successfully for ${emailLower}.`);
      } else {
        const targetUserId = userToUpdate.id || userToUpdate.uid || userToUpdate.userId;
        const docRef = doc(db, COLLECTIONS.USERS, targetUserId);
        await updateDoc(docRef, {
          isPremium: userToUpdate.isPremium,
          subscriptionPlan: userToUpdate.isPremium ? (customPlanValue || 'Divine Curator') : null,
          isAdmin: userToUpdate.isAdmin,
          isBanned: userToUpdate.isBanned,
          isBannedText: userToUpdate.isBanned ? 'Standard declassification' : null,
          isHold: userToUpdate.isHold
        });
        alert(`Aether Protocol: Resident rules updated successfully for ${emailLower}.`);
      }
      setSelectedUser(null);
      setEditUserEmail('');
    } catch (e: any) {
      console.error("Failed to save rules:", e);
      alert("Aether Protocol: Permissions adjustment failed: " + e.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveBranding = async () => {
    try {
      setSavingBranding(true);
      
      // Determine cutoff: if hideExistingPosts is enabled, set it to current timestamp if not set
      let finalCutoff = existingPostsCutoff;
      if (hideExistingPosts && !finalCutoff) {
        finalCutoff = Date.now();
      } else if (!hideExistingPosts) {
        finalCutoff = null;
      }

      await setDoc(doc(db, COLLECTIONS.APP_SETTINGS, 'global_config'), {
        logoText: logoText.trim(),
        logoLink: logoLink.trim(),
        logoIconUrl: logoIconUrl.trim(),
        logoTitle: logoTitle.trim(),
        hideCreatorDetails,
        hideExistingPosts,
        existingPostsCutoff: finalCutoff,
        updatedAt: serverTimestamp()
      }, { merge: true });
      
      setExistingPostsCutoff(finalCutoff);
      alert("Aether Protocol: Cosmic branding and privacy policy configurations have been saved successfully.");
    } catch (e: any) {
      console.error("Failed to save branding config:", e);
      alert("Aether Protocol: Configuration save failed: " + e.message);
    } finally {
      setSavingBranding(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg-dark pt-28 md:pt-36 px-4 md:px-8 pb-12 space-y-8 max-w-[1700px] mx-auto">
      {/* Mini Header / Navigation */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 sticky top-[60px] z-40 bg-bg-dark/95 backdrop-blur-3xl py-4 border-b border-border-dark">
        <div className="flex items-center gap-4">
          <Link to="/" className="p-2.5 bg-white/[0.03] border border-white/5 hover:bg-white/10 rounded-xl transition-all text-text-dim hover:text-text-main group">
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          </Link>
          <div>
            <h1 className="text-lg font-display font-black tracking-tight text-text-main uppercase flex items-center gap-2.5">
              <Shield className="w-4 h-4 text-brand-primary" /> Registry <span className="text-brand-primary">Control</span>
            </h1>
            <p className="text-[8px] font-black uppercase tracking-[0.2em] text-text-dim/30 mt-0.5">Authorized Level 7</p>
          </div>
        </div>

        <div className="flex bg-text-main/[0.01] p-1 rounded-xl border border-border-dark overflow-x-auto no-scrollbar">
          {(['reports', 'payments', 'assets', 'upgrades', 'bulk', 'users', 'branding'] as const).map((tab) => (
            <button 
              key={`admin-tab-${tab}`}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap flex items-center gap-2",
                activeTab === tab ? "bg-brand-primary text-bg-dark shadow-md" : "text-text-dim/60 hover:text-text-main hover:bg-text-main/[0.05]"
              )}
            >
              <span className="inline-block md:inline">{tab === 'upgrades' ? 'Requests' : tab === 'users' ? 'USERS' : tab === 'branding' ? 'BRANDING' : tab.toUpperCase()}</span>
              {tab === 'reports' && reports.length > 0 && (
                <span className={cn("px-1 py-0.5 rounded text-[7px] font-bold", activeTab === tab ? "bg-bg-dark/10" : "bg-red-500/20 text-red-500")}>
                  {reports.length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
        {activeTab === 'assets' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2 relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-dim group-focus-within:text-brand-primary transition-colors" />
                <input 
                  type="text" 
                  placeholder="Filter by Signature, Title, or Category..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white/5 border border-white/5 rounded-2xl pl-12 pr-4 py-3.5 text-[10px] font-black uppercase tracking-widest focus:outline-none focus:border-brand-primary/30 transition-all text-text-main placeholder:text-text-dim/30"
                />
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={selectAllAssets}
                  className="flex-1 px-4 py-3.5 bg-white/5 border border-white/5 rounded-2xl text-[9px] font-black uppercase tracking-widest hover:bg-white/10 transition-all text-text-dim hover:text-white"
                >
                  {selectedAssetIds.size === filteredAssets.length ? 'Clear All' : 'Select All'}
                </button>
                <button 
                  disabled={selectedAssetIds.size === 0 || isLoading}
                  onClick={handleBulkDelete}
                  className="flex-1 px-4 py-3.5 bg-red-500/10 border border-red-500/20 text-red-500 rounded-2xl text-[9px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all disabled:opacity-30 disabled:grayscale"
                >
                  Delete {selectedAssetIds.size > 0 && `(${selectedAssetIds.size})`}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12 gap-2">
              {filteredAssets.map((asset, i) => (
                <div 
                  key={`asset-${asset.id || i}-${i}`} 
                  onClick={() => toggleAssetSelection(asset.id)}
                  className={cn(
                    "relative aspect-square rounded-xl overflow-hidden group cursor-pointer border transition-all duration-300",
                    selectedAssetIds.has(asset.id) ? "border-brand-primary scale-95 ring-4 ring-brand-primary/10" : "border-white/5 hover:border-white/20"
                  )}
                >
                  <img src={asset.url} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-all duration-500" alt={asset.title} referrerPolicy="no-referrer" />
                  {selectedAssetIds.has(asset.id) && (
                    <div className="absolute inset-0 bg-brand-primary/20 backdrop-blur-[2px] flex items-center justify-center">
                      <CheckCircle className="w-6 h-6 text-brand-primary drop-shadow-lg" />
                    </div>
                  )}
                  <div className="absolute bottom-0 left-0 right-0 p-1 bg-bg-dark/60 backdrop-blur-md translate-y-full group-hover:translate-y-0 transition-transform">
                     <p className="text-[6px] font-black uppercase tracking-tighter truncate text-text-main/60">{asset.title}</p>
                  </div>
                </div>
              ))}
            </div>
            {filteredAssets.length === 0 && !isLoading && (
              <div className="text-center py-32 rounded-[40px] bg-text-main/[0.02] border border-border-dark">
                <ImageIcon className="w-12 h-12 text-text-dim/5 mx-auto mb-4" />
                <p className="text-text-dim text-[10px] font-black uppercase tracking-[0.3em]">The Registry is Clear</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'bulk' && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="bg-card-dark border border-white/5 rounded-[40px] p-8 md:p-12 space-y-10 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
                <Sparkles className="w-64 h-64 text-brand-primary" />
              </div>

              <div className="space-y-2 relative z-10">
                <h3 className="text-2xl font-display font-black tracking-tight text-text-main uppercase">Sanctuary <span className="text-brand-primary">Inbound</span></h3>
                <p className="text-text-dim text-[10px] font-black uppercase tracking-[0.2em]">Universal Multi-Asset Sync Engine</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10 transition-all">
                <div className="space-y-6">
                  <div className="group space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-text-dim ml-1 group-focus-within:text-brand-primary transition-colors">Manifest Title</label>
                    <input 
                      type="text"
                      value={bulkMasterTitle}
                      onChange={(e) => setBulkMasterTitle(e.target.value)}
                      placeholder="Title for all vessels..."
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-xs font-bold focus:outline-none focus:border-brand-primary transition-all text-text-main placeholder:text-text-dim/30"
                    />
                  </div>

                  <button 
                    onClick={() => setRunAiMagicOnBulk(!runAiMagicOnBulk)}
                    className={cn(
                      "w-full h-16 rounded-2xl border flex items-center justify-between px-6 transition-all group",
                      runAiMagicOnBulk 
                        ? "bg-brand-primary text-black border-brand-primary shadow-xl shadow-brand-primary/20" 
                        : "bg-white/5 border-white/10 text-text-dim hover:text-white"
                    )}
                  >
                    <div className="flex items-center gap-4">
                      <Wand2 className={cn("w-5 h-5", runAiMagicOnBulk && "animate-pulse")} />
                      <span className="text-xs font-black uppercase tracking-[0.2em]">Augment with AI Magic</span>
                    </div>
                    <div className={cn("w-5 h-5 rounded-full border-2 transition-all", runAiMagicOnBulk ? "bg-black border-black" : "border-white/20")} />
                  </button>

                  <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/5 space-y-4">
                     <p className="text-[9px] font-black uppercase tracking-widest text-text-dim">External Sanctuary Bridge</p>
                     <div className="flex gap-2">
                        <input 
                          type="text"
                          value={galleryToSync}
                          onChange={(e) => setGalleryToSync(e.target.value)}
                          placeholder="PostImg Gallery URL..."
                          className="flex-1 bg-bg-dark/40 border border-white/5 rounded-xl px-4 py-3 text-[10px] focus:outline-none focus:border-brand-primary/50 transition-all text-text-main placeholder:text-text-dim/30"
                        />
                        <button 
                          onClick={handleSyncPostImg}
                          disabled={isBulkImporting}
                          className="px-4 bg-brand-primary/10 text-brand-primary rounded-xl border border-brand-primary/20 hover:bg-brand-primary/20 transition-all font-black uppercase tracking-widest text-[8px]"
                        >
                          Discover
                        </button>
                     </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-text-dim ml-1">Asset Transmissions (URLs)</label>
                    <textarea 
                      rows={10}
                      value={bulkUrls}
                      onChange={(e) => setBulkUrls(e.target.value)}
                      placeholder="One URL per line..."
                      className="w-full h-[260px] bg-bg-dark/40 border border-white/10 rounded-3xl p-6 text-xs font-mono focus:outline-none focus:border-brand-primary transition-all text-text-main placeholder:text-text-dim/30 resize-none shadow-inner"
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 pt-6">
                  <button 
                    onClick={() => { setBulkUrls(''); setBulkMasterTitle(''); }}
                    className="flex-1 py-4 bg-white/5 hover:bg-white/10 border border-white/5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all text-text-dim hover:text-white"
                  >
                    Clear Manifest
                  </button>
                  <button 
                    onClick={handleBulkImport}
                    disabled={isBulkImporting || !bulkUrls.trim()}
                    className="flex-[2] py-4 bg-brand-primary text-black rounded-2xl text-xs font-black uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-3 shadow-2xl shadow-brand-primary/20"
                  >
                    {isBulkImporting ? (
                      <>
                        <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin"></div>
                        <span>Synchronizing Sanctuary...</span>
                      </>
                    ) : (
                      <>
                        <Zap className="w-5 h-5 fill-current" />
                        Initiate Bulk Inscription
                      </>
                    )}
                  </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'reports' && (
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-4">
            {uniqueReports.map((report, idx) => (
              <div key={`report-${report.id || idx}-${idx}`} className="bg-card-dark border border-border-dark rounded-3xl p-3 flex flex-col gap-3 group hover:border-red-500/30 transition-all shadow-xl">
                <div className="aspect-square rounded-2xl overflow-hidden bg-bg-dark/40 relative">
                  <img src={report.imageUrl} referrerPolicy="no-referrer" className="w-full h-full object-cover transition-all duration-700 group-hover:scale-110" alt="Reported" />
                  <div className="absolute top-2 left-2 px-2 py-1 bg-red-500/90 backdrop-blur-md text-white text-[8px] font-black uppercase tracking-widest rounded-lg">
                    {report.type}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleAction(report.id, report.imageId, 'ignore')} className="flex-1 py-2 bg-text-main/[0.05] hover:bg-text-main/[0.1] rounded-xl text-text-dim hover:text-text-main transition-all text-[8px] font-black uppercase border border-border-dark">Pardon</button>
                  <button onClick={() => handleAction(report.id, report.imageId, 'delete')} className="flex-1 py-2 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition-all text-[8px] font-black uppercase border border-red-500/20">Purge</button>
                </div>
              </div>
            ))}
            {reports.length === 0 && !isLoading && (
              <div className="col-span-full py-32 text-center bg-text-main/[0.02] border border-border-dark rounded-[40px]">
                <CheckCircle className="w-12 h-12 text-brand-primary/20 mx-auto mb-4" />
                <p className="text-text-dim text-[10px] font-black uppercase tracking-widest">Sanctuary Peace Maintained</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'payments' && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {uniquePayments.map((payment, idx) => (
              <div key={`payment-${payment.id || idx}-${idx}`} className="bg-card-dark border border-white/5 rounded-3xl p-4 flex flex-col gap-4 group hover:border-amber-500/30 transition-all">
                <div className="aspect-[3/4] rounded-2xl overflow-hidden bg-bg-dark relative border border-white/5 cursor-zoom-in group" onClick={() => window.open(payment.screenshotUrl, '_blank')}>
                   <img src={payment.screenshotUrl} referrerPolicy="no-referrer" className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-all duration-700 group-hover:scale-105" alt="Evidence" />
                   <div className="absolute inset-x-2 bottom-2 p-2 bg-bg-dark/60 backdrop-blur-xl rounded-xl text-center">
                     <p className="text-[10px] font-black text-amber-500">₹{payment.plan}</p>
                   </div>
                </div>
                
                <div className="space-y-1">
                  <p className="text-[10px] text-text-main font-black uppercase tracking-widest truncate">{payment.userEmail.split('@')[0]}</p>
                  <div className={cn(
                    "inline-block px-2 py-0.5 rounded-full text-[7px] font-black uppercase tracking-widest border", 
                    payment.status === 'pending' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : payment.status === 'approved' ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'
                  )}>
                    {payment.status}
                  </div>
                </div>

                <div className="flex gap-2">
                  {payment.status === 'pending' ? (
                    <>
                      <button onClick={() => handlePaymentAction(payment.id, payment.userId, 'reject')} className="flex-1 py-2.5 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition-all text-[8px] font-black uppercase border border-red-500/20">Deny</button>
                      <button onClick={() => handlePaymentAction(payment.id, payment.userId, 'approve')} className="flex-1 py-2.5 bg-brand-primary text-black rounded-xl transition-all text-[8px] font-black uppercase shadow-lg shadow-brand-primary/20">Verify</button>
                    </>
                  ) : (
                    <button onClick={() => handlePaymentAction(payment.id, payment.userId, 'delete')} className="flex-1 py-2.5 bg-white/5 text-text-dim hover:text-red-500 rounded-xl transition-all text-[8px] font-black uppercase ring-1 ring-white/5 border border-white/5">Flush Record</button>
                  )}
                </div>
              </div>
            ))}
            {payments.length === 0 && !isLoading && (
              <div className="col-span-full py-32 text-center bg-white/[0.02] border border-white/5 rounded-[40px]">
                <CreditCard className="w-12 h-12 text-white/5 mx-auto mb-4" />
                <p className="text-text-dim text-[10px] font-black uppercase tracking-widest">No Evidence to Process</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'upgrades' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {uniqueUpgrades.map((req, idx) => (
              <div key={`upgrade-${req.id || idx}-${idx}`} className="bg-card-dark border border-border-dark rounded-[32px] p-8 flex flex-col gap-6 hover:border-brand-primary/30 transition-all group">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white/20 group-hover:text-brand-primary transition-colors"><MessageSquare className="w-6 h-6" /></div>
                    <div>
                      <p className="text-sm font-black uppercase tracking-tight text-text-main leading-none">{req.fullName || 'Unknown Vessel'}</p>
                      <p className="text-[8px] text-text-dim uppercase tracking-[0.2em] mt-1.5 font-black">{formatDate(req.timestamp)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={cn("px-2.5 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border", req.status === 'pending' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : 'bg-green-500/10 text-green-500 border-green-500/20')}> {req.status} </span>
                    <button onClick={() => handleUpgradeAction(req.id, 'delete')} className="p-2 text-white/10 hover:text-red-500 transition-colors bg-white/5 rounded-full"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
                
                <div className="p-5 bg-bg-dark/40 rounded-2xl border border-white/5 italic">
                  <p className="text-[12px] text-text-dim leading-relaxed">"{req.details || 'Telemetric silence...'}"</p>
                </div>
                
                <div className="flex gap-4 items-center">
                   <div className="flex-1 h-[1px] bg-white/5" />
                   <div className="p-2 rounded-full border border-white/5 bg-white/[0.02]">
                     <Sparkles className="w-3 h-3 text-brand-primary/40" />
                   </div>
                   <div className="flex-1 h-[1px] bg-white/5" />
                </div>

                {req.status === 'pending' && (
                  <button 
                    onClick={() => handleUpgradeAction(req.id, 'resolve')}
                    className="w-full py-4 bg-white text-bg-dark rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:scale-[1.01] active:scale-[0.98] transition-all shadow-xl"
                  >
                    Mark as Sanctuary-Resolved
                  </button>
                )}
              </div>
            ))}
            {upgrades.length === 0 && !isLoading && (
              <div className="col-span-full py-32 text-center bg-white/[0.02] border border-white/5 rounded-[40px]">
                <MessageSquare className="w-12 h-12 text-white/5 mx-auto mb-4" />
                <p className="text-text-dim text-[10px] font-black uppercase tracking-widest">The Sanctuary Silence is Golden</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'users' && (
          <div className="space-y-8 max-w-4xl mx-auto">
            {/* Search and pre-grant input */}
            <div className="bg-card-dark border border-white/5 rounded-[40px] p-6 sm:p-8 space-y-6 shadow-2xl relative overflow-hidden">
              <div className="space-y-1">
                <h3 className="text-xl font-display font-black tracking-tight text-text-main uppercase">
                  Resident Account <span className="text-brand-primary font-bold">Curation</span>
                </h3>
                <p className="text-text-dim text-[8px] font-black uppercase tracking-[0.2em]">
                  Elevate, declassify, suspend, or promote any email inside the sanctuary
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1 group">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-dim group-focus-within:text-brand-primary transition-colors" />
                  <input 
                    type="email" 
                    placeholder="Enter email address..." 
                    value={editUserEmail}
                    onChange={(e) => setEditUserEmail(e.target.value)}
                    className="w-full bg-white/5 border border-white/5 rounded-2xl pl-12 pr-4 py-3.5 text-xs text-text-main placeholder:text-text-dim/30 focus:outline-none focus:border-brand-primary/40 transition-all font-medium"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSearchUserByEmail(editUserEmail);
                    }}
                  />
                </div>
                <button 
                  disabled={isFetchingUser || !editUserEmail.trim()}
                  onClick={() => handleSearchUserByEmail(editUserEmail)}
                  className="px-6 py-3.5 bg-brand-primary text-bg-dark rounded-2xl text-[10px] font-black uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-30 disabled:scale-100 flex items-center justify-center gap-2 font-bold"
                >
                  {isFetchingUser ? 'Searching...' : 'Retrieve Profile'}
                </button>
              </div>

              {/* Edit Panel for Selected User */}
              {selectedUser && (
                <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/5 space-y-6 animate-in slide-in-from-top-4 duration-300">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-white/5">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black uppercase tracking-tight text-white">{selectedUser.displayName || 'Unnamed Resident'}</span>
                        {selectedUser.isPregrant && (
                          <span className="px-2 py-0.5 bg-pink-500/10 text-pink-400 border border-pink-500/10 rounded-full text-[7px] font-black uppercase tracking-widest">Pre-Grant</span>
                        )}
                      </div>
                      <p className="text-[10px] text-brand-primary select-all mt-0.5">{selectedUser.email}</p>
                    </div>
                    
                    <div className="flex flex-wrap gap-1.5">
                      {selectedUser.isAdmin && <span className="px-2 py-0.5 bg-red-500/10 text-red-500 border border-red-500/10 rounded-full text-[7px] font-black tracking-widest uppercase">Owner</span>}
                      {selectedUser.isPremium && <span className="px-2 py-0.5 bg-brand-primary/10 text-brand-primary border border-brand-primary/15 rounded-full text-[7px] font-black tracking-widest uppercase">{customPlanValue || 'Pro'}</span>}
                      {selectedUser.isBanned && <span className="px-2 py-0.5 bg-red-500/20 text-red-400 border border-red-500/25 rounded-full text-[7px] font-black tracking-widest uppercase">Banned</span>}
                      {selectedUser.isHold && <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-500 border border-yellow-500/25 rounded-full text-[7px] font-black tracking-widest uppercase">Held</span>}
                      {!selectedUser.isAdmin && !selectedUser.isPremium && !selectedUser.isBanned && !selectedUser.isHold && (
                        <span className="px-2 py-0.5 bg-white/5 text-text-dim rounded-full text-[7px] font-black tracking-widest uppercase">Voyager</span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Column 1: Roles & Status */}
                    <div className="space-y-4">
                      <p className="text-[9px] font-black uppercase tracking-widest text-text-dim/60">Privileges & Authorization</p>
                      
                      {/* Premium Toggle */}
                      <button 
                        onClick={() => setSelectedUser(prev => ({ ...prev, isPremium: !prev ? false : !prev.isPremium }))}
                        className={cn(
                          "w-full p-4 rounded-2xl border flex items-center justify-between text-left transition-all",
                          selectedUser.isPremium 
                            ? "bg-brand-primary/10 border-brand-primary/30 text-brand-primary" 
                            : "bg-white/[0.01] border-white/5 text-text-dim hover:text-white"
                        )}
                      >
                        <div className="space-y-1">
                          <p className="text-xs font-black uppercase tracking-widest select-none">Divine Curator (Pro Tier)</p>
                          <p className="text-[8px] opacity-60">Grant supreme curation credentials and view limit-free premium uploads</p>
                        </div>
                        <div className={cn("w-5 h-5 rounded-full border flex items-center justify-center transition-all", selectedUser.isPremium ? "border-brand-primary bg-brand-primary" : "border-white/25")}>
                          {selectedUser.isPremium && <CheckCircle className="w-3.5 h-3.5 text-bg-dark stroke-[3]" />}
                        </div>
                      </button>

                      {/* Admin Toggle */}
                      <button 
                        onClick={() => setSelectedUser(prev => ({ ...prev, isAdmin: !prev ? false : !prev.isAdmin }))}
                        className={cn(
                          "w-full p-4 rounded-2xl border flex items-center justify-between text-left transition-all",
                          selectedUser.isAdmin
                            ? "bg-red-500/10 border-red-500/30 text-red-500" 
                            : "bg-white/[0.01] border-white/5 text-text-dim hover:text-white"
                        )}
                      >
                        <div className="space-y-1">
                          <p className="text-xs font-black uppercase tracking-widest select-none">Sanctuary Owner/Admin</p>
                          <p className="text-[8px] opacity-60">Grant complete declassification, bulk purge access and Level 7 Control panel power</p>
                        </div>
                        <div className={cn("w-5 h-5 rounded-full border flex items-center justify-center transition-all", selectedUser.isAdmin ? "border-red-500 bg-red-500" : "border-white/25")}>
                          {selectedUser.isAdmin && <CheckCircle className="w-3.5 h-3.5 text-white stroke-[3]" />}
                        </div>
                      </button>
                    </div>

                    {/* Column 2: Lock & Account limits */}
                    <div className="space-y-4">
                      <p className="text-[9px] font-black uppercase tracking-widest text-text-dim/60">Sanctuary Account Status</p>
                      
                      {/* Interactive Radio Group */}
                      <div className="grid grid-cols-3 gap-2">
                        {/* Status: Active */}
                        <button 
                          type="button"
                          onClick={() => setSelectedUser(prev => (prev ? { ...prev, isBanned: false, isHold: false } : null))}
                          className={cn(
                            "p-4 rounded-2xl border flex flex-col items-center justify-center text-center gap-2 transition-all",
                            !selectedUser.isBanned && !selectedUser.isHold
                              ? "bg-green-500/10 border-green-500/30 text-green-500"
                              : "bg-white/[0.01] border-white/5 text-text-dim/60 hover:text-text-main"
                          )}
                        >
                          <UserCheck className="w-4 h-4" />
                          <span className="text-[8px] font-black uppercase tracking-wider">Active</span>
                        </button>

                        {/* Status: Hold */}
                        <button 
                          type="button"
                          onClick={() => setSelectedUser(prev => (prev ? { ...prev, isBanned: false, isHold: true } : null))}
                          className={cn(
                            "p-4 rounded-2xl border flex flex-col items-center justify-center text-center gap-2 transition-all",
                            selectedUser.isHold
                              ? "bg-yellow-500/10 border-yellow-500/30 text-yellow-500"
                              : "bg-white/[0.01] border-white/5 text-text-dim/60 hover:text-text-main"
                          )}
                        >
                          <UserMinus className="w-4 h-4" />
                          <span className="text-[8px] font-black uppercase tracking-wider">Hold</span>
                        </button>

                        {/* Status: Banned */}
                        <button 
                          type="button"
                          onClick={() => setSelectedUser(prev => (prev ? { ...prev, isBanned: true, isHold: false } : null))}
                          className={cn(
                            "p-4 rounded-2xl border flex flex-col items-center justify-center text-center gap-2 transition-all",
                            selectedUser.isBanned
                              ? "bg-red-500/10 border-red-500/30 text-red-400"
                              : "bg-white/[0.01] border-white/5 text-text-dim/60 hover:text-text-main"
                          )}
                        >
                          <UserX className="w-4 h-4" />
                          <span className="text-[8px] font-black uppercase tracking-wider">Ban</span>
                        </button>
                      </div>

                      {/* Custom select text input for Pro Plan Name if user is premium */}
                      {selectedUser.isPremium && (
                        <div className="p-4 rounded-2xl border border-white/5 bg-white/[0.01] space-y-2">
                          <label className="text-[8px] font-black uppercase tracking-widest text-text-dim">Pro Subscription Designation</label>
                          <input 
                            type="text" 
                            placeholder="Divine Curator / Curator Pro..." 
                            value={customPlanValue}
                            onChange={(e) => setCustomPlanValue(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-text-main focus:outline-none focus:border-brand-primary"
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4 border-t border-white/5">
                    <button 
                      onClick={() => { setSelectedUser(null); setEditUserEmail(''); }}
                      className="flex-1 py-3.5 bg-white/5 hover:bg-white/10 border border-white/5 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all text-text-dim hover:text-white"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={() => handleSaveUserPermissions(selectedUser)}
                      className="flex-[2] py-3.5 bg-brand-primary text-bg-dark rounded-2xl text-[10px] font-black uppercase tracking-widest hover:scale-[1.01] active:scale-[0.98] transition-all flex items-center justify-center gap-2 font-bold"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Commit Sanctuary Adjustments
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* List of registered users */}
            <div className="bg-card-dark border border-white/5 rounded-[40px] p-6 sm:p-8 space-y-6 shadow-2xl relative overflow-hidden">
               <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                     <h3 className="text-sm font-black uppercase tracking-wider text-text-main">
                        Local Registry Directory
                     </h3>
                     <p className="text-[8px] text-text-dim uppercase tracking-[0.2em]">Registered inhabitants inside the grid stream</p>
                  </div>
                  <div className="relative group">
                     <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-text-dim group-focus-within:text-brand-primary transition-colors" />
                     <input 
                        type="text"
                        placeholder="Search loaded residents..."
                        value={usersSearchQuery}
                        onChange={(e) => setUsersSearchQuery(e.target.value)}
                        className="bg-white/5 border border-white/5 rounded-xl pl-9 pr-4 py-2 text-[10px] focus:outline-none focus:border-brand-primary transition-all text-text-main uppercase tracking-wider font-semibold placeholder:text-text-dim/20"
                     />
                  </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[460px] overflow-y-auto pr-1 no-scrollbar col-span-full">
                  {usersList
                    .filter(u => !usersSearchQuery || (u.email && u.email.toLowerCase().includes(usersSearchQuery.toLowerCase())) || (u.displayName && u.displayName.toLowerCase().includes(usersSearchQuery.toLowerCase())))
                    .map((item, i) => (
                       <div 
                         key={`user-${item.id || i}-${i}`} 
                         onClick={() => {
                           setEditUserEmail(item.email || '');
                           handleSearchUserByEmail(item.email || '');
                         }}
                         className={cn(
                           "p-4 bg-white/[0.01] hover:bg-white/[0.04] border border-white/5 rounded-2xl flex items-center justify-between gap-4 cursor-pointer transition-all group",
                           selectedUser && selectedUser.email === item.email && "border-brand-primary/30 bg-brand-primary/[0.02]"
                         )}
                       >
                         <div className="flex items-center gap-3 min-w-0">
                           <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                             {item.photoURL ? (
                               <img src={item.photoURL} alt="" className="w-full h-full object-cover rounded-xl" referrerPolicy="no-referrer" />
                             ) : (
                               <Users className="w-4 h-4 text-text-dim/40 group-hover:text-brand-primary transition-colors" />
                             )}
                           </div>
                           <div className="min-w-0">
                             <p className="text-xs font-black uppercase tracking-tight text-white/90 truncate">{item.displayName || 'Unnamed Resident'}</p>
                             <p className="text-[8px] text-text-dim/60 truncate mt-0.5">{item.email}</p>
                           </div>
                         </div>

                         <div className="flex items-center gap-1.5 shrink-0">
                           {item.isAdmin && (
                             <span className="px-1.5 py-0.5 bg-red-500/10 text-red-500 border border-red-500/10 rounded-md text-[6px] font-black uppercase tracking-widest">Admin</span>
                           )}
                           {item.isPremium && (
                             <span className="px-1.5 py-0.5 bg-brand-primary/10 text-brand-primary border border-brand-primary/15 rounded-md text-[6px] font-black uppercase tracking-widest">Pro</span>
                           )}
                           {item.isBanned && (
                             <span className="px-1.5 py-0.5 bg-red-500/20 text-red-400 border border-red-500/25 rounded-md text-[6px] font-black uppercase tracking-widest">Banned</span>
                           )}
                           {item.isHold && (
                             <span className="px-1.5 py-0.5 bg-yellow-500/20 text-yellow-500 border border-yellow-500/25 rounded-md text-[6px] font-black uppercase tracking-widest">Hold</span>
                           )}
                         </div>
                       </div>
                    ))}
               </div>
            </div>
          </div>
        )}

        {activeTab === 'branding' && (
          <div className="space-y-8 max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-card-dark border border-white/5 rounded-[40px] p-6 sm:p-8 space-y-6 shadow-2xl relative overflow-hidden">
              <div className="space-y-1">
                <h3 className="text-xl font-display font-black tracking-tight text-text-main uppercase">
                  Aether Identity <span className="text-brand-primary font-bold">Resonance</span>
                </h3>
                <p className="text-text-dim text-[8px] font-black uppercase tracking-[0.2em]">
                  Align app logo configurations, titles, and redirect pathways
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                <div className="space-y-5">
                  <div className="space-y-2">
                    <label className="block text-[8px] font-black uppercase tracking-[0.2em] text-text-dim/80">App display heading/title</label>
                    <input 
                      type="text" 
                      value={logoTitle}
                      onChange={(e) => setLogoTitle(e.target.value)}
                      placeholder="e.g. Aether"
                      className="w-full bg-white/5 border border-white/5 rounded-2xl px-5 py-3.5 text-xs text-text-main focus:outline-none focus:border-brand-primary/30 transition-all font-medium"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-[8px] font-black uppercase tracking-[0.2em] text-text-dim/80">App Logo Symbol/Emblem (when no image custom URL is set)</label>
                    <input 
                      type="text" 
                      value={logoText}
                      onChange={(e) => setLogoText(e.target.value)}
                      placeholder="e.g. Æ"
                      maxLength={10}
                      className="w-full bg-white/5 border border-white/5 rounded-2xl px-5 py-3.5 text-xs text-text-main focus:outline-none focus:border-brand-primary/30 transition-all font-medium"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-[8px] font-black uppercase tracking-[0.2em] text-text-dim/80">Custom Logo Image URL (Optional - replaces text above)</label>
                    <input 
                      type="text" 
                      value={logoIconUrl}
                      onChange={(e) => setLogoIconUrl(e.target.value)}
                      placeholder="e.g. https://domain.com/logo.png"
                      className="w-full bg-white/5 border border-white/5 rounded-2xl px-5 py-3.5 text-xs text-text-main focus:outline-none focus:border-brand-primary/30 transition-all font-medium"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-[8px] font-black uppercase tracking-[0.2em] text-text-dim/80">Click redirect link / pathway</label>
                    <input 
                      type="text" 
                      value={logoLink}
                      onChange={(e) => setLogoLink(e.target.value)}
                      placeholder="e.g. / or a custom URL"
                      className="w-full bg-white/5 border border-white/5 rounded-2xl px-5 py-3.5 text-xs text-text-main focus:outline-none focus:border-brand-primary/30 transition-all font-medium"
                    />
                  </div>

                  {/* Owner Privacy Controls Container */}
                  <div className="bg-white/[0.01] border border-white/5 rounded-[32px] p-6 space-y-4">
                    <div className="flex items-center gap-2.5">
                      <Shield className="w-4 h-4 text-brand-primary animate-pulse" />
                      <h4 className="text-[10px] font-black uppercase tracking-[0.25em] text-text-main">
                        Owner Privacy Controls
                      </h4>
                    </div>
                    
                    <div className="space-y-4 pt-1">
                      {/* Toggle 1: Hide Creator Details */}
                      <label 
                        className="flex items-start gap-4 cursor-pointer group text-left select-none"
                      >
                        <input 
                          type="checkbox"
                          checked={hideCreatorDetails}
                          onChange={(e) => setHideCreatorDetails(e.target.checked)}
                          className="sr-only"
                        />
                        <div className={cn(
                          "w-10 h-6 rounded-full transition-colors flex items-center p-1 shrink-0",
                          hideCreatorDetails ? "bg-brand-primary" : "bg-white/10"
                        )}>
                          <div className={cn(
                            "w-4 h-4 rounded-full bg-white transition-transform shadow-md",
                            hideCreatorDetails ? "translate-x-4" : "translate-x-0"
                          )} />
                        </div>
                        <div className="space-y-0.5">
                          <span className="block text-[9.5px] font-black uppercase tracking-wider text-text-main group-hover:text-brand-primary transition-colors">
                            Hide Creator Profile Details
                          </span>
                          <span className="block text-[8px] text-text-dim/60 uppercase leading-normal">
                            Mask all personal details, tags, photos, social handles, and auditory channels of Arjun Bharti Mina for all general public users.
                          </span>
                        </div>
                      </label>

                      {/* Toggle 2: Hide Existing Posts */}
                      <label 
                        className="flex items-start gap-4 cursor-pointer group text-left select-none"
                      >
                        <input 
                          type="checkbox"
                          checked={hideExistingPosts}
                          onChange={(e) => {
                            setHideExistingPosts(e.target.checked);
                            if (!e.target.checked) {
                              setExistingPostsCutoff(null);
                            }
                          }}
                          className="sr-only"
                        />
                        <div className={cn(
                          "w-10 h-6 rounded-full transition-colors flex items-center p-1 shrink-0",
                          hideExistingPosts ? "bg-brand-primary" : "bg-white/10"
                        )}>
                          <div className={cn(
                            "w-4 h-4 rounded-full bg-white transition-transform shadow-md",
                            hideExistingPosts ? "translate-x-4" : "translate-x-0"
                          )} />
                        </div>
                        <div className="space-y-0.5">
                          <span className="block text-[9.5px] font-black uppercase tracking-wider text-text-main group-hover:text-brand-primary transition-colors">
                            Hide Existing Gallery Posts
                          </span>
                          <span className="block text-[8px] text-text-dim/60 uppercase leading-normal">
                            Set a cutoff and hide all existing gallery posts uploaded up to this moment from the public view. Any newly published posts made after this point will remain visible.
                          </span>
                        </div>
                      </label>
                      
                      {existingPostsCutoff && (
                        <div className="text-[7.5px] font-mono text-brand-primary uppercase tracking-widest pl-1">
                          Current Cutoff Activated: {new Date(existingPostsCutoff).toLocaleString()}
                        </div>
                      )}
                    </div>
                  </div>

                  <button 
                    onClick={handleSaveBranding}
                    disabled={savingBranding}
                    className="w-full h-12 bg-brand-primary hover:bg-brand-primary-hover disabled:bg-brand-primary/20 text-bg-dark rounded-2xl font-display font-black text-[10px] uppercase tracking-widest transition-all shadow-[0_0_20px_rgba(var(--brand-primary-rgb),0.2)] hover:shadow-[0_0_30px_rgba(var(--brand-primary-rgb),0.5)] flex items-center justify-center gap-2 mt-4"
                  >
                    {savingBranding ? (
                      <span className="w-4 h-4 border-2 border-bg-dark border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        Align Brand Identity
                      </>
                    )}
                  </button>
                </div>

                {/* Preview Frame */}
                <div className="p-6 bg-white/[0.02] border border-white/5 rounded-[30px] space-y-6 flex flex-col items-center justify-center text-center">
                  <div className="space-y-1 self-start">
                    <h4 className="text-[9px] font-black uppercase tracking-[0.2em] text-brand-primary">Branding Resonance Preview</h4>
                    <p className="text-[7px] text-text-dim/40 uppercase tracking-widest font-black">Interactive logo state visualization</p>
                  </div>
                  
                  {/* Interactive preview box */}
                  <div className="py-12 flex flex-col items-center justify-center gap-4">
                    <Logo size="xl" />
                    <div className="space-y-1">
                      <div className="text-sm font-display font-black uppercase tracking-[0.2em] text-text-main">{logoTitle}</div>
                      <div className="text-[8px] font-medium text-text-dim font-mono">{logoLink}</div>
                    </div>
                  </div>

                  <p className="text-[8px] text-text-dim/30 uppercase leading-relaxed max-w-xs">
                    Hover or interact with the preview logo to test rotation matrices, spring mechanics, and pulse frequencies.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
