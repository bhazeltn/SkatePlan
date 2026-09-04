import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  createSkaterBenchmark,
  deleteSkaterBenchmark,
  listSkaterBenchmarks,
  updateSkaterBenchmark,
} from "@/lib/api";
import type {
  BenchmarkStatus,
  SkaterBenchmark,
  SkaterBenchmarkPayload,
} from "@/lib/types";

/** Owns the coach-driven custom benchmark collection for one skater: fetches the
 *  list and exposes deterministic create / status-change / delete mutations that
 *  keep local state in sync so the matrix updates immediately. */
export function useSkaterBenchmarks(skaterId: number | string) {
  const { token } = useAuth();
  const [items, setItems] = useState<SkaterBenchmark[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    setLoading(true);
    listSkaterBenchmarks(skaterId, token)
      .then(setItems)
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [skaterId, token]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const create = useCallback(
    async (payload: SkaterBenchmarkPayload) => {
      const rec = await createSkaterBenchmark(skaterId, payload, token);
      setItems((prev) => [...prev, rec]);
    },
    [skaterId, token]
  );

  const setStatus = useCallback(
    async (id: string, status: BenchmarkStatus) => {
      const rec = await updateSkaterBenchmark(skaterId, id, { status }, token);
      setItems((prev) => prev.map((i) => (i.id === id ? rec : i)));
    },
    [skaterId, token]
  );

  const remove = useCallback(
    async (id: string) => {
      await deleteSkaterBenchmark(skaterId, id, token);
      setItems((prev) => prev.filter((i) => i.id !== id));
    },
    [skaterId, token]
  );

  return { items, loading, create, setStatus, remove };
}
