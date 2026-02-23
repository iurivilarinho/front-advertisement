export type AdvertisementManifest = {
  date: string;
  items: AdvertisementItem[];
};

export type AdvertisementItemType = "IMAGE" | "VIDEO";

export type AdvertisementItem = {
  advertisementId: number;
  type: AdvertisementItemType;
  maxShowsPerDay: number;
  assets: AdvertisementAsset[];
};

export type AdvertisementAsset = {
  path: string;
  orderIndex: number | null;
  durationSeconds: number;
};

export interface AdvertisementImageApiDTO {
  id: number;
  imageUrl?: string;
  displaySeconds: number;
  orderIndex: number;
}

export interface AdvertisementApiDTO {
  id: number;
  customerId: number;
  name: string;
  type: AdvertisementItemType;
  active: boolean;
  validFrom: string; // YYYY-MM-DD
  validTo: string; // YYYY-MM-DD
  maxShowsPerDay: number;
  allowedDays: string[]; // MONDAY...
  showSocialAtEnd?: boolean;

  images?: AdvertisementImageApiDTO[];

  videoUrl?: string;
  videoDurationSeconds?: number;
}
