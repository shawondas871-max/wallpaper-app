/// <reference types="vite/client" />
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Search, 
  Star, 
  Zap, 
  LayoutGrid, 
  Image as ImageIcon, 
  Music, 
  Sparkles, 
  User as UserIcon,
  ArrowRight,
  Menu,
  CheckCircle2,
  AlertCircle,
  Info,
  X,
  Play,
  Pause,
  Download,
  Heart,
  Upload,
  Settings,
  ChevronRight,
  LogOut,
  LogIn,
  Share2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';
import { MOCK_WALLPAPERS, MOCK_COLLECTIONS, MOCK_RINGTONES, Wallpaper, Ringtone, UserProfile, Favorite } from './data';
import { 
  auth, 
  db, 
  storage,
  googleProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged, 
  FirebaseUser,
  handleFirestoreError,
  OperationType
} from './firebase';
import { 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  collection, 
  onSnapshot, 
  query, 
  where, 
  orderBy, 
  limit, 
  addDoc, 
  deleteDoc,
  Timestamp,
  serverTimestamp
} from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import imageCompression from 'browser-image-compression';

const TABS = ['ওয়ালপেপার', 'এআই জেনারেটর', 'রিংটোন', 'আমার ভাইব'];
const CATEGORIES = [
  { id: 1, icon: Star, label: 'জনপ্রিয়' },
  { id: 2, icon: Zap, label: 'নতুন' },
  { id: 3, icon: LayoutGrid, label: 'প্রকৃতি' },
  { id: 4, icon: Sparkles, label: 'এক্সক্লুসিভ' },
  { id: 5, icon: ImageIcon, label: 'অ্যাবস্ট্রাক্ট' },
  { id: 6, icon: Music, label: 'অ্যানিমে' },
];

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

const GoogleAd = ({ type = 'banner', className = '' }: { type?: 'banner' | 'in-feed' | 'sidebar', className?: string }) => null;

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [activeTab, setActiveTab] = useState('ওয়ালপেপার');
  const [prompt, setPrompt] = useState('');
  const [uploadTitle, setUploadTitle] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isShowingAd, setIsShowingAd] = useState(false);
  const [adTimer, setAdTimer] = useState(0);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [selectedWallpaper, setSelectedWallpaper] = useState<Wallpaper | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [dbWallpapers, setDbWallpapers] = useState<Wallpaper[]>([]);
  const [dbRingtones, setDbRingtones] = useState<Ringtone[]>([]);
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [isPro, setIsPro] = useState(false);
  const [uploadType, setUploadType] = useState<'wallpaper' | 'ringtone'>('wallpaper');
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [coins, setCoins] = useState(0);
  const [unlockedItems, setUnlockedItems] = useState<string[]>([]);
  const [isEarning, setIsEarning] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [playingRingtone, setPlayingRingtone] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.onended = () => setPlayingRingtone(null);
    }
  }, []);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [tempDisplayName, setTempDisplayName] = useState('');

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  // Profile Sync
  useEffect(() => {
    if (!user) {
      setProfile(null);
      setCoins(0);
      setIsPro(false);
      return;
    }

    const userDocRef = doc(db, 'users', user.uid);
    const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as UserProfile;
        setProfile(data);
        setCoins(data.coins);
        setIsPro(data.isPro);
      } else {
        // Create initial profile
        const newProfile: UserProfile = {
          uid: user.uid,
          email: user.email || '',
          displayName: user.displayName || 'ভাইব ইউজার',
          photoURL: user.photoURL || '',
          coins: 1000, // Starting bonus
          isPro: false,
          role: user.email === 'nd943894@gmail.com' ? 'admin' : 'user',
          createdAt: serverTimestamp()
        };
        setDoc(userDocRef, newProfile).catch(err => handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}`));
      }
    }, (err) => handleFirestoreError(err, OperationType.GET, `users/${user.uid}`));

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (profile) {
      setTempDisplayName(profile.displayName);
    }
  }, [profile]);

  const updateProfile = async () => {
    if (!user || !tempDisplayName.trim()) return;
    try {
      const userDocRef = doc(db, 'users', user.uid);
      await updateDoc(userDocRef, {
        displayName: tempDisplayName
      });
      showToast("প্রোফাইল সফলভাবে আপডেট করা হয়েছে!", "success");
      setIsSettingsModalOpen(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  // Wallpapers Listener
  useEffect(() => {
    const q = query(collection(db, 'wallpapers'), orderBy('createdAt', 'desc'), limit(50));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const walls = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Wallpaper));
      setDbWallpapers(walls);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'wallpapers'));
    return () => unsubscribe();
  }, []);

  // Ringtones Listener
  useEffect(() => {
    const q = query(collection(db, 'ringtones'), orderBy('createdAt', 'desc'), limit(50));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const rings = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Ringtone));
      setDbRingtones(rings);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'ringtones'));
    return () => unsubscribe();
  }, []);

  // Favorites Listener
  useEffect(() => {
    if (!user) {
      setFavorites([]);
      return;
    }
    const q = query(collection(db, 'favorites'), where('userId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const favs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Favorite));
      setFavorites(favs);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'favorites'));
    return () => unsubscribe();
  }, [user]);

  const handleSignIn = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      showToast("ভাইবওয়াল-এ স্বাগতম!", "success");
    } catch (error) {
      console.error("Sign in failed:", error);
      showToast("সাইন ইন ব্যর্থ হয়েছে। আবার চেষ্টা করুন।", "error");
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      showToast("সফলভাবে সাইন আউট হয়েছে", "info");
    } catch (error) {
      console.error("Sign out failed:", error);
    }
  };

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  };

  const handleDownload = async (url: string, filename: string) => {
    showToast("ডাউনলোড শুরু হচ্ছে...", "info");
    
    const downloadBlob = async (blob: Blob) => {
      try {
        const blobUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Delay revocation to allow mobile download managers to fetch the blob
        setTimeout(() => {
          window.URL.revokeObjectURL(blobUrl);
        }, 10000);
        
        showToast("ডাউনলোড সফল হয়েছে!", "success");
        return true;
      } catch (blobError) {
        console.error("Blob download failed:", blobError);
        return false;
      }
    };

    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error("Network response was not ok");
      const blob = await response.blob();
      const success = await downloadBlob(blob);
      if (!success) throw new Error("Blob download failed");
    } catch (error) {
      console.error("Direct download failed, trying proxy:", error);
      try {
        const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
        const proxyResponse = await fetch(proxyUrl);
        if (!proxyResponse.ok) throw new Error("Proxy response was not ok");
        const blob = await proxyResponse.blob();
        const success = await downloadBlob(blob);
        if (!success) throw new Error("Proxy blob download failed");
      } catch (proxyError) {
        console.error("Proxy download failed:", proxyError);
        // Ultimate fallback: open in new tab
        window.open(url, '_blank');
        showToast("সরাসরি ডাউনলোড করা যায়নি, নতুন ট্যাবে খোলা হয়েছে। দয়া করে চেপে ধরে সেভ করুন।", "error");
      }
    }
  };

  const earnCoins = async () => {
    if (!user) {
      showToast("কয়েন উপার্জন করতে সাইন ইন করুন", "info");
      return;
    }
    setIsShowingAd(true);
    setAdTimer(5);
    
    const interval = setInterval(() => {
      setAdTimer(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    setTimeout(async () => {
      setIsShowingAd(false);
      try {
        const userDocRef = doc(db, 'users', user.uid);
        await updateDoc(userDocRef, {
          coins: (profile?.coins || 0) + 50
        });
        showToast("পুরস্কার পাওয়া গেছে! +৫০ Z", "success");
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`);
      }
    }, 5000);
  };

  const unlockItem = async (id: string, cost: number) => {
    if (!user) {
      showToast("আইটেম আনলক করতে সাইন ইন করুন", "info");
      return;
    }
    if (coins >= cost) {
      try {
        const userDocRef = doc(db, 'users', user.uid);
        await updateDoc(userDocRef, {
          coins: coins - cost
        });
        setUnlockedItems([...unlockedItems, id]);
        showToast("আইটেম সফলভাবে আনলক করা হয়েছে!", "success");
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`);
      }
    } else {
      showToast("পর্যাপ্ত ব্যালেন্স নেই! প্রতিদিনের পুরস্কার সংগ্রহ করুন।", "error");
    }
  };

  const toggleFavorite = async (itemId: string, itemType: 'wallpaper' | 'ringtone') => {
    if (!user) {
      showToast("পছন্দের তালিকায় যোগ করতে সাইন ইন করুন", "info");
      return;
    }

    const existingFav = favorites.find(f => f.itemId === itemId);
    if (existingFav) {
      try {
        await deleteDoc(doc(db, 'favorites', existingFav.id));
        showToast("পছন্দের তালিকা থেকে সরানো হয়েছে", "info");
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `favorites/${existingFav.id}`);
      }
    } else {
      try {
        await addDoc(collection(db, 'favorites'), {
          userId: user.uid,
          itemId,
          itemType,
          createdAt: serverTimestamp()
        });
        showToast("পছন্দের তালিকায় যোগ করা হয়েছে", "success");
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, 'favorites');
      }
    }
  };

  const autoUpdatePro = async () => {
    if (!user) {
      showToast("প্রো সক্রিয় করতে সাইন ইন করুন", "info");
      return;
    }
    try {
      const userDocRef = doc(db, 'users', user.uid);
      await updateDoc(userDocRef, {
        isPro: true
      });
      showToast("প্রো মোড সক্রিয় করা হয়েছে!", "success");
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!user) {
      showToast("আপলোড করতে সাইন ইন করুন", "info");
      return;
    }
    const file = e.target.files?.[0];
    if (!file) return;

    if (!uploadTitle.trim()) {
      showToast("আপনার কন্টেন্টের জন্য একটি শিরোনাম লিখুন", "error");
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      showToast("ফাইলের আকার ২০এমবি এর বেশি হতে পারবে না", "error");
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    let fileToUpload = file;
    
    // Compress image if it's a wallpaper
    if (uploadType === 'wallpaper' && file.type.startsWith('image/')) {
      try {
        showToast("ছবি অপ্টিমাইজ করা হচ্ছে...", "info");
        const options = {
          maxSizeMB: 2, // Compress to max 2MB for fast upload
          maxWidthOrHeight: 3840, // Keep 4K resolution
          useWebWorker: false // Disabled web worker to prevent iframe issues
        };
        fileToUpload = await imageCompression(file, options);
      } catch (error) {
        console.error("Compression error:", error);
        showToast("ছবি অপ্টিমাইজ করতে সমস্যা হয়েছে, মূল ছবি আপলোড করা হচ্ছে", "info");
      }
    }

    try {
      if (uploadType === 'ringtone') {
        if (!file.type.startsWith('audio/')) {
          showToast("দয়া করে একটি অডিও ফাইল নির্বাচন করুন", "error");
          return;
        }

        // Fake progress for UX
        const progressInterval = setInterval(() => {
          setUploadProgress(prev => Math.min(prev + 10, 90));
        }, 500);

        try {
          const formData = new FormData();
          formData.append('reqtype', 'fileupload');
          formData.append('fileToUpload', file);

          const response = await fetch('https://catbox.moe/user/api.php', {
            method: 'POST',
            body: formData
          });

          clearInterval(progressInterval);
          setUploadProgress(100);

          if (!response.ok) {
            throw new Error("Network response was not ok");
          }

          const downloadURL = await response.text();
          
          if (!downloadURL || !downloadURL.startsWith('http')) {
            throw new Error(downloadURL || "Invalid URL returned");
          }

          const newDocRef = doc(collection(db, 'ringtones'));
          await setDoc(newDocRef, {
            id: newDocRef.id,
            title: uploadTitle,
            url: downloadURL,
            category: 'নতুন',
            duration: '0:30',
            authorId: user.uid,
            authorName: user.displayName || 'Anonymous',
            createdAt: serverTimestamp(),
            downloads: 0,
            likes: 0
          });
          showToast("রিংটোন সফলভাবে আপলোড হয়েছে!", "success");
          setIsUploadModalOpen(false);
          setUploadTitle('');
        } catch (err) {
          clearInterval(progressInterval);
          console.error("Audio upload error:", err);
          showToast("রিংটোন আপলোড ব্যর্থ হয়েছে। আবার চেষ্টা করুন।", "error");
        } finally {
          setIsUploading(false);
          setUploadProgress(0);
        }
        return;
      }

      // Fake progress for UX
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 500);

      const formData = new FormData();
      formData.append('image', fileToUpload);
      
      const apiKey = import.meta.env.VITE_IMGBB_API_KEY?.trim();
      if (!apiKey) {
        clearInterval(progressInterval);
        showToast("ImgBB API Key সেট করা নেই! দয়া করে সেটিংস থেকে API Key যুক্ত করুন।", "error");
        setIsUploading(false);
        return;
      }

      const response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
        method: 'POST',
        body: formData
      });
      
      const data = await response.json();
      clearInterval(progressInterval);
      setUploadProgress(100);

      if (data.success) {
        const downloadURL = data.data.url;
        
        try {
          const newDocRef = doc(collection(db, 'wallpapers'));
          await setDoc(newDocRef, {
            id: newDocRef.id,
            title: uploadTitle,
            url: downloadURL,
            category: 'নতুন',
            authorId: user.uid,
            authorName: user.displayName || 'Anonymous',
            createdAt: serverTimestamp(),
            downloads: 0,
            likes: 0
          });
          showToast("ওয়ালপেপার সফলভাবে আপলোড হয়েছে!", "success");
          setIsUploadModalOpen(false);
          setUploadTitle('');
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, 'wallpapers');
        }
      } else {
        throw new Error(data.error?.message || "ImgBB Upload failed");
      }
    } catch (err) {
      console.error("Upload error:", err);
      showToast(`আপলোড ব্যর্থ হয়েছে: ${err instanceof Error ? err.message : String(err)}`, "error");
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const filteredWallpapers = [...MOCK_WALLPAPERS, ...dbWallpapers].filter(w => {
    const matchesSearch = w.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         w.category.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (selectedCategory === 'এক্সক্লুসিভ') {
      return matchesSearch && (w.category === 'এক্সক্লুসিভ' || w.isPremium);
    }

    if (selectedCategory) {
      return matchesSearch && w.category === selectedCategory;
    }

    if (activeTab === 'ভিডিও ওয়ালপেপার') {
      return matchesSearch && w.type === 'video';
    }

    if (activeTab === 'ডুয়াল') {
      return matchesSearch && w.type === 'dual';
    }

    if (activeTab === '২৪ ঘণ্টা ওয়ালপেপার') {
      return matchesSearch && w.type === '24h';
    }

    if (activeTab === 'ওয়ালপেপার') {
      return matchesSearch;
    }
    
    return matchesSearch;
  });

  const generateAIWallpaper = async () => {
    if (!prompt) return;
    setIsGenerating(true);
    try {
      const { GoogleGenAI } = await import("@google/genai");
      const apiKey = process.env.GEMINI_API_KEY || import.meta.env.VITE_GEMINI_API_KEY || '';
      
      if (!apiKey) {
        showToast("Gemini API Key পাওয়া যায়নি! Netlify-তে API Key সেট করুন।", "error");
        setIsGenerating(false);
        return;
      }

      const ai = new GoogleGenAI({ apiKey: apiKey });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [{ text: `A high quality mobile wallpaper of: ${prompt}. Artistic, 4k, cinematic lighting.` }],
        },
      });

      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          const base64Data = part.inlineData.data;
          const imageUrl = `data:image/png;base64,${base64Data}`;
          setGeneratedImage(imageUrl);
          
          // Save to DB if logged in
          if (user) {
            try {
              const imgbbApiKey = import.meta.env.VITE_IMGBB_API_KEY?.trim();
              let finalImageUrl = imageUrl;
              
              if (imgbbApiKey) {
                const formData = new FormData();
                formData.append('image', base64Data);
                const uploadRes = await fetch(`https://api.imgbb.com/1/upload?key=${imgbbApiKey}`, {
                  method: 'POST',
                  body: formData,
                });
                const uploadData = await uploadRes.json();
                if (uploadData.success) {
                  finalImageUrl = uploadData.data.url;
                }
              }

              // Only save if it's a valid http/https URL to satisfy Firestore rules
              if (finalImageUrl.startsWith('http')) {
                await addDoc(collection(db, 'wallpapers'), {
                  title: `AI: ${prompt.substring(0, 20)}...`,
                  url: finalImageUrl,
                  category: 'এআই দ্বারা তৈরি',
                  isPremium: true,
                  authorId: user.uid,
                  authorName: user.displayName || 'এআই শিল্পী',
                  createdAt: serverTimestamp()
                });
              }
            } catch (dbError) {
              console.error("Failed to save AI wallpaper to DB:", dbError);
              // Don't throw here, we still want to show the generated image
            }
          }
          
          showToast("এআই ওয়ালপেপার সফলভাবে তৈরি হয়েছে!", "success");
          break;
        }
      }
    } catch (error) {
      console.error("Generation failed:", error);
      const errorStr = error instanceof Error ? error.message : String(error);
      let userFriendlyMessage = "অজানা ত্রুটি হয়েছে।";
      
      if (errorStr.includes("429") || errorStr.includes("RESOURCE_EXHAUSTED") || errorStr.includes("quota")) {
        userFriendlyMessage = "আপনার ফ্রি API কোটা (লিমিট) শেষ হয়ে গেছে! কিছুক্ষণ পর বা আগামীকাল আবার চেষ্টা করুন।";
      } else {
        // Show a shorter version of the error if it's not a quota issue
        userFriendlyMessage = errorStr.length > 100 ? errorStr.substring(0, 100) + "..." : errorStr;
      }
      
      showToast(userFriendlyMessage, "error");
    } finally {
      setIsGenerating(false);
    }
  };

  const shareToPinterest = (url: string, media: string, description: string) => {
    // For Pinterest, we want to share the actual image URL as the media
    // and the website URL as the link back
    const siteUrl = window.location.origin;
    const pinterestUrl = `https://www.pinterest.com/pin/create/button/?url=${encodeURIComponent(siteUrl)}&media=${encodeURIComponent(media)}&description=${encodeURIComponent(description)}`;
    window.open(pinterestUrl, '_blank', 'width=600,height=600');
  };

  const toggleRingtone = (id: string, url?: string) => {
    if (playingRingtone === id) {
      audioRef.current?.pause();
      setPlayingRingtone(null);
    } else {
      if (url && audioRef.current) {
        audioRef.current.src = url;
        audioRef.current.play().catch(err => {
          console.error("Audio play failed:", err);
          showToast("অডিও বাজাতে সমস্যা হচ্ছে।", "error");
          setPlayingRingtone(null);
        });
        setPlayingRingtone(id);
        showToast("প্রিভিউ বাজছে...", "info");
      } else {
        showToast("অডিও ফাইল পাওয়া যায়নি।", "error");
      }
    }
  };

  const syncDailyWallpapers = async () => {
    if (!user || (profile?.role !== 'admin' && user.email !== 'nd943894@gmail.com')) {
      showToast("শুধুমাত্র অ্যাডমিন এই কাজটি করতে পারবেন", "error");
      return;
    }

    try {
      showToast("অটো আপডেট শুরু হচ্ছে...", "info");
      const today = new Date().toISOString().split('T')[0];
      const metadataRef = doc(db, 'system', 'metadata');
      const metadataSnap = await getDoc(metadataRef);
      
      let lastUpdate = '';
      if (metadataSnap.exists()) {
        lastUpdate = metadataSnap.data().lastAutoUpdate;
      }

      if (lastUpdate === today) {
        showToast("আজকের আপডেট ইতিমধ্যে সম্পন্ন হয়েছে!", "info");
        return;
      }

      // Fetch 10 new wallpapers
      const dayOfYear = Math.floor((new Date().getTime() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 1000 / 60 / 60 / 24);
      const response = await fetch(`https://picsum.photos/v2/list?page=${dayOfYear}&limit=10`);
      const images = await response.json();

      for (const img of images) {
        const newDocRef = doc(collection(db, 'wallpapers'));
        await setDoc(newDocRef, {
          id: newDocRef.id,
          title: `অটোমেটিক ওয়ালপেপার ${img.id}`,
          url: `https://picsum.photos/id/${img.id}/400/600`,
          category: 'নতুন',
          authorId: user.uid,
          authorName: 'Auto Update',
          createdAt: serverTimestamp(),
          downloads: 0,
          likes: 0,
          type: 'static'
        });
      }

      // Update metadata
      await setDoc(metadataRef, { lastAutoUpdate: today }, { merge: true });
      
      showToast("১০টি নতুন ওয়ালপেপার সফলভাবে যুক্ত হয়েছে!", "success");
    } catch (error) {
      console.error("Failed to sync daily wallpapers:", error);
      showToast("অটো আপডেট ব্যর্থ হয়েছে", "error");
    }
  };

  const syncDailyRingtones = async () => {
    if (!user || (profile?.role !== 'admin' && user.email !== 'nd943894@gmail.com')) {
      showToast("শুধুমাত্র অ্যাডমিন এই কাজটি করতে পারবেন", "error");
      return;
    }

    try {
      showToast("রিংটোন অটো আপডেট শুরু হচ্ছে...", "info");
      const today = new Date().toISOString().split('T')[0];
      const metadataRef = doc(db, 'system', 'metadata');
      const metadataSnap = await getDoc(metadataRef);
      
      let lastUpdate = '';
      if (metadataSnap.exists()) {
        lastUpdate = metadataSnap.data().lastAutoUpdateRingtone || '';
      }

      if (lastUpdate === today) {
        showToast("আজকের রিংটোন আপডেট ইতিমধ্যে সম্পন্ন হয়েছে!", "info");
        return;
      }

      // Test MP3 URLs for auto-update
      const audioUrls = [
        "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
        "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
        "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
        "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3",
        "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3",
        "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3",
        "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3",
        "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3"
      ];

      const dayOfYear = Math.floor((new Date().getTime() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 1000 / 60 / 60 / 24);
      const startIndex = (dayOfYear * 5) % audioUrls.length;

      for (let i = 0; i < 5; i++) {
        const urlIndex = (startIndex + i) % audioUrls.length;
        const newDocRef = doc(collection(db, 'ringtones'));
        await setDoc(newDocRef, {
          id: newDocRef.id,
          title: `অটোমেটিক রিংটোন ${dayOfYear}-${i + 1}`,
          url: audioUrls[urlIndex],
          category: 'নতুন',
          duration: '0:30',
          authorId: user.uid,
          authorName: 'Auto Update',
          createdAt: serverTimestamp(),
          downloads: 0,
          likes: 0
        });
      }

      // Update metadata
      await setDoc(metadataRef, { lastAutoUpdateRingtone: today }, { merge: true });
      
      showToast("৫টি নতুন রিংটোন সফলভাবে যুক্ত হয়েছে!", "success");
    } catch (error) {
      console.error("Failed to sync daily ringtones:", error);
      showToast("রিংটোন অটো আপডেট ব্যর্থ হয়েছে", "error");
    }
  };

  // Auto-sync daily wallpapers for admins
  useEffect(() => {
    if (user && (profile?.role === 'admin' || user.email === 'nd943894@gmail.com')) {
      syncDailyWallpapers();
      syncDailyRingtones();
    }
  }, [user, profile?.role]);

  const renderContent = () => {
    if (activeTab === 'অ্যাডমিন' && (profile?.role === 'admin' || user?.email === 'nd943894@gmail.com')) {
      return (
        <div className="space-y-12 animate-in fade-in duration-700">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-black text-white mb-2 tracking-tight">অ্যাডমিন প্যানেল</h2>
              <p className="text-gray-400">ওয়ালপেপার এবং রিংটোন পরিচালনা করুন</p>
            </div>
          </div>

          <div className="bg-[#1A1A1A] rounded-3xl p-8 border border-white/5">
            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <Zap className="w-5 h-5 text-purple-500" />
              অটো আপডেট সিস্টেম
            </h3>
            <p className="text-gray-400 mb-6">প্রতিদিন ১০টি নতুন হাই-কোয়ালিটি ওয়ালপেপার অটোমেটিকভাবে ওয়েবসাইটে যুক্ত করতে নিচের বাটনে ক্লিক করুন।</p>
            <button
              onClick={syncDailyWallpapers}
              className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-4 rounded-xl font-bold flex items-center gap-3 transition-all shadow-lg shadow-purple-500/20"
            >
              <Sparkles className="w-5 h-5" />
              আজকের ১০টি ওয়ালপেপার আপডেট করুন
            </button>
          </div>

          <div className="bg-[#1A1A1A] rounded-3xl p-8 border border-white/5">
            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <Music className="w-5 h-5 text-purple-500" />
              অটো রিংটোন আপডেট সিস্টেম
            </h3>
            <p className="text-gray-400 mb-6">প্রতিদিন ৫টি নতুন রিংটোন অটোমেটিকভাবে ওয়েবসাইটে যুক্ত করতে নিচের বাটনে ক্লিক করুন।</p>
            <button
              onClick={syncDailyRingtones}
              className="bg-white/10 hover:bg-white/20 text-white px-8 py-4 rounded-xl font-bold flex items-center gap-3 transition-all"
            >
              <Sparkles className="w-5 h-5" />
              আজকের ৫টি রিংটোন আপডেট করুন
            </button>
          </div>
        </div>
      );
    }
    if (selectedCategory || activeTab !== 'ওয়ালপেপার') {
      const displayTitle = selectedCategory || activeTab;
      const items = filteredWallpapers;

      if (activeTab === 'এআই জেনারেটর') {
        return (
          <div className="py-16 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-4xl mx-auto">
            <GoogleAd type="banner" className="mb-12" />
            <div className="text-center mb-16">
              <h2 className="text-5xl font-black mb-6">এআই ম্যাজিক</h2>
              <p className="text-gray-400 text-lg">আপনার কল্পনাকে বাস্তবে রূপান্তর করুন। আপনি যা দেখতে চান তা বর্ণনা করুন।</p>
            </div>
            
            <div className="bg-[#1A1A1A] rounded-[40px] p-10 border border-white/5 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-5">
                <Sparkles className="w-40 h-40" />
              </div>
              
              <div className="relative z-10 space-y-8">
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-4 uppercase tracking-widest">আপনার প্রম্পট</label>
                  <textarea 
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="যেমন: নিয়ন আলো সহ একটি সাইবারপাঙ্ক শহরের দৃশ্য..."
                    className="w-full bg-black/40 border border-white/10 rounded-3xl p-8 h-48 focus:outline-none focus:border-purple-500 transition-all resize-none text-xl leading-relaxed"
                  />
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {['সাইবারপাঙ্ক', 'অ্যানিমে', 'প্রকৃতি', '৩ডি আর্ট'].map((style) => (
                    <button key={style} className="py-4 rounded-2xl bg-white/5 border border-white/5 hover:border-purple-500 transition-all text-sm font-bold">
                      {style}
                    </button>
                  ))}
                </div>

                <button 
                  onClick={generateAIWallpaper}
                  disabled={isGenerating || !prompt}
                  className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 py-6 rounded-3xl font-black text-xl flex items-center justify-center gap-4 transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100 shadow-xl shadow-purple-500/20"
                >
                  {isGenerating ? (
                    <div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Sparkles className="w-8 h-8" />
                      ম্যাজিক তৈরি করুন
                    </>
                  )}
                </button>
              </div>
            </div>

            {generatedImage && (
              <motion.div 
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-16 relative aspect-[16/9] rounded-[40px] overflow-hidden border border-white/10 shadow-2xl"
              >
                <img src={generatedImage} alt="Generated" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                <div className="absolute bottom-10 left-10 right-10 flex gap-4">
                  <button 
                    onClick={() => handleDownload(generatedImage, 'generated-wallpaper.jpg')}
                    className="flex-1 bg-white text-black py-4 rounded-2xl font-bold flex items-center justify-center gap-2"
                  >
                    <Download className="w-5 h-5" />
                    ডাউনলোড
                  </button>
                  <button 
                    onClick={() => handleDownload(generatedImage || '', 'generated-wallpaper.jpg')}
                    className="flex-1 bg-white/10 backdrop-blur-md py-4 rounded-2xl font-bold border border-white/10"
                  >
                    ডাউনলোড করে সেট করুন
                  </button>
                </div>
              </motion.div>
            )}
          </div>
        );
      }

      if (activeTab === 'রিংটোন') {
        return (
          <div className="py-16 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <GoogleAd type="banner" className="mb-12" />
            <div className="flex items-center justify-between mb-12">
              <div>
                <h2 className="text-5xl font-black mb-4">রিংটোন</h2>
                <p className="text-gray-400 text-lg">আপনার ফোনের জন্য সেরা শব্দের সংগ্রহ</p>
              </div>
              <div className="hidden md:flex gap-4">
                {['জনপ্রিয়', 'নতুন', 'ট্রেন্ডিং'].map(f => (
                  <button key={f} className="px-8 py-3 rounded-full bg-white/5 border border-white/5 text-sm font-bold hover:bg-white/10 transition-all">
                    {f}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[...MOCK_RINGTONES, ...dbRingtones].map((rt) => (
                <div key={rt.id} className="bg-[#1A1A1A] p-6 rounded-2xl border border-white/5 flex items-center justify-between group hover:border-purple-500/30 transition-all shadow-lg">
                  <div className="flex items-center gap-4">
                    <button 
                      onClick={() => toggleRingtone(rt.id, rt.url)}
                      className={cn(
                        "w-12 h-12 rounded-full flex items-center justify-center text-white shadow-xl transition-all group-hover:scale-110",
                        playingRingtone === rt.id ? "bg-purple-500" : "bg-purple-500/20"
                      )}
                    >
                      {playingRingtone === rt.id ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current ml-1" />}
                    </button>
                    <div>
                      <h3 className="font-bold text-lg mb-0.5">{rt.title}</h3>
                      <p className="text-xs text-gray-500">{rt.category} • {rt.duration}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => toggleFavorite(rt.id, 'ringtone')}
                      className={cn(
                        "p-3 rounded-xl transition-all",
                        favorites.some(f => f.itemId === rt.id) ? "bg-rose-500/20 text-rose-500 border border-rose-500/20" : "bg-white/5 text-gray-400 hover:bg-rose-500/20 hover:text-rose-500"
                      )}
                    >
                      <Heart className={cn("w-5 h-5", favorites.some(f => f.itemId === rt.id) && "fill-current")} />
                    </button>
                    {rt.isPremium && !unlockedItems.includes(rt.id) ? (
                      <button 
                        onClick={() => unlockItem(rt.id, 100)}
                        className="bg-yellow-500 text-black px-6 py-2 rounded-xl font-black text-xs flex items-center gap-2 hover:bg-yellow-400 transition-all transform hover:scale-105"
                      >
                        <Sparkles className="w-4 h-4" />
                        100
                      </button>
                    ) : (
                      <button 
                        onClick={() => handleDownload(rt.url || '', `${rt.title}.mp3`)}
                        className="p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-all"
                      >
                        <Download className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      }

      if (activeTab === 'আমার ভাইব') {
        if (!user) {
          return (
            <div className="py-32 flex flex-col items-center justify-center text-center animate-in fade-in duration-700">
              <div className="w-24 h-24 bg-purple-500/10 rounded-full flex items-center justify-center mb-8 border border-purple-500/20">
                <UserIcon className="w-12 h-12 text-purple-500" />
              </div>
              <h2 className="text-4xl font-black mb-4">আপনার ভাইব, আপনার জায়গা</h2>
              <p className="text-gray-400 text-lg mb-12 max-w-md">আপনার পছন্দগুলো সংরক্ষণ করতে, নিজের তৈরি জিনিস আপলোড করতে এবং Z কয়েন উপার্জন করতে সাইন ইন করুন!</p>
              <button 
                onClick={handleSignIn}
                className="bg-purple-600 text-white px-12 py-4 rounded-3xl font-black text-xl hover:bg-purple-700 transition-all transform hover:scale-105 shadow-2xl shadow-purple-500/20 flex items-center gap-3"
              >
                <LogIn className="w-6 h-6" />
                গুগল দিয়ে সাইন ইন করুন
              </button>
            </div>
          );
        }

        const myUploads = dbWallpapers.filter(w => w.authorId === user.uid || (w as any).authorUid === user.uid);
        const myRingtones = dbRingtones.filter(r => r.authorId === user.uid);
        const myFavWallpapers = [...MOCK_WALLPAPERS, ...dbWallpapers].filter(w => favorites.some(f => f.itemId === w.id && f.itemType === 'wallpaper'));
        const myFavRingtones = [...MOCK_RINGTONES, ...dbRingtones].filter(r => favorites.some(f => f.itemId === r.id && f.itemType === 'ringtone'));

        return (
          <div className="py-16 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-5xl mx-auto">
            <div className="bg-gradient-to-br from-purple-600/20 to-indigo-600/20 rounded-[50px] p-16 border border-white/10 mb-16 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-12 opacity-5">
                <UserIcon className="w-64 h-64" />
              </div>
              <div className="relative z-10 flex flex-col md:flex-row items-center gap-12">
                <div className="w-40 h-40 rounded-full bg-gradient-to-tr from-purple-500 to-pink-500 p-1.5 shadow-2xl">
                  <div className="w-full h-full rounded-full bg-[#0A0A0A] flex items-center justify-center overflow-hidden">
                    {user.photoURL ? (
                      <img src={user.photoURL} alt={user.displayName || ''} className="w-full h-full object-cover" />
                    ) : (
                      <UserIcon className="w-20 h-20 text-white" />
                    )}
                  </div>
                </div>
                <div className="text-center md:text-left">
                  <h2 className="text-5xl font-black mb-4">{user.displayName || 'Vibe User'}</h2>
                  <p className="text-purple-400 text-xl font-bold mb-8">{isPro ? 'প্রো সদস্য' : 'এক্সক্লুসিভ সদস্য'}</p>
                  <div className="flex flex-wrap gap-6 justify-center md:justify-start">
                    <div className="bg-black/40 backdrop-blur-xl px-10 py-5 rounded-3xl border border-white/10 shadow-xl">
                      <p className="text-xs text-gray-500 uppercase font-bold mb-2 tracking-widest">আমার ব্যালেন্স</p>
                      <div className="flex items-center gap-3">
                        <div className="w-5 h-5 bg-yellow-500 rounded-full flex items-center justify-center text-[10px] text-black font-bold">Z</div>
                        <span className="text-3xl font-black">{coins}</span>
                      </div>
                    </div>
                    <button 
                      onClick={() => setIsUploadModalOpen(true)}
                      className="bg-purple-600 text-white px-10 py-5 rounded-3xl font-black text-lg hover:bg-purple-700 transition-all transform hover:scale-105 shadow-xl shadow-purple-500/20"
                    >
                      <p className="text-xs text-purple-200 uppercase font-bold mb-1">কন্টেন্ট শেয়ার করুন</p>
                      <div className="flex items-center gap-2">
                        <Upload className="w-5 h-5" />
                        <span>এখনই আপলোড করুন</span>
                      </div>
                    </button>
                    <button 
                      onClick={earnCoins}
                      disabled={isShowingAd}
                      className="bg-white text-black px-10 py-5 rounded-3xl font-black text-lg hover:bg-gray-200 transition-all transform hover:scale-105 disabled:opacity-50 shadow-xl"
                    >
                      <p className="text-xs text-purple-600 uppercase font-bold mb-1">প্রতিদিনের পুরস্কার</p>
                      <span>{isShowingAd ? 'বিজ্ঞাপন চলছে...' : 'বিজ্ঞাপন দেখুন (+৫০ Z)'}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="mb-16">
              <h3 className="text-2xl font-bold mb-8 px-4">আমার আপলোড করা ওয়ালপেপার</h3>
              {myUploads.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {myUploads.map((w) => (
                    <div 
                      key={w.id} 
                      onClick={() => setSelectedWallpaper(w)}
                      className="aspect-[9/16] rounded-3xl overflow-hidden relative group cursor-pointer border border-white/5 shadow-xl"
                    >
                      <img src={w.url} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt={w.title} referrerPolicy="no-referrer" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
                        <p className="text-xs font-bold">{w.title}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-[#1A1A1A] rounded-3xl p-12 border border-dashed border-white/10 text-center">
                  <ImageIcon className="w-12 h-12 text-gray-700 mx-auto mb-4" />
                  <p className="text-gray-500 font-bold">আপনি এখনো কোনো ওয়ালপেপার আপলোড করেননি।</p>
                </div>
              )}
            </div>

            <div className="mb-16">
              <h3 className="text-2xl font-bold mb-8 px-4">আমার প্রিয়</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {myFavWallpapers.map((w) => (
                  <div 
                    key={w.id} 
                    onClick={() => setSelectedWallpaper(w)}
                    className="aspect-[9/16] rounded-3xl overflow-hidden relative group cursor-pointer border border-white/5 shadow-xl"
                  >
                    <img src={w.url} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt={w.title} referrerPolicy="no-referrer" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
                      <p className="text-xs font-bold">{w.title}</p>
                    </div>
                    <button 
                      onClick={(e) => { e.stopPropagation(); toggleFavorite(w.id, 'wallpaper'); }}
                      className="absolute top-3 right-3 bg-rose-500 p-2 rounded-xl shadow-lg"
                    >
                      <Heart className="w-4 h-4 text-white fill-current" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="mb-16">
              <h3 className="text-2xl font-bold mb-8 px-4">আমার আপলোড করা রিংটোন</h3>
              {myRingtones.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {myRingtones.map((rt) => (
                    <div key={rt.id} className="bg-[#1A1A1A] p-6 rounded-2xl border border-white/5 flex items-center justify-between group hover:border-purple-500/30 transition-all shadow-lg">
                      <div className="flex items-center gap-4">
                        <button 
                          onClick={() => toggleRingtone(rt.id, rt.url)}
                          className={cn(
                            "w-12 h-12 rounded-full flex items-center justify-center text-white shadow-xl transition-all group-hover:scale-110",
                            playingRingtone === rt.id ? "bg-purple-500" : "bg-purple-500/20"
                          )}
                        >
                          {playingRingtone === rt.id ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current ml-1" />}
                        </button>
                        <div>
                          <h3 className="font-bold text-lg mb-0.5">{rt.title}</h3>
                          <p className="text-xs text-gray-500">{rt.category} • {rt.duration}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <button 
                          onClick={() => shareToPinterest(window.location.href, "https://images.unsplash.com/photo-1516280440614-37939bbacd81?w=800", `VibeWall রিংটোন: ${rt.title}`)}
                          className="p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-all text-gray-400 hover:text-red-500"
                          title="Pinterest-এ শেয়ার করুন"
                        >
                          <Share2 className="w-5 h-5" />
                        </button>
                        <button 
                          onClick={() => handleDownload(rt.url || '', `${rt.title}.mp3`)}
                          className="p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-all"
                        >
                          <Download className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-[#1A1A1A] rounded-3xl p-12 border border-dashed border-white/10 text-center">
                  <Music className="w-12 h-12 text-gray-700 mx-auto mb-4" />
                  <p className="text-gray-500 font-bold">আপনি এখনো কোনো রিংটোন আপলোড করেননি।</p>
                </div>
              )}
            </div>

            <div className="mb-16">
              <h3 className="text-2xl font-bold mb-8 px-4">প্রিয় রিংটোন</h3>
              {myFavRingtones.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {myFavRingtones.map((rt) => (
                    <div key={rt.id} className="bg-[#1A1A1A] p-6 rounded-2xl border border-white/5 flex items-center justify-between group hover:border-purple-500/30 transition-all shadow-lg">
                      <div className="flex items-center gap-4">
                        <button 
                          onClick={() => toggleRingtone(rt.id, rt.url)}
                          className={cn(
                            "w-12 h-12 rounded-full flex items-center justify-center text-white shadow-xl transition-all group-hover:scale-110",
                            playingRingtone === rt.id ? "bg-purple-500" : "bg-purple-500/20"
                          )}
                        >
                          {playingRingtone === rt.id ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current ml-1" />}
                        </button>
                        <div>
                          <h3 className="font-bold text-lg mb-0.5">{rt.title}</h3>
                          <p className="text-xs text-gray-500">{rt.category} • {rt.duration}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <button 
                          onClick={() => shareToPinterest(window.location.href, "https://images.unsplash.com/photo-1516280440614-37939bbacd81?w=800", `VibeWall রিংটোন: ${rt.title}`)}
                          className="p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-all text-gray-400 hover:text-red-500"
                        >
                          <Share2 className="w-5 h-5" />
                        </button>
                        <button 
                          onClick={() => toggleFavorite(rt.id, 'ringtone')}
                          className="p-3 bg-rose-500/20 text-rose-500 rounded-xl hover:bg-rose-500/30 transition-all"
                        >
                          <Heart className="w-5 h-5 fill-current" />
                        </button>
                        <button 
                          onClick={() => handleDownload(rt.url || '', `${rt.title}.mp3`)}
                          className="p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-all"
                        >
                          <Download className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-[#1A1A1A] rounded-3xl p-12 border border-dashed border-white/10 text-center">
                  <Heart className="w-12 h-12 text-gray-700 mx-auto mb-4" />
                  <p className="text-gray-500 font-bold">এখনো কোনো প্রিয় রিংটোন নেই।</p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              <div>
                <h3 className="text-2xl font-bold mb-8 px-4">অ্যাকাউন্ট সেটিংস</h3>
                <div className="space-y-4">
                  {[
                    { icon: Download, label: 'আনলক করা আইটেম', count: unlockedItems.length.toString(), onClick: () => showToast("আপনার আনলক করা আইটেমগুলো এখানে দেখা যাবে।", "info") },
                    { icon: Heart, label: 'প্রিয়', count: favorites.length.toString(), onClick: () => showToast("আপনার প্রিয় আইটেমগুলো উপরে দেখুন।", "info") },
                    { icon: Upload, label: 'আমার আপলোড', count: (myUploads.length + myRingtones.length).toString(), onClick: () => showToast("আপনার আপলোড করা আইটেমগুলো উপরে দেখুন।", "info") },
                    { icon: Settings, label: 'সেটিংস', onClick: () => setIsSettingsModalOpen(true) },
                    { icon: LogOut, label: 'লগআউট', onClick: handleSignOut, isDanger: true },
                  ].map((item, i) => (
                    <button 
                      key={i} 
                      onClick={item.onClick}
                      className={cn(
                        "w-full bg-[#1A1A1A] p-6 rounded-3xl border border-white/5 flex items-center justify-between group hover:bg-[#222] transition-all shadow-md",
                        item.isDanger && "hover:border-rose-500/30"
                      )}
                    >
                      <div className="flex items-center gap-6">
                        <div className={cn(
                          "w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center transition-colors",
                          item.isDanger ? "group-hover:bg-rose-500/20" : "group-hover:bg-purple-500/20"
                        )}>
                          <item.icon className={cn(
                            "w-7 h-7 text-gray-400 transition-colors",
                            item.isDanger ? "group-hover:text-rose-400" : "group-hover:text-purple-400"
                          )} />
                        </div>
                        <span className={cn("text-lg font-bold", item.isDanger && "text-rose-400")}>{item.label}</span>
                      </div>
                      {item.count ? (
                        <span className="bg-white/5 px-4 py-1.5 rounded-xl text-xs font-bold text-gray-500">{item.count}</span>
                      ) : (
                        <ChevronRight className="w-6 h-6 text-gray-600" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-[#1A1A1A] rounded-[40px] p-10 border border-white/5 h-fit shadow-2xl">
                <h3 className="text-2xl font-bold mb-8">স্পনসর করা বিজ্ঞাপন</h3>
                <GoogleAd type="sidebar" className="mb-8" />
                <div className="aspect-video bg-black/40 rounded-3xl border border-white/5 flex flex-col items-center justify-center p-8 text-center group cursor-pointer relative overflow-hidden">
                  <img 
                    src="https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&auto=format&fit=crop&q=60" 
                    className="absolute inset-0 w-full h-full object-cover opacity-20 group-hover:scale-110 transition-transform duration-700"
                    alt="Ad"
                  />
                  <div className="relative z-10">
                    <div className="w-16 h-16 bg-blue-500 rounded-2xl mx-auto mb-6 flex items-center justify-center shadow-2xl shadow-blue-500/30">
                      <Zap className="w-8 h-8 text-white" />
                    </div>
                    <h4 className="text-xl font-bold mb-3">একটি নতুন গেমিং পিসি জিতুন!</h4>
                    <p className="text-sm text-gray-500 mb-8">অংশগ্রহণ করতে এবং আপনার ভাগ্য পরীক্ষা করতে এখানে ক্লিক করুন।</p>
                    <button className="bg-blue-600 text-white px-10 py-3 rounded-full font-bold hover:bg-blue-700 transition-all transform hover:scale-105">এখনই যোগ দিন</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      }

      return (
        <div className="py-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center justify-between mb-12">
            <h2 className="text-4xl font-black">{displayTitle}</h2>
            <p className="text-gray-500 font-medium">{items.length} আইটেম পাওয়া গেছে</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
            {items.map((w) => (
              <div 
                key={w.id} 
                onClick={() => setSelectedWallpaper(w)}
                className="aspect-[9/16] rounded-3xl overflow-hidden relative group cursor-pointer border border-white/5"
              >
                <img src={w.url} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" alt={w.title} referrerPolicy="no-referrer" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-6">
                  <p className="text-sm font-bold">{w.title}</p>
                </div>
                <div className="absolute top-4 left-4 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={(e) => { e.stopPropagation(); toggleFavorite(w.id, 'wallpaper'); }}
                    className={cn(
                      "p-3 rounded-2xl backdrop-blur-md border border-white/10 transition-all",
                      favorites.some(f => f.itemId === w.id) ? "bg-rose-500 text-white border-rose-500" : "bg-black/40 text-white hover:bg-rose-500"
                    )}
                  >
                    <Heart className={cn("w-5 h-5", favorites.some(f => f.itemId === w.id) && "fill-current")} />
                  </button>
                </div>
                {w.isPremium && (
                  <div className="absolute top-4 right-4 bg-yellow-500 p-2 rounded-xl">
                    <Sparkles className="w-4 h-4 text-black" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      );
    }

    return (
      <div className="animate-in fade-in duration-700">
        {/* Top Banner Ad */}
        <div className="max-w-7xl mx-auto px-4 md:px-8 mt-6">
          <GoogleAd type="banner" />
        </div>

        {/* Hero Section - More Compact */}
        <section className="relative h-[300px] md:h-[450px] flex items-center justify-center overflow-hidden mb-12 rounded-[40px] mt-6 shadow-2xl mx-4 md:mx-8">
          <div className="absolute inset-0 z-0">
            <img 
              src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1600&auto=format&fit=crop&q=80" 
              className="w-full h-full object-cover opacity-40"
              alt="হিরো ব্যাকগ্রাউন্ড"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0A0A0A]/50 to-[#0A0A0A]" />
          </div>
          
          <div className="relative z-10 text-center px-4 max-w-4xl">
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-4xl md:text-6xl font-black mb-6 tracking-tight leading-tight"
            >
              আপনার স্ক্রিনকে দিন <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-500">এক নতুন মাত্রা</span>
            </motion.h1>
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="flex flex-wrap items-center justify-center gap-4"
            >
              <button 
                onClick={() => setSelectedCategory('এক্সক্লুসিভ')}
                className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-3 rounded-full font-black text-sm transition-all transform hover:scale-105 shadow-xl shadow-purple-500/20"
              >
                এক্সক্লুসিভ
              </button>
              <button 
                onClick={() => setActiveTab('এআই জেনারেটর')}
                className="bg-white/10 hover:bg-white/20 backdrop-blur-md text-white px-8 py-3 rounded-full font-black text-sm transition-all border border-white/10"
              >
                এআই জেনারেটর
              </button>
            </motion.div>
          </div>
        </section>

        {/* Categories Grid */}
        <section className="mb-16">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold">বিভাগ</h2>
            <button className="text-purple-400 text-xs font-bold hover:underline">সব দেখুন</button>
          </div>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.label)}
                className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-[#1A1A1A] border border-white/5 hover:border-purple-500/50 transition-all group shadow-lg"
              >
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform",
                  cat.label === 'প্রকৃতি' ? "bg-green-500/10 text-green-400" :
                  cat.label === 'অ্যানিমে' ? "bg-blue-500/10 text-blue-400" :
                  cat.label === 'অ্যাবস্ট্রাক্ট' ? "bg-pink-500/10 text-pink-400" :
                  cat.label === 'নতুন' ? "bg-orange-500/10 text-orange-400" :
                  cat.label === 'জনপ্রিয়' ? "bg-red-500/10 text-red-400" :
                  "bg-yellow-500/10 text-yellow-500"
                )}>
                  <cat.icon className="w-5 h-5" />
                </div>
                <span className="text-[9px] font-black text-gray-500 group-hover:text-white uppercase tracking-widest">{cat.label}</span>
              </button>
            ))}
          </div>
        </section>

        {/* In-Feed Ad */}
        <div className="mb-16">
          <GoogleAd type="in-feed" />
        </div>

        {/* Featured Section */}
        <section className="mb-16">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold">ফিচার্ড</h2>
            <div className="flex gap-2">
              <div className="w-2 h-2 rounded-full bg-purple-500" />
              <div className="w-2 h-2 rounded-full bg-white/10" />
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {[...MOCK_WALLPAPERS, ...dbWallpapers].filter(w => w.category === 'ফিচার্ড').map((w) => (
              <div 
                key={w.id} 
                onClick={() => setSelectedWallpaper(w)}
                className="aspect-[9/16] rounded-3xl overflow-hidden relative group cursor-pointer border border-white/5 shadow-xl"
              >
                <img src={w.url} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt={w.title} referrerPolicy="no-referrer" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
                  <p className="text-xs font-bold">{w.title}</p>
                </div>
                <div className="absolute top-3 left-3 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={(e) => { e.stopPropagation(); toggleFavorite(w.id, 'wallpaper'); }}
                    className={cn(
                      "p-2 rounded-xl backdrop-blur-md border border-white/10 transition-all",
                      favorites.some(f => f.itemId === w.id) ? "bg-rose-500 text-white border-rose-500" : "bg-black/40 text-white hover:bg-rose-500"
                    )}
                  >
                    <Heart className={cn("w-4 h-4", favorites.some(f => f.itemId === w.id) && "fill-current")} />
                  </button>
                </div>
                {w.isPremium && (
                  <div className="absolute top-3 right-3 bg-yellow-500 p-1.5 rounded-lg shadow-2xl">
                    <Sparkles className="w-3 h-3 text-black" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* New Grid */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold mb-8">নতুন আপলোড</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {[...MOCK_WALLPAPERS, ...dbWallpapers].filter(w => w.category === 'নতুন' || w.category === 'User Uploads').map((w) => (
              <div 
                key={w.id} 
                onClick={() => setSelectedWallpaper(w)}
                className="aspect-[9/16] rounded-3xl overflow-hidden relative group cursor-pointer border border-white/5 shadow-xl"
              >
                <img src={w.url} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt={w.title} referrerPolicy="no-referrer" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
                  <p className="text-xs font-bold">{w.title}</p>
                </div>
                <div className="absolute top-3 left-3 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={(e) => { e.stopPropagation(); toggleFavorite(w.id, 'wallpaper'); }}
                    className={cn(
                      "p-2 rounded-xl backdrop-blur-md border border-white/10 transition-all",
                      favorites.some(f => f.itemId === w.id) ? "bg-rose-500 text-white border-rose-500" : "bg-black/40 text-white hover:bg-rose-500"
                    )}
                  >
                    <Heart className={cn("w-4 h-4", favorites.some(f => f.itemId === w.id) && "fill-current")} />
                  </button>
                </div>
                {w.isPremium && (
                  <div className="absolute top-3 right-3 bg-yellow-500 p-1.5 rounded-lg">
                    <Sparkles className="w-3 h-3 text-black" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Popular Grid */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold mb-8">জনপ্রিয়</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {[...MOCK_WALLPAPERS, ...dbWallpapers].filter(w => w.category === 'জনপ্রিয়').map((w) => (
              <div 
                key={w.id} 
                onClick={() => setSelectedWallpaper(w)}
                className="aspect-[9/16] rounded-3xl overflow-hidden relative group cursor-pointer border border-white/5 shadow-xl"
              >
                <img src={w.url} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt={w.title} referrerPolicy="no-referrer" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
                  <p className="text-xs font-bold">{w.title}</p>
                </div>
                <div className="absolute top-3 left-3 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={(e) => { e.stopPropagation(); toggleFavorite(w.id, 'wallpaper'); }}
                    className={cn(
                      "p-2 rounded-xl backdrop-blur-md border border-white/10 transition-all",
                      favorites.some(f => f.itemId === w.id) ? "bg-rose-500 text-white border-rose-500" : "bg-black/40 text-white hover:bg-rose-500"
                    )}
                  >
                    <Heart className={cn("w-4 h-4", favorites.some(f => f.itemId === w.id) && "fill-current")} />
                  </button>
                </div>
                {w.isPremium && (
                  <div className="absolute top-3 right-3 bg-yellow-500 p-1.5 rounded-lg">
                    <Sparkles className="w-3 h-3 text-black" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Footer Ad */}
        <div className="mb-16">
          <GoogleAd type="banner" />
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white font-sans selection:bg-purple-500/30">
      {/* Toast Container */}
      <div className="fixed bottom-24 md:bottom-8 left-1/2 -translate-x-1/2 z-[200] flex flex-col gap-2 pointer-events-none w-full max-w-xs px-4">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: -20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className={cn(
                "px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 text-sm font-bold backdrop-blur-xl border",
                toast.type === 'success' ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/20" :
                toast.type === 'error' ? "bg-rose-500/20 text-rose-400 border-rose-500/20" :
                "bg-blue-500/20 text-blue-400 border-blue-500/20"
              )}
            >
              {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> :
               toast.type === 'error' ? <AlertCircle className="w-5 h-5" /> :
               <Info className="w-5 h-5" />}
              {toast.message}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Ad Overlay */}
      <AnimatePresence>
        {isShowingAd && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] bg-black flex flex-col items-center justify-center p-6"
          >
            <div className="absolute top-6 right-6 bg-white/10 px-3 py-1 rounded-full text-xs font-bold">
              বিজ্ঞাপন শেষ হবে: {adTimer} সেকেন্ডে
            </div>
            <div className="w-full max-w-sm aspect-video bg-[#1A1A1A] rounded-2xl border border-white/10 flex flex-col items-center justify-center gap-4 overflow-hidden relative">
              <img 
                src="https://images.unsplash.com/photo-1614850523296-d8c1af93d400?w=800&auto=format&fit=crop&q=60" 
                className="absolute inset-0 w-full h-full object-cover opacity-50"
                alt="Ad content"
              />
              <div className="relative z-10 text-center p-6">
                <div className="w-12 h-12 bg-purple-500 rounded-xl mx-auto mb-4 flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-bold mb-2">VibeWall Premium</h3>
                <p className="text-sm text-gray-300">এক্সক্লুসিভ ওয়ালপেপার আনলক করতে আজই যোগ দিন!</p>
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: '100%' }}
                  transition={{ duration: 5, ease: "linear" }}
                  className="h-full bg-purple-500"
                />
              </div>
            </div>
            <p className="mt-6 text-xs text-gray-500">VibeWall বিজ্ঞাপন নেটওয়ার্ক দ্বারা স্পনসর করা</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Navigation Bar */}
      <nav className="sticky top-0 z-50 bg-[#0A0A0A]/95 backdrop-blur-2xl border-b border-white/5 px-4 md:px-8 py-5">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-8">
          <div className="flex items-center gap-4 cursor-pointer group" onClick={() => { setActiveTab('ওয়ালপেপার'); setSelectedCategory(null); }}>
            <div className="w-12 h-12 rounded-2xl overflow-hidden border border-white/10 flex-shrink-0 group-hover:scale-110 transition-transform shadow-2xl bg-purple-600 flex items-center justify-center">
              <img 
                src="https://raw.githubusercontent.com/nd943894/nd943894/main/ai_4k_icon.png" 
                className="w-full h-full object-cover" 
                alt="Logo" 
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.parentElement?.classList.add('bg-gradient-to-br', 'from-purple-500', 'to-indigo-600');
                }}
              />
              <Sparkles className="w-6 h-6 text-white absolute" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-2xl font-black tracking-tighter bg-gradient-to-r from-white via-white to-gray-500 bg-clip-text text-transparent">VibeWall</h1>
              <p className="text-[10px] text-purple-500 font-bold uppercase tracking-[0.2em] -mt-1">AI 4K Portal</p>
            </div>
          </div>

          <div className="hidden lg:flex items-center gap-10">
            {((profile?.role === 'admin' || user?.email === 'nd943894@gmail.com') ? [...TABS, 'অ্যাডমিন'] : TABS).map((tab) => (
              <button
                key={tab}
                onClick={() => { setActiveTab(tab); setSelectedCategory(null); }}
                className={cn(
                  "text-sm font-black uppercase tracking-widest transition-all hover:text-white relative py-2",
                  activeTab === tab ? "text-purple-500" : "text-gray-500"
                )}
              >
                {tab}
                {activeTab === tab && (
                  <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-500 rounded-full" />
                )}
              </button>
            ))}
          </div>

          <div className="flex-1 max-w-md hidden md:block">
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within:text-purple-500 transition-colors" />
              <input 
                type="text"
                placeholder="ওয়ালপেপার বা রিংটোন খুঁজুন..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 pl-12 pr-4 text-sm focus:outline-none focus:border-purple-500/50 focus:bg-white/10 transition-all"
              />
            </div>
          </div>

          <div className="flex items-center gap-6">
            {!user ? (
              <button 
                onClick={handleSignIn}
                className="hidden sm:flex items-center gap-2 bg-purple-600 text-white px-6 py-2.5 rounded-2xl font-black text-sm hover:bg-purple-700 transition-all transform hover:scale-105 shadow-xl shadow-purple-500/20"
              >
                <LogIn className="w-4 h-4" />
                সাইন ইন
              </button>
            ) : (
              <button 
                onClick={handleSignOut}
                className="hidden sm:flex items-center gap-2 bg-white/5 text-gray-400 px-6 py-2.5 rounded-2xl font-black text-sm hover:bg-white/10 transition-all border border-white/10"
              >
                <LogOut className="w-4 h-4" />
                সাইন আউট
              </button>
            )}

            <button 
              onClick={autoUpdatePro}
              className={cn(
                "hidden sm:flex items-center gap-2 px-6 py-2.5 rounded-2xl font-black text-sm transition-all transform hover:scale-105 shadow-xl",
                isPro ? "bg-purple-600 text-white shadow-purple-500/20" : "bg-yellow-500 text-black shadow-yellow-500/20"
              )}
            >
              <Sparkles className="w-4 h-4" />
              {isPro ? 'প্রো সক্রিয়' : 'প্রো হন'}
            </button>

            <div className="hidden sm:flex items-center gap-3 bg-yellow-500/10 px-5 py-2.5 rounded-2xl border border-yellow-500/20">
              <div className="w-5 h-5 bg-yellow-500 rounded-full flex items-center justify-center text-[10px] text-black font-black">Z</div>
              <span className="text-lg font-black text-yellow-500">{coins}</span>
            </div>
            
            <button 
              onClick={() => setIsUploadModalOpen(true)}
              className="hidden sm:flex items-center gap-2 bg-white text-black px-6 py-2.5 rounded-2xl font-black text-sm hover:bg-gray-200 transition-all transform hover:scale-105 shadow-xl"
            >
              <Upload className="w-4 h-4" />
              আপলোড
            </button>

            <div className="relative">
              <button 
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className={cn(
                  "w-12 h-12 rounded-2xl flex items-center justify-center transition-all border",
                  activeTab === 'আমার ভাইব' || isUserMenuOpen ? "bg-purple-500 border-purple-400 text-white shadow-lg shadow-purple-500/20" : "bg-white/5 border-white/5 text-gray-400 hover:text-white hover:bg-white/10"
                )}
              >
                {user?.photoURL ? (
                  <img src={user.photoURL} className="w-8 h-8 rounded-full object-cover" alt="User" />
                ) : (
                  <UserIcon className="w-6 h-6" />
                )}
              </button>

              <AnimatePresence>
                {isUserMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 mt-4 w-64 bg-[#1A1A1A] border border-white/10 rounded-3xl shadow-2xl overflow-hidden z-[100]"
                  >
                    <div className="p-6 border-b border-white/5 bg-white/5">
                      <p className="text-sm font-black truncate">{user?.displayName || 'ভাইব ইউজার'}</p>
                      <p className="text-[10px] text-gray-500 truncate">{user?.email}</p>
                    </div>
                    <div className="p-2">
                      <button 
                        onClick={() => { setActiveTab('আমার ভাইব'); setIsUserMenuOpen(false); }}
                        className="w-full flex items-center gap-4 p-4 rounded-2xl text-sm font-bold hover:bg-white/5 transition-all text-left"
                      >
                        <UserIcon className="w-5 h-5 text-purple-500" />
                        আমার প্রোফাইল
                      </button>
                      <button 
                        onClick={() => { setIsSettingsModalOpen(true); setIsUserMenuOpen(false); }}
                        className="w-full flex items-center gap-4 p-4 rounded-2xl text-sm font-bold hover:bg-white/5 transition-all text-left"
                      >
                        <Settings className="w-5 h-5 text-gray-400" />
                        সেটিংস
                      </button>
                      <div className="h-px bg-white/5 my-2 mx-4" />
                      <button 
                        onClick={() => { handleSignOut(); setIsUserMenuOpen(false); }}
                        className="w-full flex items-center gap-4 p-4 rounded-2xl text-sm font-bold hover:bg-rose-500/10 text-rose-400 transition-all text-left"
                      >
                        <LogOut className="w-5 h-5" />
                        লগআউট
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <button 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center border border-white/5 hover:bg-white/10 transition-all"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu Overlay */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="lg:hidden bg-[#0A0A0A] border-t border-white/5 overflow-hidden"
            >
              <div className="p-6 space-y-4">
                <div className="relative mb-6">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <input 
                    type="text"
                    placeholder="খুঁজুন..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 pl-12 pr-4 text-sm focus:outline-none focus:border-purple-500/50"
                  />
                </div>
                
                <div className="grid grid-cols-1 gap-2">
                  {((profile?.role === 'admin' || user?.email === 'nd943894@gmail.com') ? [...TABS, 'অ্যাডমিন'] : TABS).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => { setActiveTab(tab); setSelectedCategory(null); setIsMobileMenuOpen(false); }}
                      className={cn(
                        "flex items-center gap-4 p-4 rounded-2xl text-sm font-black uppercase tracking-widest transition-all",
                        activeTab === tab ? "bg-purple-600 text-white" : "bg-white/5 text-gray-400"
                      )}
                    >
                      {tab === 'ওয়ালপেপার' && <ImageIcon className="w-5 h-5" />}
                      {tab === 'এআই জেনারেটর' && <Sparkles className="w-5 h-5" />}
                      {tab === 'রিংটোন' && <Music className="w-5 h-5" />}
                      {tab === 'আমার ভাইব' && <UserIcon className="w-5 h-5" />}
                      {tab}
                    </button>
                  ))}
                  {user && (
                    <button
                      onClick={() => { setIsSettingsModalOpen(true); setIsMobileMenuOpen(false); }}
                      className="flex items-center gap-4 p-4 rounded-2xl text-sm font-black uppercase tracking-widest bg-white/5 text-gray-400 transition-all"
                    >
                      <Settings className="w-5 h-5" />
                      সেটিংস
                    </button>
                  )}
                </div>

                <div className="pt-4 border-t border-white/5 grid grid-cols-2 gap-3">
                  {!user ? (
                    <button 
                      onClick={() => { handleSignIn(); setIsMobileMenuOpen(false); }}
                      className="flex items-center justify-center gap-2 bg-purple-600 text-white p-4 rounded-2xl font-black text-sm"
                    >
                      <LogIn className="w-4 h-4" />
                      সাইন ইন
                    </button>
                  ) : (
                    <button 
                      onClick={() => { handleSignOut(); setIsMobileMenuOpen(false); }}
                      className="flex items-center justify-center gap-2 bg-white/5 text-gray-400 p-4 rounded-2xl font-black text-sm border border-white/10"
                    >
                      <LogOut className="w-4 h-4" />
                      সাইন আউট
                    </button>
                  )}
                  <button 
                    onClick={() => { autoUpdatePro(); setIsMobileMenuOpen(false); }}
                    className={cn(
                      "flex items-center justify-center gap-2 p-4 rounded-2xl font-black text-sm",
                      isPro ? "bg-purple-600 text-white" : "bg-yellow-500 text-black"
                    )}
                  >
                    <Sparkles className="w-4 h-4" />
                    {isPro ? 'প্রো' : 'প্রো হন'}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      <main className="max-w-7xl mx-auto px-4 md:px-8">
        {renderContent()}
      </main>

      {/* Website Footer */}
      <footer className="mt-20 py-16 border-t border-white/5 bg-[#0D0D0D] pb-32 md:pb-16">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl overflow-hidden border border-white/10 bg-purple-600 flex items-center justify-center relative">
                  <img 
                    src="https://raw.githubusercontent.com/nd943894/nd943894/main/ai_4k_icon.png" 
                    className="w-full h-full object-cover" 
                    alt="Logo" 
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                  <Sparkles className="w-5 h-5 text-white absolute" />
                </div>
                <span className="text-2xl font-bold">VibeWall</span>
              </div>
              <p className="text-gray-500 max-w-sm leading-relaxed">
                আপনার স্ক্রিনকে দিন এক নতুন মাত্রা। হাজার হাজার ৪কে এআই-জেনারেটেড ওয়ালপেপার এবং রিংটোন সংগ্রহ থেকে আপনার প্রিয়টি বেছে নিন।
              </p>
            </div>
            <div>
              <h4 className="font-bold mb-6 uppercase text-xs tracking-widest text-gray-400">লিঙ্ক</h4>
              <ul className="space-y-4 text-sm text-gray-500">
                <li><button onClick={() => setActiveTab('ওয়ালপেপার')} className="hover:text-white transition-colors">ওয়ালপেপার</button></li>
                <li><button onClick={() => setActiveTab('এআই জেনারেটর')} className="hover:text-white transition-colors">এআই জেনারেটর</button></li>
                <li><button onClick={() => setActiveTab('রিংটোন')} className="hover:text-white transition-colors">রিংটোন</button></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-6 uppercase text-xs tracking-widest text-gray-400">আইনি</h4>
              <ul className="space-y-4 text-sm text-gray-500">
                <li><a href="#" className="hover:text-white transition-colors">গোপনীয়তা নীতি</a></li>
                <li><a href="#" className="hover:text-white transition-colors">পরিষেবার শর্তাবলী</a></li>
                <li><a href="#" className="hover:text-white transition-colors">কপিরাইট</a></li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-xs text-gray-600">© ২০২৬ VibeWall। সমস্ত অধিকার সংরক্ষিত।</p>
            <div className="flex gap-6">
              {/* Social icons could go here */}
            </div>
          </div>
        </div>
      </footer>

      {/* Wallpaper Detail Overlay */}
      <AnimatePresence>
        {selectedWallpaper && (
          <motion.div 
            initial={{ opacity: 0, y: '100%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: '100%' }}
            className="fixed inset-0 z-[100] bg-black"
          >
            <img 
              src={selectedWallpaper.url} 
              alt={selectedWallpaper.title} 
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40" />
            
            <button 
              onClick={() => setSelectedWallpaper(null)}
              className="absolute top-6 left-6 p-3 bg-black/40 backdrop-blur-md rounded-full"
            >
              <X className="w-6 h-6" />
            </button>

            <div className="absolute bottom-10 left-6 right-6">
              <h2 className="text-3xl font-bold mb-2">{selectedWallpaper.title}</h2>
              <p className="text-gray-300 mb-8">{selectedWallpaper.category} সংগ্রহ</p>
              
            <div className="flex gap-4">
              {(!selectedWallpaper.isPremium || unlockedItems.includes(selectedWallpaper.id)) ? (
                <button 
                  onClick={() => handleDownload(selectedWallpaper.url, `${selectedWallpaper.title}.jpg`)}
                  className="flex-1 bg-white text-black py-4 rounded-2xl font-bold flex items-center justify-center gap-2"
                >
                  <Zap className="w-5 h-5" />
                  ডাউনলোড করে সেট করুন
                </button>
              ) : (
                <button 
                  onClick={() => unlockItem(selectedWallpaper.id, 100)}
                  className="flex-1 bg-gradient-to-r from-yellow-500 to-orange-500 text-black py-4 rounded-2xl font-bold flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-5 h-5" />
                  ১০০ Z দিয়ে আনলক করুন
                </button>
              )}
              <button 
                onClick={() => toggleFavorite(selectedWallpaper.id, 'wallpaper')}
                className={cn(
                  "w-16 h-16 rounded-2xl flex items-center justify-center transition-all backdrop-blur-md border border-white/10",
                  favorites.some(f => f.itemId === selectedWallpaper.id) ? "bg-rose-500 text-white border-rose-500" : "bg-white/10 text-white hover:bg-rose-500"
                )}
              >
                <Heart className={cn("w-6 h-6", favorites.some(f => f.itemId === selectedWallpaper.id) && "fill-current")} />
              </button>
              <button 
                onClick={() => shareToPinterest(window.location.href, selectedWallpaper.url, `VibeWall ওয়ালপেপার: ${selectedWallpaper.title}`)}
                className="w-16 h-16 bg-red-600 rounded-2xl flex items-center justify-center transition-all shadow-lg hover:bg-red-700"
                title="Pinterest-এ পিন করুন"
              >
                <Share2 className="w-6 h-6 text-white" />
              </button>
              <button 
                onClick={() => handleDownload(selectedWallpaper.url, `${selectedWallpaper.title}.jpg`)}
                className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/10"
              >
                <Download className="w-6 h-6" />
              </button>
            </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Upload Modal */}
      <AnimatePresence>
        {isUploadModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] bg-black/90 backdrop-blur-md flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 40 }}
              animate={{ scale: 1, y: 0 }}
              className="w-full max-w-xl bg-[#1A1A1A] rounded-[40px] p-12 border border-white/10 shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-12 opacity-5">
                <Upload className="w-48 h-48" />
              </div>

              <div className="relative z-10">
                <div className="flex justify-between items-center mb-10">
                  <div>
                    <h2 className="text-3xl font-black mb-2">কন্টেন্ট আপলোড করুন</h2>
                    <p className="text-gray-500">আপনার সৃষ্টি বিশ্বের সাথে শেয়ার করুন</p>
                  </div>
                  <button onClick={() => setIsUploadModalOpen(false)} className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-gray-400 hover:text-white transition-colors">
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <div className="flex gap-4 mb-8">
                  {[
                    { id: 'wallpaper', label: 'ওয়ালপেপার', icon: ImageIcon },
                    { id: 'ringtone', label: 'রিংটোন', icon: Music },
                  ].map((type) => (
                    <button 
                      key={type.id}
                      onClick={() => setUploadType(type.id as any)}
                      className={cn(
                        "flex-1 py-6 rounded-3xl font-black flex flex-col items-center gap-3 border transition-all",
                        uploadType === type.id ? "bg-purple-600 border-purple-400 text-white shadow-lg shadow-purple-500/20" : "bg-black/40 border-white/5 text-gray-500 hover:border-white/20"
                      )}
                    >
                      <type.icon className="w-8 h-8" />
                      {type.label}
                    </button>
                  ))}
                </div>

                <div className="space-y-6 mb-10">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-3 uppercase tracking-widest">কন্টেন্টের শিরোনাম</label>
                    <input 
                      type="text"
                      value={uploadTitle}
                      onChange={(e) => setUploadTitle(e.target.value)}
                      placeholder="যেমন: কৃষ্ণের ছবি, প্রকৃতির সুর..."
                      className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 focus:outline-none focus:border-purple-500 transition-all"
                    />
                  </div>

                  <label className="block group">
                    <div className="w-full aspect-[21/9] rounded-[32px] border-2 border-dashed border-white/10 flex flex-col items-center justify-center gap-4 cursor-pointer group-hover:border-purple-500/50 transition-all bg-black/40 relative overflow-hidden">
                      {isUploading ? (
                        <div className="flex flex-col items-center justify-center w-full px-12">
                          <div className="w-14 h-14 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mb-4"></div>
                          <p className="text-lg font-bold mb-2">আপলোড হচ্ছে... {Math.round(uploadProgress)}%</p>
                          <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-purple-500 transition-all duration-300"
                              style={{ width: `${uploadProgress}%` }}
                            ></div>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="w-14 h-14 bg-purple-500/10 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                            {uploadType === 'wallpaper' ? <ImageIcon className="w-7 h-7 text-purple-500" /> : <Music className="w-7 h-7 text-purple-500" />}
                          </div>
                          <div className="text-center">
                            <p className="text-lg font-bold mb-1">ফাইল এখানে ছাড়ুন বা আপলোড করতে ক্লিক করুন</p>
                            <p className="text-xs text-gray-500">সর্বোচ্চ সাইজ: ২০এমবি (JPG, PNG, MP3)</p>
                          </div>
                        </>
                      )}
                    </div>
                    <input 
                      type="file" 
                      className="hidden" 
                      accept={uploadType === 'wallpaper' ? "image/*" : "audio/*"}
                      onChange={handleFileUpload}
                      disabled={isUploading}
                    />
                  </label>
                </div>

                <div className="flex items-center gap-4 p-6 bg-white/5 rounded-3xl border border-white/5">
                  <Info className="w-6 h-6 text-purple-400 flex-shrink-0" />
                  <p className="text-xs text-gray-500 leading-relaxed">
                    আপলোড করার মাধ্যমে, আপনি আমাদের ব্যবহারের শর্তাবলী এবং কন্টেন্ট নির্দেশিকাগুলির সাথে সম্মত হন। কপিরাইট আইন মেনে চলুন।
                  </p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Settings Modal */}
      <AnimatePresence>
        {isSettingsModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[250] bg-black/80 backdrop-blur-xl flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="w-full max-w-lg bg-[#111] border border-white/10 rounded-[40px] shadow-2xl overflow-hidden"
            >
              <div className="p-8 border-b border-white/5 flex items-center justify-between bg-white/5">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-purple-500/10 rounded-2xl flex items-center justify-center border border-purple-500/20">
                    <Settings className="w-6 h-6 text-purple-500" />
                  </div>
                  <h2 className="text-2xl font-black">সেটিংস</h2>
                </div>
                <button 
                  onClick={() => setIsSettingsModalOpen(false)}
                  className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-all"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-8 space-y-8">
                <div>
                  <label className="block text-[10px] font-black text-gray-500 mb-4 uppercase tracking-[0.2em]">আপনার নাম</label>
                  <div className="relative group">
                    <UserIcon className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within:text-purple-500 transition-colors" />
                    <input 
                      type="text"
                      value={tempDisplayName}
                      onChange={(e) => setTempDisplayName(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-14 pr-6 text-sm focus:outline-none focus:border-purple-500/50 focus:bg-white/10 transition-all"
                      placeholder="আপনার নাম লিখুন"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <div className="p-6 bg-white/5 rounded-3xl border border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center">
                        <Info className="w-5 h-5 text-blue-400" />
                      </div>
                      <div>
                        <p className="text-sm font-bold">ডার্ক মোড</p>
                        <p className="text-[10px] text-gray-500">ডিফল্টভাবে সক্রিয়</p>
                      </div>
                    </div>
                    <div className="w-12 h-6 bg-purple-600 rounded-full relative">
                      <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full" />
                    </div>
                  </div>

                  <div className="p-6 bg-white/5 rounded-3xl border border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center">
                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      </div>
                      <div>
                        <p className="text-sm font-bold">নোটিফিকেশন</p>
                        <p className="text-[10px] text-gray-500">নতুন কন্টেন্ট আপডেট</p>
                      </div>
                    </div>
                    <div className="w-12 h-6 bg-purple-600 rounded-full relative">
                      <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full" />
                    </div>
                  </div>
                </div>

                <div className="pt-4 flex gap-4">
                  <button 
                    onClick={() => setIsSettingsModalOpen(false)}
                    className="flex-1 bg-white/5 hover:bg-white/10 text-white py-4 rounded-2xl font-black text-sm transition-all"
                  >
                    বাতিল
                  </button>
                  <button 
                    onClick={updateProfile}
                    className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-4 rounded-2xl font-black text-sm transition-all shadow-xl shadow-purple-500/20"
                  >
                    সংরক্ষণ করুন
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Redundant Bottom Nav Removed for Website Layout */}
      <nav className="fixed bottom-0 left-0 right-0 bg-[#0A0A0A]/95 backdrop-blur-2xl border-t border-white/5 px-4 py-4 flex justify-between items-center z-50 lg:hidden">
        {((profile?.role === 'admin' || user?.email === 'nd943894@gmail.com') ? [...TABS, 'অ্যাডমিন'] : TABS).map((tab) => {
          const Icon = tab === 'ওয়ালপেপার' ? ImageIcon : 
                       tab === 'এআই জেনারেটর' ? Sparkles : 
                       tab === 'রিংটোন' ? Music : 
                       tab === 'অ্যাডমিন' ? Settings : UserIcon;
          return (
            <button
              key={tab}
              onClick={() => { setActiveTab(tab); setSelectedCategory(null); }}
              className={cn(
                "flex flex-col items-center gap-1 transition-all",
                activeTab === tab ? "text-purple-500 scale-110" : "text-gray-400"
              )}
            >
              <Icon className="w-6 h-6" />
              <span className="text-[9px] font-bold">{tab}</span>
            </button>
          );
        })}
        <button
          onClick={() => setIsUploadModalOpen(true)}
          className="flex flex-col items-center gap-1 text-purple-500"
        >
          <div className="w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center text-white shadow-lg -mt-8 border-4 border-[#0A0A0A]">
            <Upload className="w-5 h-5" />
          </div>
          <span className="text-[9px] font-bold">আপলোড</span>
        </button>
      </nav>
    </div>
  );
}
