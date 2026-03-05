"use client";

import { Drawer } from "vaul";
import { triggerHaptic } from "@/lib/haptics";

interface BottomSheetProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    children: React.ReactNode;
    /** Optional title shown at the top of the sheet */
    title?: string;
    /** Whether to show the drag handle indicator, defaults to true */
    showHandle?: boolean;
}

/**
 * Mobile-native bottom sheet using Vaul.
 * On mobile this slides up from the bottom with a drag handle.
 * Wraps content in a fixed-height container with safe area padding.
 */
export function BottomSheet({
    open,
    onOpenChange,
    children,
    title,
    showHandle = true,
}: BottomSheetProps) {
    return (
        <Drawer.Root
            open={open}
            onOpenChange={onOpenChange}
            onClose={() => triggerHaptic("light")}
        >
            <Drawer.Portal>
                <Drawer.Overlay className="fixed inset-0 z-40 bg-overlay" />
                <Drawer.Content
                    aria-modal="true"
                    role="dialog"
                    className="fixed inset-x-0 bottom-0 z-50 flex max-h-[85dvh] flex-col rounded-t-2xl bg-surface shadow-xl outline-none"
                    style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
                >
                    {/* Drag handle */}
                    {showHandle && (
                        <div className="flex justify-center pt-3 pb-1">
                            <div className="h-1.5 w-10 rounded-full bg-border-strong" />
                        </div>
                    )}

                    {/* Title */}
                    {title && (
                        <Drawer.Title className="px-4 pb-2 pt-1 text-sm font-semibold text-foreground">
                            {title}
                        </Drawer.Title>
                    )}

                    {/* Scrollable content */}
                    <div className="flex-1 overflow-y-auto overscroll-contain px-4 pb-4">
                        {children}
                    </div>
                </Drawer.Content>
            </Drawer.Portal>
        </Drawer.Root>
    );
}
