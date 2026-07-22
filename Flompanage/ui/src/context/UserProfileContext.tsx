import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

export type UserProfileTarget = { userId: string } | { username: string };

type UserProfileContextValue = {
  profileTarget: UserProfileTarget | null;
  openUserProfile: (target: UserProfileTarget) => void;
  closeUserProfile: () => void;
};

const UserProfileContext = createContext<UserProfileContextValue | null>(null);

export function UserProfileProvider({ children }: { children: ReactNode }) {
  const [profileTarget, setProfileTarget] = useState<UserProfileTarget | null>(null);

  const openUserProfile = useCallback((target: UserProfileTarget) => {
    setProfileTarget(target);
  }, []);

  const closeUserProfile = useCallback(() => {
    setProfileTarget(null);
  }, []);

  const value = useMemo(
    () => ({ profileTarget, openUserProfile, closeUserProfile }),
    [profileTarget, openUserProfile, closeUserProfile],
  );

  return <UserProfileContext.Provider value={value}>{children}</UserProfileContext.Provider>;
}

export function useUserProfile() {
  const ctx = useContext(UserProfileContext);
  if (!ctx) {
    throw new Error("useUserProfile must be used within UserProfileProvider");
  }
  return ctx;
}
