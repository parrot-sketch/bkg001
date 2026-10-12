'use client';

import { createContext, useContext } from 'react';

/**
 * User id resolved on the server from the auth cookie by the frontdesk layout.
 *
 * AuthContext only knows the user after hydration (localStorage), so without this
 * the server-rendered pass would key queries under 'default' and miss the
 * prefetched cache entries.
 */
const FrontdeskSessionContext = createContext<string | null>(null);

export const FrontdeskSessionProvider = FrontdeskSessionContext.Provider;

export function useFrontdeskServerUserId(): string | null {
  return useContext(FrontdeskSessionContext);
}
