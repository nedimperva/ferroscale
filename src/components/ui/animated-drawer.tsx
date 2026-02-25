"use client";

import { AnimatePresence, motion } from "framer-motion";
import { triggerHaptic } from "@/lib/haptics";

interface AnimatedDrawerProps {
    open: boolean;
    onClose: () => void;
    children: React.ReactNode;
    /** Width class — e.g. "w-[400px]" */
    widthClass?: string;
    /** Aria label for the aside */
    ariaLabel?: string;
}

/**
 * A right-side drawer that uses Framer Motion for buttery-smooth
 * enter/exit animations with spring physics — feels much more native
 * than CSS transition-transform.
 */
export function AnimatedDrawer({
    open,
    onClose,
    children,
    widthClass = "w-[400px]",
    ariaLabel,
}: AnimatedDrawerProps) {
    return (
        <AnimatePresence>
            {open && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        key="backdrop"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="fixed inset-0 z-40 bg-overlay"
                        onClick={onClose}
                        aria-hidden="true"
                    />

                    {/* Drawer panel */}
                    <motion.aside
                        key="drawer"
                        initial={{ x: "100%" }}
                        animate={{ x: 0 }}
                        exit={{ x: "100%" }}
                        transition={{
                            type: "spring",
                            damping: 30,
                            stiffness: 300,
                            mass: 0.8,
                        }}
                        onAnimationStart={() => triggerHaptic("light")}
                        aria-label={ariaLabel}
                        className={`fixed inset-y-0 right-0 z-50 flex ${widthClass} max-w-[95vw] flex-col bg-surface-raised shadow-xl`}
                    >
                        {children}
                    </motion.aside>
                </>
            )}
        </AnimatePresence>
    );
}
