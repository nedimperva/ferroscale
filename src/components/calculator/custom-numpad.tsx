"use client";

import { Drawer } from "vaul";
import { useNumpad } from "./numpad-context";
import { triggerHaptic } from "@/lib/haptics";

export function CustomNumpad() {
  const numpad = useNumpad();

  if (!numpad) return null;

  const { isOpen, closeNumpad, updateValue, config } = numpad;

  
  // Actually, we probably just want a numeric pad.
  const handleKey = (key: string) => {
    triggerHaptic("light");
    updateValue((prev) => {
      // Basic input handling
      if (prev === "0" && key !== ".") return key;
      if (key === "." && (prev.includes(".") || prev.includes(","))) return prev;
      return prev + key;
    });
  };

  const handleBackspace = () => {
    triggerHaptic("light");
    updateValue((prev) => prev.slice(0, -1) || "");
  };

  const handleClear = () => {
    triggerHaptic("light");
    updateValue(() => "");
  };

  const handleDone = () => {
    triggerHaptic("success");
    closeNumpad();
  };

  // We want nice big buttons that look like iOS calculator
  const Button = ({ children, onClick, variant = "default", className = "" }: any) => {
    const baseClass = "flex h-14 items-center justify-center rounded-xl text-xl font-medium active:scale-95 transition-transform";
    const variants = {
      default: "bg-surface-elevated text-foreground hover:bg-surface-elevated-hover active:bg-surface-elevated-active",
      action: "bg-border text-foreground hover:bg-border-strong active:bg-border-strong",
      primary: "bg-primary text-primary-foreground hover:bg-primary/90 active:bg-primary/80",
    };
    
    return (
      <button 
        type="button" 
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onClick();
        }}
        className={`${baseClass} ${(variants as any)[variant]} ${className}`}
      >
        {children}
      </button>
    );
  };

  return (
    <Drawer.Root
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) closeNumpad();
      }}
      modal={false} // Allow interacting with the surrounding form
      onClose={() => triggerHaptic("light")}
    >
      <Drawer.Portal>
        {/* We don't render an overlay to allow seeing the inputs, or we render an invisible one if we want clicks outside to close. 
            For now, Vaul modal={false} usually just renders the content and lets you click behind it. 
        */}
        <Drawer.Content
          aria-modal="false"
          className="fixed inset-x-0 bottom-0 z-[100] flex flex-col rounded-t-2xl bg-surface shadow-[0_-10px_40px_rgba(0,0,0,0.1)] outline-none ring-1 ring-border"
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          {/* Drag handle */}
          <div className="flex justify-center pt-3 pb-2">
             <div className="h-1.5 w-10 rounded-full bg-border-strong" />
          </div>

          <div className="p-3 pt-0">
            {/* Display value for feedback since input might be hidden under it? 
                Actually, the screen is scrollable so the input shouldn't be fully hidden. 
                But it's nice to show it maybe? We'll skip for now and just show grid. */}
            
            <div className="grid grid-cols-4 gap-2">
               <Button onClick={() => handleKey("7")}>7</Button>
               <Button onClick={() => handleKey("8")}>8</Button>
               <Button onClick={() => handleKey("9")}>9</Button>
               <Button variant="action" onClick={handleBackspace}>
                 <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z"/><path d="m18 9-6 6"/><path d="m12 9 6 6"/></svg>
               </Button>
               
               <Button onClick={() => handleKey("4")}>4</Button>
               <Button onClick={() => handleKey("5")}>5</Button>
               <Button onClick={() => handleKey("6")}>6</Button>
               <Button variant="action" onClick={handleClear}>C</Button>

               <Button onClick={() => handleKey("1")}>1</Button>
               <Button onClick={() => handleKey("2")}>2</Button>
               <Button onClick={() => handleKey("3")}>3</Button>
               <Button variant="primary" className="row-span-2" onClick={handleDone}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 5 5L20 7"/></svg>
               </Button>

               <Button className="col-span-2" onClick={() => handleKey("0")}>0</Button>
               {/* Locale decimal point - we should use the actual system one or provide both? Let's just use '.' and parse it in NumericInput */}
               <Button onClick={() => handleKey(".")}>.</Button>
            </div>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
