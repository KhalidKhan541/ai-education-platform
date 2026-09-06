import * as React from "react";

function useClickOutside<T extends HTMLElement = HTMLDivElement>(
  handler: () => void,
  options?: {
    enabled?: boolean;
    exclude?: React.RefObject<HTMLElement>[];
  }
): React.RefObject<T> {
  const ref = React.useRef<T>(null);
  const enabled = options?.enabled ?? true;

  React.useEffect(() => {
    if (!enabled) return;

    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;

      if (!ref.current || ref.current.contains(target)) {
        return;
      }

      if (options?.exclude) {
        for (const excludeRef of options.exclude) {
          if (excludeRef.current?.contains(target)) {
            return;
          }
        }
      }

      handler();
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [handler, enabled, options?.exclude]);

  return ref;
}

export { useClickOutside };
