"use client";

import { signIn } from "next-auth/react";
import { Github } from "lucide-react";

/** provider를 지정한 signIn은 /admin-login을 경유하지 않고 GitHub OAuth로 직행한다 */
export const GitHubLoginButton = ({
  label,
  redirectTo,
}: {
  label: string;
  redirectTo: string;
}) => (
  <button
    type="button"
    onClick={() => signIn("github", { redirectTo })}
    className="flex items-center gap-2 rounded-lg bg-board-accent px-5 py-2.5 text-meta font-medium text-white transition-opacity hover:opacity-90"
  >
    <Github size={16} />
    {label}
  </button>
);
