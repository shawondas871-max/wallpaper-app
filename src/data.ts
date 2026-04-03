export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  coins: number;
  isPro: boolean;
  role: 'admin' | 'user';
  createdAt: any;
  lastLoginDate?: string;
}

export interface Favorite {
  id: string;
  userId: string;
  itemId: string;
  itemType: 'wallpaper' | 'ringtone';
  createdAt: any;
}

export interface Wallpaper {
  id: string;
  url: string;
  title: string;
  category: string;
  isPremium?: boolean;
  type?: 'static' | 'video' | 'dual' | '24h';
  authorId?: string;
  authorName?: string;
  createdAt?: any;
  views?: number;
  likes?: number;
  downloads?: number;
  tags?: string[];
}

export interface Collection {
  id: string;
  title: string;
  coverUrl: string;
  count: number;
}

export interface Ringtone {
  id: string;
  title: string;
  duration: string;
  category: string;
  isPremium?: boolean;
  url?: string;
  authorId?: string;
  authorName?: string;
  createdAt?: any;
  tags?: string[];
  views?: number;
  downloads?: number;
  count?: number; // For trending sort
}

export interface WallpaperPack {
  id: string;
  title: string;
  description: string;
  coverUrl: string;
  count: number;
  isPremium: boolean;
}

export const MOCK_WALLPAPERS: Wallpaper[] = [
  { id: '1', title: 'ছোট্ট দুষ্টু পোষা প্রাণী', url: 'https://picsum.photos/seed/cat/400/600', category: 'ফিচার্ড', type: 'static', tags: ['Cute', 'Animal', 'Pet'], views: 1200, likes: 450, downloads: 300 },
  { id: '2', title: 'সপ্তাহের সেরা শিল্পী', url: 'https://picsum.photos/seed/art/400/600', category: 'ফিচার্ড', type: 'static', tags: ['Art', 'Creative', 'Design'], views: 3400, likes: 1200, downloads: 800 },
  { id: '3', title: 'ফুংলা', url: 'https://picsum.photos/seed/mushroom/400/600', category: 'ফিচার্ড', type: 'static', tags: ['Nature', 'Macro', 'Forest'], views: 800, likes: 200, downloads: 150 },
  { id: '4', title: 'স্পোর্টস কার', url: 'https://picsum.photos/seed/car/400/600', category: 'জনপ্রিয়', type: 'static', tags: ['Car', 'Sports', 'Speed'], views: 5600, likes: 2300, downloads: 1500 },
  { id: '5', title: 'বেগুনি অ্যাবস্ট্রাক্ট', url: 'https://picsum.photos/seed/abstract/400/600', category: 'জনপ্রিয়', type: 'static', tags: ['Abstract', 'Purple', 'Dark'], views: 4200, likes: 1800, downloads: 1200 },
  { id: '6', title: 'বসন্তের ভালোবাসা', url: 'https://picsum.photos/seed/flower/400/600', category: 'জনপ্রিয়', type: 'static', tags: ['Flower', 'Spring', 'Love'], views: 2100, likes: 900, downloads: 600 },
  { id: '7', title: 'বুদবুদ', url: 'https://picsum.photos/seed/bubbles/400/600', category: 'সংগ্রহ', type: 'static', tags: ['Abstract', 'Water', 'Blue'], views: 1500, likes: 600, downloads: 400 },
  { id: '8', title: 'নিয়ন সিটি', url: 'https://picsum.photos/seed/neon/400/600', category: 'জনপ্রিয়', type: 'static', tags: ['City', 'Neon', 'Dark'], views: 6700, likes: 3100, downloads: 2200 },
  { id: '9', title: 'পাহাড়ের চূড়া', url: 'https://picsum.photos/seed/mountain/400/600', category: 'নতুন', type: 'static', tags: ['Mountain', 'Nature', 'Landscape'], views: 900, likes: 300, downloads: 200 },
  { id: '10', title: 'সমুদ্রের ঢেউ', url: 'https://picsum.photos/seed/ocean/400/600', category: 'নতুন', type: 'static', tags: ['Ocean', 'Water', 'Nature'], views: 1100, likes: 400, downloads: 250 },
  { id: '11', title: 'সাইবারপাঙ্ক মেয়ে', url: 'https://picsum.photos/seed/cyber/400/600', category: 'এক্সক্লুসিভ', isPremium: true, type: 'static' },
  { id: '12', title: 'গোধূলি বেলা', url: 'https://picsum.photos/seed/golden/400/600', category: 'এক্সক্লুসিভ', isPremium: true, type: 'static' },
  { id: '13', title: 'ম্যাট্রিক্স বৃষ্টি', url: 'https://picsum.photos/seed/matrix/400/600', category: 'ভিডিও', type: 'video' },
  { id: '14', title: 'মহাকাশ ভ্রমণ', url: 'https://picsum.photos/seed/space/400/600', category: 'ভিডিও', type: 'video' },
  { id: '15', title: 'দিন ও রাত', url: 'https://picsum.photos/seed/daynight/400/600', category: 'ডুয়াল', type: 'dual' },
  { id: '16', title: 'সূর্যোদয় থেকে সূর্যাস্ত', url: 'https://picsum.photos/seed/sun/400/600', category: '২৪ ঘণ্টা', type: '24h' },
];

export const MOCK_COLLECTIONS: Collection[] = [
  { id: 'c1', title: 'বুদবুদ বুদবুদ বুদবুদ!', coverUrl: 'https://picsum.photos/seed/b1/400/600', count: 124 },
  { id: 'c2', title: 'স্পোর্টস কার', coverUrl: 'https://picsum.photos/seed/b2/400/600', count: 85 },
  { id: 'c3', title: 'বেগুনি অ্যাবস্ট্রাক্ট', coverUrl: 'https://picsum.photos/seed/b3/400/600', count: 210 },
  { id: 'c4', title: 'প্রকৃতিতে', coverUrl: 'https://picsum.photos/seed/b4/400/600', count: 156 },
  { id: 'c5', title: 'মিনিমালিস্ট', coverUrl: 'https://picsum.photos/seed/b5/400/600', count: 92 },
];

export const MOCK_RINGTONES: Ringtone[] = [
  { id: 'r1', title: 'নিয়ন পালস', duration: '0:24', category: 'ইলেকট্রনিক', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', tags: ['Electronic', 'Beat', 'Fast'], views: 1500, downloads: 450, count: 1950 },
  { id: 'r2', title: 'ভোরের শিশির', duration: '0:15', category: 'প্রকৃতি', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3', tags: ['Nature', 'Morning', 'Calm'], views: 800, downloads: 200, count: 1000 },
  { id: 'r3', title: 'সাইবারপাঙ্ক বিট', duration: '0:30', category: 'সাই-ফাই', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3', tags: ['Sci-Fi', 'Cyberpunk', 'Bass'], views: 3200, downloads: 1200, count: 4400 },
  { id: 'r4', title: 'অ্যাকোস্টিক সোল', duration: '0:22', category: 'অ্যাকোস্টিক', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3', tags: ['Acoustic', 'Guitar', 'Soul'], views: 2100, downloads: 600, count: 2700 },
  { id: 'r5', title: 'জেন গার্ডেন', duration: '0:45', category: 'রিলাক্সেশন', isPremium: true, url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3', tags: ['Relax', 'Zen', 'Meditation'], views: 5000, downloads: 2500, count: 7500 },
  { id: 'r6', title: 'বজ্রপাত', duration: '0:35', category: 'প্রকৃতি', isPremium: true, url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3', tags: ['Nature', 'Thunder', 'Rain'], views: 4100, downloads: 1800, count: 5900 },
  { id: 'r7', title: 'রেট্রো আর্কেড', duration: '0:18', category: 'গেমিং', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3', tags: ['Gaming', 'Retro', '8-bit'], views: 1200, downloads: 300, count: 1500 },
  { id: 'r8', title: 'লো-ফাই চিল', duration: '0:28', category: 'লো-ফাই', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3', tags: ['Lo-Fi', 'Chill', 'Study'], views: 2800, downloads: 900, count: 3700 },
];

export const MOCK_PACKS: WallpaperPack[] = [
  { 
    id: 'p1', 
    title: '50+ HD 4K AI PACK', 
    description: 'প্রিমিয়াম এআই জেনারেটেড ৪কে ওয়ালপেপার প্যাক। নিয়ন আর্ট এবং ফিউচারিস্টিক ডিজাইন।', 
    coverUrl: 'https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?w=800&auto=format&fit=crop&q=80', 
    count: 52,
    isPremium: true
  },
  { 
    id: 'p2', 
    title: 'NATURE SERENITY PACK', 
    description: 'প্রকৃতির শান্ত এবং মনোরম দৃশ্যের সেরা সংগ্রহ।', 
    coverUrl: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=800&auto=format&fit=crop&q=80', 
    count: 35,
    isPremium: false
  },
  { 
    id: 'p3', 
    title: 'MINIMAL DARK PACK', 
    description: 'অ্যামোলেড ডিসপ্লের জন্য সেরা মিনিমালিস্ট ডার্ক ওয়ালপেপার।', 
    coverUrl: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=800&auto=format&fit=crop&q=80', 
    count: 28,
    isPremium: true
  }
];
