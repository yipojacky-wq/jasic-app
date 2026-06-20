import type { Session } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import { useEffect, useState } from 'react';

import { isLiveMode, supabase } from '../lib/supabase';

export function useAuthSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(isLiveMode);

  useEffect(() => {
    const client = supabase;
    if (!client || !isLiveMode) {
      setIsLoading(false);
      return;
    }

    client.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setIsLoading(false);
    });

    const { data: listener } = client.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setIsLoading(false);
    });

    const handleAuthUrl = async (url: string | null) => {
      if (!url) return;
      const code = new URL(url).searchParams.get('code');
      if (code) {
        await client.auth.exchangeCodeForSession(code);
      }
    };

    Linking.getInitialURL().then(handleAuthUrl);
    const linkingSubscription = Linking.addEventListener('url', ({ url }) => {
      void handleAuthUrl(url);
    });

    return () => {
      listener.subscription.unsubscribe();
      linkingSubscription.remove();
    };
  }, []);

  return { session, isLoading };
}
