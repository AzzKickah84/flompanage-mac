import type { CSSProperties, ReactNode } from "react";
import { useUserProfile } from "../context/UserProfileContext";

type UsernameLinkProps = {
  userId?: string;
  username: string;
  children?: ReactNode;
  style?: CSSProperties;
  className?: string;
};

export function UsernameLink({ userId, username, children, style, className }: UsernameLinkProps) {
  const { openUserProfile } = useUserProfile();

  const open = () => {
    if (userId) {
      openUserProfile({ userId });
      return;
    }
    openUserProfile({ username });
  };

  return (
    <button
      type="button"
      className={className ? `username-link ${className}` : "username-link"}
      onClick={(e) => {
        e.stopPropagation();
        open();
      }}
      style={style}
    >
      {children ?? username}
    </button>
  );
}
