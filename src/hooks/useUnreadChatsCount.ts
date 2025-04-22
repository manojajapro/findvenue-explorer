
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const useUnreadChatsCount = (userId?: string) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!userId) return;

    let cancelled = false;

    const fetchCount = async () => {
      const { data, error } = await supabase
        .from("messages")
        .select('id', { count: "exact", head: true })
        .eq('receiver_id', userId)
        .eq('read', false);

      if (!error && data && !cancelled) {
        setCount(data.length || 0);
      }
    };

    fetchCount();

    const channel = supabase.channel('chats-unread-count')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `receiver_id=eq.${userId}`,
        },
        () => fetchCount()
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [userId]);

  return count;
};
