export type AppAuthUser = {
  id: number;
  username: string;
  email: string | null;
  mobile: string | null;
  avatar: string | null;
  score: number;
  money: number;
  vipEndTime: number | null;
};

export type AppAuthResult = {
  token: string;
  expiresIn: number;
  user: AppAuthUser;
};

export type AppApiEnvelope = {
  code?: unknown;
  msg?: unknown;
  data?: unknown;
};

