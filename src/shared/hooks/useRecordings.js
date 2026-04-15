import { useCallback, useEffect, useState } from "react";
import { getActRecordings } from "../api/recordings";
import { parseApiError } from "../utils/apiError";

export function useRecordings(actId, heroUserId) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!actId) {
      setItems([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await getActRecordings(actId, heroUserId);
      setItems(data);
    } catch (e) {
      const parsed = parseApiError(e);
      setError({
        message: parsed.message || "Ошибка загрузки",
        retryable: Boolean(parsed.retryable),
      });
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [actId, heroUserId]);

  useEffect(() => {
    load();
  }, [load]);

  return { items, loading, error, reload: load };
}
