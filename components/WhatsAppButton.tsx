"use client";

import { motion } from "framer-motion";

export default function WhatsAppButton() {
  return (
    <motion.a
      href="https://wa.me/919955672533?text=Hello%20Lazzat%20Tiffin,%20I%20want%20to%20order%20a%20tiffin%20plan."
      target="_blank"
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ duration: 0.5 }}
      whileHover={{
        scale: 1.1,
      }}
      className="fixed bottom-6 right-6 z-50 bg-green-500 text-white w-16 h-16 rounded-full flex items-center justify-center text-3xl shadow-2xl"
    >
      💬
    </motion.a>
  );
}