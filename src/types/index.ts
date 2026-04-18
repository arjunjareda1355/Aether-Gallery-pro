export interface Image {
  id: string;
  url: string;
  thumbnailUrl?: string;
  type: 'image' | 'video';
  title: string;
  description: string;
  category: string;
  tags: string[];
  likes: number;
  timestamp: any;
  userId?: string;
  reportCount?: number;
  isPremium?: boolean;
  isSample?: boolean;
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
  displayName?: string;
  photoURL?: string;
  isPremium?: boolean;
  isPremiumPending?: boolean;
  subscriptionPlan?: string;
}

export interface UserProfile extends User {
  likedImages: string[];
  collections: string[];
}

export interface Collection {
  id: string;
  name: string;
  userId: string;
  imageIds: string[];
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

export interface DeveloperProfile {
  name: string;
  bio: string[];
  photoUrl: string;
  contactEmail: string;
  tags: string[];
  socials: SocialLink[];
  streaming: SocialLink[];
}
