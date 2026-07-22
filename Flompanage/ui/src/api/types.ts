export type Role = "USER" | "MODERATOR" | "ADMIN" | "SUPER_ADMIN";
export type VideoStatus = "PENDING" | "PROCESSING" | "APPROVED" | "REJECTED";

export type AdminUser = { id: string; email: string; username: string; role: Role; avatarPath?: string | null };
export type SiteStats = {
  totalVideos: number;
  totalViews: number;
  totalUsers: number;
  pendingCount: number;
  registeredUserCount: number;
  latestRegisteredUsername: string | null;
};

export type NotificationPollSnapshot = {
  settings: {
    notificationsEnabled: boolean;
    notifyNewVideo: boolean;
    notifyNewFlompsel: boolean;
    notifyNewUser: boolean;
    notificationPollInterval: number;
    requireApproval?: boolean;
    commentApprovalRequired?: boolean;
  };
  videoCount: number;
  flompselCount: number;
  registeredUserCount: number;
  latestRegisteredUsername: string | null;
  latestVideoId?: string | null;
  latestFlompselId?: string | null;
  latestFlompselStatus?: string | null;
  latestUserId?: string | null;
  latestVideoAt: string | null;
  latestFlompselAt: string | null;
  latestUserAt: string | null;
};

export type AdminVideo = {
  id: string; title: string; description: string; videoPath: string; thumbnailPath: string | null;
  duration: number; views: number; isNsfw: boolean; status: VideoStatus; rejectReason: string | null;
  createdAt: string; user: { id: string; username: string; email: string };
  commentCount?: number;
  pendingCommentCount?: number;
  tags?: string[];
  mediaType?: "VIDEO" | "IMAGE" | "YOUTUBE";
  youtubeVideoId?: string | null;
};
export type AdminComment = {
  id: string; content: string; originalContent?: string | null; declineReason?: string | null; status?: string;
  createdAt: string; user: { id: string; username: string; avatarPath?: string | null }; video: { id: string; title: string };
  votes: { value: number }[];
  moderationInfo?: CommentModerationInfo | null;
};

export type CommentModerationInfo = {
  action: "COMMENT_APPROVE" | "COMMENT_DECLINE";
  actor: { id: string; username: string; role: Role };
  createdAt: string;
  reason: string | null;
};

export type ModerationLogEntry = {
  id: string;
  action: string;
  actionLabel: string;
  actor: { id: string; username: string; role: Role };
  reason: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
};

export type AdminUserRow = {
  id: string; email: string; username: string; role: Role; avatarPath?: string | null;
  isBanned: boolean; bannedUntil: string | null; banReason: string | null;
  showInStats: boolean;
  emailVerified: boolean;
  lastLogin: string | null;
  lastActiveAt: string | null;
  createdAt: string; _count: { videos: number; comments: number };
};

export type AdminUserProfile = {
  id: string;
  username: string;
  role: Role;
  avatarPath?: string | null;
  createdAt: string;
  _count: { videos: number; comments: number };
  limitedProfile: boolean;
  email?: string | null;
  isBanned?: boolean;
  bannedUntil?: string | null;
  banReason?: string | null;
  showInStats?: boolean;
  emailVerified?: boolean;
  lastLogin?: string | null;
  lastActiveAt?: string | null;
};

export type UserKudoAdminInfo = {
  userId: string;
  username: string;
  computedScore: number;
  adjustment: number;
  kudoScore: number;
  plusFlompsOnComments: number;
  minFlompsOnComments: number;
};

export type SiteSettings = {
  id: string;
  siteName: string;
  siteDescription: string;
  registrationEnabled: boolean;
  maintenanceMode: boolean;
  maintenanceMessage: string;
  maxUploadSizeMb: number;
  allowNsfwUploads: boolean;
  requireApproval: boolean;
  contactEmail: string;
  videosPerPage: number;
  updatedAt: string;

  // Moderation
  commentApprovalRequired: boolean;
  maxCommentLength: number;
  maxVideoDurationSec: number;
  maxTitleLength: number;
  allowedVideoTypes: string;
  enableVoting: boolean;

  // Appearance
  defaultSort: string;
  bannerText: string;
  footerText: string;
  customCss: string;
  enableWatermark: boolean;

  // Security
  sessionDurationHours: number;
  passwordMinLength: number;

  // Pagina
  language: string;
  autoRefreshInterval: number;

  // Notificaties
  notificationsEnabled: boolean;
  notifyNewVideo: boolean;
  notifyNewFlompsel: boolean;
  notifyNewUser: boolean;
  notificationPollInterval: number;

  // E-mail (SMTP)
  smtpEnabled: boolean;
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPass: string;
  smtpPassSet?: boolean;
  smtpFrom: string;
  smtpSecure: boolean;
  smtpUseApi: boolean;
  smtpApiKey: string;
  smtpApiKeySet?: boolean;
};

export type VisitorIpEntry = {
  ip: string;
  firstSeen: string;
  lastSeen: string;
  visitCount: number;
  referrers?: Record<string, number>;
  lastReferrer?: string;
  hostname?: string | null;
  _hostnameResolved?: boolean;
};

export type VisitorIpsResponse = {
  totalCount: number;
  entries: VisitorIpEntry[];
};

// Statistics
export type MonthActivity = { month: string; videos: number; users: number; flompsels: number; plusVotes: number; minVotes: number };
export type KudoEntry = { userId: string; username: string; plusFlompsReceived: number; minFlompsReceived: number; kudoScore: number };
export type TopVideo = { id: string; title: string; views: number; user: { username: string } };
export type TopUser = { id: string; username: string; flompsels: number; plusVotes: number };
export type TopUploader = { id: string; username: string; videos: number };
export type RoleCount = { role: string; count: number };
export type StatusCount = { status: string; count: number };

export type FullStatistics = {
  stats: { totalVideos: number; totalViews: number; totalUsers: number; pendingVideos: number; pendingFlompsels: number; totalFlompsels: number; totalVotes: number };
  roleDistribution: RoleCount[];
  activity: MonthActivity[];
  leaderboard: KudoEntry[];
  topVideos: TopVideo[];
  topFlompselers: TopUser[];
  topUploaders: TopUploader[];
  flompselStatus: StatusCount[];
};