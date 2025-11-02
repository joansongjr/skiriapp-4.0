export interface Photo {
  id: string;
  userId: string;
  imageUrl: string;
  thumbnailUrl?: string;
  createdAt: Date;
  storagePath: string;
}

export interface User {
  uid: string;
  isAnonymous: boolean;
}

