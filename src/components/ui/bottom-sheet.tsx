"use client";

import { Drawer } from "vaul";
import { triggerHaptic } from "@/lib/haptics";

interface BottomSheetProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    children: React.ReactNode;
    title?: string;
    showHandle?: boolean;
}

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
            shouldScaleBackground={false}
            disablePreventScroll={false}
        >
            <Drawer.Portal>
                <Drawer.Overlay className="fixed inset-0 z-40 bg-overlay backdrop-blur-[2px] transition-opacity" />
                <Drawer.Content
                    aria-modal="true"
                    role="dialog"
                    className="fixed inset-x-0 bottom-0 z-50 flex max-h-[88dvh] flex-col rounded-t-[1.75rem] border-t border-border-faint bg-surface shadow-[var(--panel-shadow-strong)] outline-none [will-change:transform]"
                    style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
                >
                    {showHandle && (
                        <div className="flex shrink-0 justify-center pt-2.5 pb-1">
                            <div className="h-1 w-9 rounded-full bg-border-strong/70" />
                        </div>
                    )}

                    {title && (
                        <Drawer.Title className="shrink-0 px-4 pb-2 pt-1 text-sm font-bold tracking-tight text-foreground">
                            {title}
                        </Drawer.Title>
                    )}

                    <div className="scroll-native flex-1 overflow-y-auto overscroll-contain px-4 pb-4">
                        {children}
                    </div>
                </Drawer.Content>
            </Drawer.Portal>
        </Drawer.Root>
    );
}
