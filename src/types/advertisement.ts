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
