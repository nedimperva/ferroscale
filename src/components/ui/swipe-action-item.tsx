"use client";

import { useState } from "react";
import { motion, useMotionValue, useTransform, PanInfo } from "framer-motion";
import { triggerHaptic } from "@/lib/haptics";

interface SwipeActionItemProps {
    children: React.ReactNode;
    /** Called when the user completes a left swipe (e.g. delete) */
    onSwipeLeft?: () => void;
    /** Label shown when swiping left */
    leftLabel?: string;
    /** Background color class for left swipe action, defaults to red */
    leftBgClass?: string;
    /** Icon to show on left swipe */
    leftIcon?: React.ReactNode;
    /** Swipe threshold in pixels before the action is triggered */
    threshold?: number;
    /** Additional className for the container */
    className?: string;
}

const DELETE_ICON = (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-5 w-5"
    >
        <path d="M3 6h18" />
        <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
        <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
    </svg>
);

/**
 * A list item wrapper that supports swipe-to-action gestures.
 * Swipe left to reveal a delete/action button, then release to trigger.
 */
export function SwipeActionItem({
    children,
    onSwipeLeft,
    leftLabel = "Delete",
    leftBgClass = "bg-red-interactive",
    leftIcon = DELETE_ICON,
    threshold = 80,
    className = "",
}: SwipeActionItemProps) {
    const x = useMotionValue(0);
    const [swiping, setSwiping] = useState(false);

    // Opacity of the action indicator — goes from 0 to 1 as the user drags
    const actionOpacity = useTransform(x, [-threshold, -threshold / 2, 0], [1, 0.6, 0]);

    const handleDragEnd = (_: unknown, info: PanInfo) => {
        setSwiping(false);
        if (info.offset.x < -threshold && onSwipeLeft) {
            triggerHaptic("medium");
            onSwipeLeft();
        }
    };

    return (
        <div className={`relative overflow-hidden rounded-lg ${className}`} data-app-swipe-lock="true">
            {/* Action background — revealed when swiping */}
            <motion.div
                className={`absolute inset-y-0 right-0 flex w-24 items-center justify-center ${leftBgClass} text-white`}
                style={{ opacity: actionOpacity }}
            >
                <div className="flex flex-col items-center gap-0.5">
                    {leftIcon}
                    <span className="text-2xs font-medium">{leftLabel}</span>
                </div>
            </motion.div>

            {/* Draggable foreground content */}
            <motion.div
                drag="x"
                dragConstraints={{ left: -120, right: 0 }}
                dragElastic={0.1}
                dragSnapToOrigin
                style={{ x }}
                onDragStart={() => setSwiping(true)}
                onDragEnd={handleDragEnd}
                className={`relative z-10 touch-pan-y ${swiping ? "cursor-grabbing" : ""}`}
            >
                {children}
            </motion.div>
        </div>
    );
}
