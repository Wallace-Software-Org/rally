"use client";

import { motion } from "framer-motion";
import { isIOSDevice } from "@/lib/utils/platform";

type Props = {
  onClose: () => void;
};

export default function ShareStoryModal({ onClose }: Props) {
  const ios = isIOSDevice();

  const steps = [
    ios
      ? "Long-press the image and tap Save to Photos"
      : "Image saved to your photos",
    "Open Instagram, Snapchat, or any app with Stories",
    "Add the saved image to your Story",
    "Tap the link sticker and paste your link, it's already copied",
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.15 } }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 px-4 pb-4 sm:pb-0"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 8, transition: { duration: 0.15, ease: "easeIn" } }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="w-full max-w-sm rounded-2xl p-6 flex flex-col gap-5 bg-brand-bg border border-brand-border"
      >
        <h2 className="text-base font-semibold leading-tight text-brand-text">
          Share to your Story
        </h2>

        <ol className="flex flex-col gap-3">
          {steps.map((step, i) => (
            <li key={i} className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-semibold mt-0.5 bg-brand-teal flex-none">
                {i + 1}
              </div>
              <p className="text-sm leading-relaxed text-brand-text">{step}</p>
            </li>
          ))}
        </ol>

        <button
          onClick={onClose}
          className="w-full rounded-xl text-white text-sm font-semibold py-3 bg-brand-teal hover:opacity-90 active:opacity-80 transition-opacity"
        >
          Got it
        </button>
      </motion.div>
    </motion.div>
  );
}
