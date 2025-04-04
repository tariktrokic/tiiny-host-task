import _ from "lodash";

/**
 * Default configuration for observers
 */
export const defaultObserverConfigs = {
  intersection: {
    rootMargin: "0px",
    threshold: 0.1,
  },
  mutation: {
    attributes: true,
    attributeFilter: ["class", "style"],
    childList: true,
    subtree: true,
  },
  resize: {
    debounceMs: 50,
  },
};

/**
 * Creates and configures an IntersectionObserver
 */
export function intersectionObserver(targets, callback, config) {
  const observerInit = {
    ...defaultObserverConfigs.intersection,
    ...(config || {}),
  };

  const observer = new IntersectionObserver(callback, observerInit);

  // Delay observation slightly to ensure DOM stability
  setTimeout(() => {
    (Array.isArray(targets) ? targets : [targets]).forEach((target) => {
      if (target) observer.observe(target);
    });
  }, 100);

  return observer;
}

/**
 * Creates and configures a ResizeObserver with performance optimizations
 */
export function resizeObserver(targets, callback, config = {}) {
  const { debounceMs = defaultObserverConfigs.resize.debounceMs } = config;

  // Create optimized callback with proper debouncing
  const optimizedCallback = (entries) => {
    // Use requestAnimationFrame to align with browser's render cycle
    requestAnimationFrame(() => {
      const debouncedHandler = _.debounce(callback, debounceMs);
      debouncedHandler(entries);
    });
  };

  const observer = new ResizeObserver(optimizedCallback);

  // Start observing immediately
  (Array.isArray(targets) ? targets : [targets]).forEach((target) => {
    if (target) observer.observe(target);
  });

  return observer;
}

/**
 * Creates and configures a MutationObserver with filtering capabilities
 */
export function mutationObserver(targets, callback, config = {}) {
  const observerConfig = {
    ...defaultObserverConfigs.mutation,
    ...(config || {}),
  };

  // Process mutations efficiently
  const optimizedCallback = (mutations) => {
    // Group mutations by target for better processing
    const mutationsByTarget = {};

    mutations.forEach((mutation) => {
      const targetId = mutation.target.id || "unknown";
      if (!mutationsByTarget[targetId]) {
        mutationsByTarget[targetId] = [];
      }
      mutationsByTarget[targetId].push(mutation);
    });

    // Call actual callback with grouped mutations
    requestAnimationFrame(() => {
      callback(mutations, mutationsByTarget);
    });
  };

  const observer = new MutationObserver(optimizedCallback);

  // Start observing
  (Array.isArray(targets) ? targets : [targets]).forEach((target) => {
    if (target) observer.observe(target, observerConfig);
  });

  return observer;
}
