
export type AdvertisementManifest = {
  date: string;
  items: AdvertisementItem[];
};

export type AdvertisementItemType = "IMAGE" | "VIDEO";

export type DayOfWeekApiEnum =
  | "MONDAY"
  | "TUESDAY"
  | "WEDNESDAY"
  | "THURSDAY"
  | "FRIDAY"
  | "SATURDAY"
  | "SUNDAY";

export type RecurrenceApiDTO = {
  startDate?: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
  allowedDays?: DayOfWeekApiEnum[];
  intervalValue?: number; // em dias
  dailyDisplayCount?: number; // vezes por dia
};

export type AdvertisementItem = {
  advertisementId: number;
  type: AdvertisementItemType;
  dailyDisplayCount: number;
  assets: AdvertisementAsset[];
};

export type AdvertisementAsset = {
  path: string;
  orderIndex: number | null;
  durationSeconds: number;
};

export interface AdvertisementImageApiDTO {
  id?: number;
  image?: File;
  imageUrl?: string;
  displaySeconds: number;
  orderIndex: number;
}

export interface AdvertisementApiDTO {
  id?: number;
  customerId: number;
  name: string;
  type: AdvertisementItemType;
  active: boolean;
  recurrence?: RecurrenceApiDTO;
  showSocialAtEnd?: boolean;
  images?: AdvertisementImageApiDTO[];
  video?: File;
  videoUrl?: string;
  videoDurationSeconds?: number;
}
