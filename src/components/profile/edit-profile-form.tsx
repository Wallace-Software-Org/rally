"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  uploadAvatar,
  updateProfile,
  checkUsername,
  signOut,
} from "@/lib/actions/profiles";
import { USERNAME_RE, usernameHint } from "@/lib/utils/username";
import { SPORTS_LIST, getSportLabel } from "@/lib/utils/sport-config";
import ActivityPill from "@/components/ui/activity-pill";
import { CameraIcon, InstagramIcon } from "@/components/ui/icons";
import type { UsernameStatus } from "@/types";

const ACTIVITY_ITEMS = SPORTS_LIST.filter((s) => s !== "All");

type ProfileData = {
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  instagram_handle: string | null;
  sports: string[] | null;
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
  "field-base px-4 py-3 text-base xl:text-sm text-brand-text";

export default function EditProfileForm({ profile }: { profile: ProfileData }) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const initialUsername = profile.username ?? "";

  const [fullName, setFullName] = useState(profile.full_name ?? "");
  const [username, setUsername] = useState(initialUsername);
  const [bio, setBio] = useState(profile.bio ?? "");
  const [instagramHandle, setInstagramHandle] = useState(
    (profile.instagram_handle ?? "").replace(/^@/, ""),
  );
  const [sports, setSports] = useState<string[]>(profile.sports ?? []);
  const [tagsOpen, setTagsOpen] = useState(false);

  function toggleSport(s: string) {
    const key = s.toLowerCase();
    setSports((prev) =>
      prev.includes(key) ? prev.filter((x) => x !== key) : [...prev, key],
    );
  }
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
    if (
      !username ||
      !USERNAME_RE.test(username) ||
      username === initialUsername
    )
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
  const [signOutConfirm, setSignOutConfirm] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    setSigningOut(true);
    const { error } = await signOut();
    if (!error) {
      // Land on the feed in its logged-out state. refresh() clears the cached
      // server components so no stale signed-in UI carries over.
      router.push("/");
      router.refresh();
    } else {
      setSigningOut(false);
    }
  }

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

  const canSave = usernameStatus === "available";

  async function handleSave() {
    if (submitting || !canSave) return;
    setSubmitting(true);
    setSaveError(null);
    const { error } = await updateProfile({
      full_name: fullName,
      username,
      bio,
      instagram_handle: instagramHandle,
      sports,
    });
    setSubmitting(false);
    if (error) {
      setSaveError(error);
    } else {
      router.push(username.trim() ? `/profile/${username.trim()}` : "/");
    }
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-brand-bg overflow-hidden">
      {/* Scrollable form area */}
      <div className="page-with-back  flex-1 overflow-y-auto">
        <div className="px-4 pt-6 pb-4 max-w-lg mx-auto w-full">
          <h1 className="text-xl font-semibold text-brand-text">
            Edit profile
          </h1>
        </div>

        {/* Form body */}
        <div className="flex flex-col gap-5 px-4 pt-6 pb-10 max-w-lg mx-auto w-full">
          {/* Avatar */}
          <div className="flex flex-col items-start gap-2">
            <div className="relative">
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
                  <CameraIcon size={30} />
                </div>
              </button>
              {/* Camera badge — always visible for touch affordance */}
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                aria-label="Change photo"
                className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-brand-teal flex items-center justify-center border-2 border-brand-bg hover:bg-brand-teal-hover transition-colors disabled:opacity-60"
              >
                <CameraIcon />
              </button>
            </div>
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
            <label className="field-label">
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
            <label className="field-label">
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
            <label className="field-label">Bio</label>
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
              style={{ color: "var(--color-brand-teal)" }}
            >
              <InstagramIcon size={15} />
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
                className="w-full rounded-xl border border-brand-teal bg-brand-input pl-7 pr-4 py-3 text-base xl:text-sm text-brand-text placeholder:text-brand-muted focus:outline-none focus:ring-[1.5px] focus:ring-brand-teal"
              />
            </div>
            <p className="text-xs text-brand-muted">
              Used for your profile link and share cards
            </p>
          </div>

          {/* Activities */}
          <div className="flex flex-col my-4">
            <button
              type="button"
              onClick={() => setTagsOpen((o) => !o)}
              className="flex items-center gap-2 py-1"
            >
              <span className="field-label flex-none">
                Activities
              </span>
              <div className="hidden xl:flex flex-1 flex-wrap gap-1.5 min-w-0 justify-start">
                {sports.map((s) => (
                  <ActivityPill key={s} sport={s} />
                ))}
              </div>
              <motion.div
                animate={{ rotate: tagsOpen ? 180 : 0 }}
                transition={{ duration: 0.25 }}
                className="flex-none text-brand-muted"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M4 6l4 4 4-4"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </motion.div>
            </button>

            <AnimatePresence initial={false}>
              {tagsOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: "easeInOut" }}
                  className="overflow-hidden"
                >
                  <div className="grid grid-cols-3 gap-2 pt-3">
                    {ACTIVITY_ITEMS.map((a) => {
                      const active = sports.includes(a.toLowerCase());
                      return (
                        <button
                          key={a}
                          type="button"
                          onClick={() => toggleSport(a)}
                          aria-pressed={active}
                          className={`rounded-xl py-3 px-2 text-sm font-medium border transition-colors text-center ${
                            active
                              ? "bg-brand-teal border-brand-teal text-white"
                              : "border-brand-border text-brand-muted hover:border-brand-teal hover:text-brand-teal bg-brand-bg"
                          }`}
                        >
                          {getSportLabel(a)}
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="mt-2 border-t-[0.5px] border-brand-border pt-2" />

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

          <div className="mt-2 border-t-[0.5px] border-brand-border pt-2" />

          {/* Sign out */}
          <div className="flex flex-col gap-2 pt-2 mb-2">
            <button
              onClick={() =>
                signOutConfirm ? handleSignOut() : setSignOutConfirm(true)
              }
              disabled={signingOut}
              className="w-full flex items-center justify-center rounded-xl text-sm font-semibold py-3.5 border border-brand-danger text-brand-danger hover:bg-brand-danger/10 transition-colors disabled:opacity-40"
            >
              {signingOut
                ? "Signing out..."
                : signOutConfirm
                  ? "Confirm sign out?"
                  : "Sign out"}
            </button>
            <AnimatePresence initial={false}>
              {signOutConfirm && !signingOut && (
                <motion.button
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 16 }}
                  transition={{ duration: 0.2 }}
                  onClick={() => setSignOutConfirm(false)}
                  className="w-full flex items-center justify-center text-sm text-brand-muted py-1 hover:text-brand-text transition-colors"
                >
                  Cancel
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
