"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { uploadAvatar, updateProfile, checkUsername } from "@/lib/actions/profiles";
import { USERNAME_RE, usernameHint } from "@/lib/utils/username";
import type { UsernameStatus } from "@/types";

type ProfileData = {
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  instagram_handle: string | null;
};

function initials(name: string | null): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((w) => w[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

const inputCls =
  "w-full rounded-xl border border-brand-border bg-transparent px-4 py-3 text-sm text-brand-text placeholder:text-brand-muted focus:outline-none focus:ring-[1.5px] focus:ring-brand-teal";

export default function EditProfileForm({ profile }: { profile: ProfileData }) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const initialUsername = profile.username ?? "";

  const [fullName, setFullName] = useState(profile.full_name ?? "");
  const [username, setUsername] = useState(initialUsername);
  const [bio, setBio] = useState(profile.bio ?? "");
  const [instagramHandle, setInstagramHandle] = useState(
    profile.instagram_handle ?? "",
  );
  const [previewUrl, setPreviewUrl] = useState<string | null>(
    profile.avatar_url,
  );

  // Tracks the last async check result, keyed to the username it was run against
  const [checkResult, setCheckResult] = useState<{
    username: string;
    status: "available" | "taken" | "error";
  } | null>(
    initialUsername ? { username: initialUsername, status: "available" } : null,
  );

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // idle / invalid / checking are derived; only the async result needs state.
  // If the value equals the initial username it's already "theirs" — skip the check.
  const usernameStatus: UsernameStatus = !username
    ? "idle"
    : !USERNAME_RE.test(username)
      ? "invalid"
      : username === initialUsername
        ? "available"
        : checkResult?.username === username
          ? checkResult.status
          : "checking";

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!username || !USERNAME_RE.test(username) || username === initialUsername)
      return;

    debounceRef.current = setTimeout(async () => {
      try {
        const result = await checkUsername(username);
        setCheckResult({
          username,
          status: result.available ? "available" : "taken",
        });
      } catch {
        setCheckResult({ username, status: "error" });
      }
    }, 1000);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [username, initialUsername]);

  const usernameInputHint = usernameHint(usernameStatus, username);

  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setUploadError("Photo must be under 2MB");
      e.target.value = "";
      return;
    }
    setUploadError(null);
    setUploading(true);
    const { url, error } = await uploadAvatar(file);
    setUploading(false);
    if (error) {
      setUploadError(error);
    } else if (url) {
      setPreviewUrl(url);
    }
    e.target.value = "";
  }

  const canSave =
    usernameStatus === "available" || usernameStatus === "idle";

  async function handleSave() {
    if (submitting || !canSave) return;
    setSubmitting(true);
    setSaveError(null);
    const { error } = await updateProfile({
      full_name: fullName,
      username,
      bio,
      instagram_handle: instagramHandle,
    });
    setSubmitting(false);
    if (error) {
      setSaveError(error);
    } else {
      router.push(username.trim() ? `/profile/${username.trim()}` : "/");
    }
  }

  const backHref = profile.username ? `/profile/${profile.username}` : "/";

  return (
    <div className="flex-1 overflow-y-auto flex flex-col bg-brand-bg">
      {/* Header */}
      <div className="flex items-center px-4 pt-6 pb-4 gap-4 max-w-lg mx-auto w-full">
        <Link
          href={backHref}
          aria-label="Back"
          className="flex-none w-8 h-8 flex items-center justify-center rounded-full hover:bg-brand-avatar-bg transition-colors"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 18 18"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M11 14L6 9l5-5"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </Link>
        <h1 className="text-base font-semibold text-brand-text">
          Edit profile
        </h1>
      </div>

      {/* Form body */}
      <div className="flex flex-col gap-5 px-4 pb-10 max-w-lg mx-auto w-full">
        {/* Avatar */}
        <div className="flex flex-col items-center gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            aria-label="Change photo"
            className="relative group w-24 h-24 rounded-full overflow-hidden bg-brand-avatar-bg flex items-center justify-center cursor-pointer disabled:opacity-60"
          >
            {previewUrl ? (
              <Image
                src={previewUrl}
                alt=""
                width={96}
                height={96}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-2xl font-semibold text-brand-avatar-text">
                {initials(fullName)}
              </span>
            )}
            <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
                <circle cx="12" cy="13" r="3" />
              </svg>
            </div>
          </button>
          {uploading && (
            <p className="text-xs text-brand-muted">Uploading...</p>
          )}
          {uploadError && (
            <p className="text-xs text-brand-danger">{uploadError}</p>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>

        {/* Display name */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-brand-text">
            Display name
          </label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Your name"
            className={inputCls}
          />
        </div>

        {/* Username */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-brand-text">
            Username
          </label>
          <div className="relative">
            <input
              type="text"
              value={username}
              onChange={(e) =>
                setUsername(e.target.value.replace(/\s/g, "").toLowerCase())
              }
              placeholder="username"
              className={`${inputCls} pr-8 ${
                usernameStatus === "taken" || usernameStatus === "error"
                  ? "border-brand-danger focus:ring-brand-danger/30"
                  : usernameStatus === "available"
                    ? "border-brand-teal focus:ring-brand-teal/40"
                    : ""
              }`}
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
              {usernameStatus === "checking" && (
                <svg
                  className="animate-spin w-4 h-4 text-brand-muted"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="3"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v8H4z"
                  />
                </svg>
              )}
              {usernameStatus === "available" && (
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M3 8.5L6.5 12L13 5"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
              {(usernameStatus === "taken" || usernameStatus === "error") && (
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M4 4L12 12M12 4L4 12"
                    stroke="#CC3333"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                </svg>
              )}
            </div>
          </div>
          {usernameInputHint && (
            <p className={`text-xs ${usernameInputHint.color}`}>
              {usernameInputHint.text}
            </p>
          )}
        </div>

        {/* Bio */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-brand-text">Bio</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="A little about you"
            rows={3}
            className={`${inputCls} resize-none`}
          />
        </div>

        {/* Instagram handle */}
        <div className="flex flex-col gap-1.5">
          <label
            className="text-sm font-medium flex items-center gap-1.5"
            style={{ color: "#1D9E75" }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
              <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
              <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
            </svg>
            Instagram handle
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-brand-muted select-none">
              @
            </span>
            <input
              type="text"
              value={instagramHandle}
              onChange={(e) =>
                setInstagramHandle(e.target.value.replace(/[@\s]/g, ""))
              }
              placeholder="yourhandle"
              className="w-full rounded-xl border border-brand-teal bg-transparent pl-7 pr-4 py-3 text-sm text-brand-text placeholder:text-brand-muted focus:outline-none focus:ring-[1.5px] focus:ring-brand-teal"
            />
          </div>
          <p className="text-xs text-brand-muted">
            Used for your profile link and share cards
          </p>
        </div>

        {saveError && (
          <p className="text-xs text-brand-danger text-center">{saveError}</p>
        )}

        <button
          onClick={handleSave}
          disabled={submitting || !canSave}
          className="w-full rounded-xl bg-brand-teal text-white text-sm font-semibold py-3.5 hover:bg-brand-teal-hover active:bg-brand-teal-active transition-colors disabled:opacity-40"
        >
          {submitting ? "Saving..." : "Save changes"}
        </button>
      </div>
    </div>
  );
}
