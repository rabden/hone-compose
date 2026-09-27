import { AnimatePresence, motion } from "framer-motion";
import { Search, X } from "lucide-react";
import { useState, forwardRef, useImperativeHandle, useRef } from "react";
import { Ripple } from "./ripple";

export interface ExpandingSearchDockHandle {
  expand: () => void;
}

type ExpandingSearchDockProps = {
  onSearch?: (query: string) => void;
  placeholder?: string;
};

export const ExpandingSearchDock = forwardRef<
  ExpandingSearchDockHandle,
  ExpandingSearchDockProps
>(({ onSearch, placeholder = "Search..." }, ref) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useImperativeHandle(ref, () => ({
    expand() {
      setIsExpanded(true);
    },
  }));

  const handleExpand = () => {
    setIsExpanded(true);
  };

  const handleCollapse = () => {
    setIsExpanded(false);
    setQuery("");
    onSearch?.("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch?.(query);
  };

  return (
    <div className="relative">
      <AnimatePresence mode="wait">
        {!isExpanded ? (
          <motion.button
            key="icon"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{
              duration: 0.15,
              ease: "easeOut",
            }}
            onClick={handleExpand}
            className="relative flex h-9 w-9 items-center justify-center rounded-full bg-background transition-colors hover:bg-muted overflow-hidden"
          >
            <Ripple />
            <Search className="h-4 w-4" />
          </motion.button>
        ) : (
          <motion.form
            key="input"
            initial={{ width: 36, opacity: 0 }}
            animate={{ width: 320, opacity: 1 }}
            exit={{ width: 36, opacity: 0 }}
            transition={{
              width: {
                type: "spring",
                stiffness: 350,
                damping: 35,
                mass: 0.8,
              },
              opacity: {
                duration: 0.2,
                ease: "easeOut",
              },
            }}
            onSubmit={handleSubmit}
            className="relative"
          >
            <motion.div className="relative flex items-center gap-2 overflow-hidden rounded-full bg-background backdrop-blur-md">
              <div className="ml-4">
                <Search className="h-4 w-4 text-muted-foreground" />
              </div>
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  onSearch?.(e.target.value);
                }}
                placeholder={placeholder}
                autoFocus
                className="h-9 flex-1 bg-transparent pr-4 text-sm outline-none placeholder:text-muted-foreground"
              />
              <motion.button
                type="button"
                onClick={handleCollapse}
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                transition={{
                  duration: 0.15,
                  ease: "easeOut",
                }}
                className="relative mr-1.5 flex h-6 w-6 items-center justify-center rounded-full hover:bg-muted overflow-hidden"
              >
                <Ripple />
                <X className="h-3.5 w-3.5" />
              </motion.button>
            </motion.div>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
});
