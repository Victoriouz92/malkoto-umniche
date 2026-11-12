import { useApp } from '@/core/store/app';

// Read saved profiles, PIN and settings once, before mounting any route.
export const hydration = Promise.resolve(useApp.persist.rehydrate());
