export interface Image {
  id: string;
  url: string;
  urls?: string[]; // Multiple images/videos in one post
  externalLink?: string; // Pinterest, etc.
  thumbnailUrl?: string;
  type: 'image' | 'video';
  title: string;
  description: string;
  category: string;
  tags: string[];
  sceneContext?: string;
  likes: number;
  timestamp: any;
  userId?: string;
  uploaderName?: string;
  uploaderEmail?: string;
  uploaderPhotoURL?: string;
  reportCount?: number;
  isPremium?: boolean;
  isSample?: boolean;
  aspectRatio?: 'portrait' | 'landscape' | 'square' | 'ultrawide';
}

export interface Category {
  id: string;
  name: string;
  slug: string;
}

export interface User {
  uid: string;
  email: string | null;
  isAdmin: boolean;
  displayName?: string | null;
  photoURL?: string | null;
  isPremium?: boolean;
  isPremiumPending?: boolean;
  isBanned?: boolean;
  isHold?: boolean;
  status?: string;
  banReason?: string;
  holdReason?: string;
  createdAt?: any;
  subscriptionPlan: string | null;
  bio?: string | null;
  location?: string | null;
  website?: string | null;
  gender?: 'male' | 'female' | 'other' | 'prefer-not-to-say' | null;
  dob?: string | null;
  occupation?: string | null;
  theme?: string;
  hasSeenOnboarding?: boolean;
  followerCountOverride?: number;
  followingCountOverride?: number;
  fakeFollowers?: Array<{ uid: string; displayName: string; photoURL: string; email?: string; bio?: string; location?: string; isFake?: boolean }>;
  fakeFollowing?: Array<{ uid: string; displayName: string; photoURL: string; email?: string; bio?: string; location?: string; isFake?: boolean }>;
  emailVerified?: boolean;
  emailVerifiedAt?: any;
}

export interface UserProfile extends User {
  likedImages: string[];
  collections: string[];
}

export interface Collection {
  id: string;
  name: string;
  title?: string;
  description?: string;
  coverUrl?: string;
  userId: string;
  imageIds: string[];
  isPublic?: boolean;
  timestamp: any;
}

export interface Comment {
  id: string;
  imageId: string;
  userId: string;
  userName: string;
  userPhoto?: string;
  text: string;
  timestamp: any;
  replies?: Comment[];
}

export interface Report {
  id: string;
  imageId: string;
  userId: string;
  type: 'broken' | 'inappropriate' | 'spam';
  timestamp: any;
  status: 'pending' | 'actioned' | 'ignored';
  imageUrl?: string;
  reason?: string;
  details?: string;
  reporterEmail?: string;
}

export interface SocialLink {
  name: string;
  url: string;
  icon?: string;
  color?: string;
}

export interface PaymentRequest {
  id: string;
  userId: string;
  userEmail: string;
  plan: string;
  screenshotUrl: string;
  timestamp: any;
  status: 'pending' | 'approved' | 'rejected';
}

export interface Follow {
  id: string;
  followerId: string;
  followingId: string;
  timestamp: any;
}

export interface DeveloperProfile {
  name: string;
  bio: string[];
  photoUrl: string;
  contactEmail: string;
  tags: string[];
  socials: SocialLink[];
  streaming: SocialLink[];
}
