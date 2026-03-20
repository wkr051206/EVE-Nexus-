import { useQuery } from '@tanstack/react-query';

const WORLD_API = import.meta.env.VITE_EVE_WORLD_API ?? 'https://world-api-stillness.live.tech.evefrontier.com';

export interface SolarSystem {
  id: number;
  name: string;
  constellationId: number;
  regionId: number;
  location: { x: number; y: number; z: number };
}

export interface Constellation {
  id: number;
  name: string;
  regionId: number;
}

export interface GameType {
  id: number;
  name: string;
  description: string;
  mass: number;
  volume: number;
  groupName: string;
  categoryName: string;
  iconUrl: string;
}

export interface GameShip {
  id: number;
  name: string;
  classId: number;
  className: string;
  description: string;
}

interface WorldApiResponse<T> {
  data: T[];
  metadata?: { total: number; limit: number; offset: number };
}

const apiFetch = async <T>(path: string): Promise<T[]> => {
  const res = await fetch(`${WORLD_API}${path}`);
  if (!res.ok) throw new Error(`World API ${path} → ${res.status}`);
  const json: WorldApiResponse<T> = await res.json();
  return json.data ?? [];
};

// ── EVE Frontier 真实资源物品 ID（来自 /v2/types）────────────────
// 这些是游戏里真实存在的物品，用于替代自定义的 0/1/2/3 类型
export const EVE_RESOURCE_TYPES: Array<{
  typeId: number;   // 对应合约里的 resource_type_raw (u8)，我们用 index
  eveItemId: number; // World API 里的真实物品 ID
  name: string;
  icon: string;
  category: string;
}> = [
  { typeId: 0, eveItemId: 77729, name: 'Crude Matter',      icon: '🌑', category: 'Asteroid' },
  { typeId: 1, eveItemId: 77728, name: 'Sophrogon',         icon: '💎', category: 'Mineral' },
  { typeId: 2, eveItemId: 77800, name: 'Feldspar Crystals', icon: '🔷', category: 'Material' },
  { typeId: 3, eveItemId: 72244, name: 'Feral Data',        icon: '📡', category: 'Commodity' },
];

export const getResourceTypeName = (typeId: number): string =>
  EVE_RESOURCE_TYPES.find((r) => r.typeId === typeId)?.name ?? `Type ${typeId}`;

export const getResourceTypeIcon = (typeId: number): string =>
  EVE_RESOURCE_TYPES.find((r) => r.typeId === typeId)?.icon ?? '📦';

// ── Hooks ────────────────────────────────────────────────────────

export const useSolarSystems = () =>
  useQuery({
    queryKey: ['worldApi', 'solarSystems'],
    queryFn: () => apiFetch<SolarSystem>('/v2/solarsystems'),
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: 2,
  });

export const useConstellations = () =>
  useQuery({
    queryKey: ['worldApi', 'constellations'],
    queryFn: () => apiFetch<Constellation>('/v2/constellations'),
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: 2,
  });

export const useGameTypes = () =>
  useQuery({
    queryKey: ['worldApi', 'types'],
    queryFn: () => apiFetch<GameType>('/v2/types'),
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    retry: 2,
  });

export const useShips = () =>
  useQuery({
    queryKey: ['worldApi', 'ships'],
    queryFn: () => apiFetch<GameShip>('/v2/ships'),
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    retry: 2,
  });

// ── 工具函数 ─────────────────────────────────────────────────────

export const getSolarSystemName = (id: number | string, systems: SolarSystem[]): string => {
  const sys = systems.find((s) => s.id === Number(id));
  return sys?.name ?? `System ${id}`;
};

export const getConstellationName = (id: number, constellations: Constellation[]): string => {
  const c = constellations.find((c) => c.id === id);
  return c?.name ?? `Constellation ${id}`;
};
