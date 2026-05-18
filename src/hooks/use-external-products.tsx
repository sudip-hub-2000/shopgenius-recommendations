import { useQuery } from "@tanstack/react-query";
import {
  fetchDummyJsonProducts,
  fetchFakeStoreProducts,
  fetchOpenFoodProducts,
  fetchExternalDiscoverFeed,
} from "@/lib/external-apis";

const opts = { staleTime: 1000 * 60 * 10, retry: 1 };

export const useDummyJsonProducts = (limit = 20) =>
  useQuery({ queryKey: ["ext-dj", limit], queryFn: () => fetchDummyJsonProducts(limit), ...opts });

export const useFakeStoreProducts = (limit = 12) =>
  useQuery({ queryKey: ["ext-fs", limit], queryFn: () => fetchFakeStoreProducts(limit), ...opts });

export const useOpenFoodProducts = (limit = 12) =>
  useQuery({ queryKey: ["ext-off", limit], queryFn: () => fetchOpenFoodProducts(limit), ...opts });

export const useExternalDiscover = () =>
  useQuery({ queryKey: ["ext-discover"], queryFn: fetchExternalDiscoverFeed, ...opts });
