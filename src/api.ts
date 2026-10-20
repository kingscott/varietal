import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { LookupResult, Wine, WineInput } from '../shared/types.ts'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: init?.body ? { 'Content-Type': 'application/json' } : undefined,
  })
  if (!response.ok) {
    const body = await response.json().catch(() => null)
    throw new Error(body?.error ?? `Request failed (${response.status})`)
  }
  return (response.status === 204 ? undefined : await response.json()) as T
}

export const winesQuery = queryOptions({
  queryKey: ['wines'],
  queryFn: () => request<Wine[]>('/api/wines'),
})

export function useLookup(q: string) {
  return useQuery({
    queryKey: ['lookup', q],
    queryFn: () => request<LookupResult[]>(`/api/lookup?q=${encodeURIComponent(q)}`),
    enabled: q !== '',
    staleTime: Infinity,
    retry: false,
  })
}

/** Mutations that change the cellar refetch the wine list when they finish. */
function useWinesMutation<TArgs, TResult>(mutationFn: (args: TArgs) => Promise<TResult>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: winesQuery.queryKey }),
  })
}

export const useSaveWine = () =>
  useWinesMutation(({ id, wine }: { id?: number; wine: WineInput }) =>
    id === undefined
      ? request<Wine>('/api/wines', { method: 'POST', body: JSON.stringify(wine) })
      : request<Wine>(`/api/wines/${id}`, { method: 'PUT', body: JSON.stringify(wine) }),
  )

export const useDeleteWine = () =>
  useWinesMutation((id: number) => request<void>(`/api/wines/${id}`, { method: 'DELETE' }))

export const useImportWines = () =>
  useWinesMutation((rows: Record<string, unknown>[]) =>
    request<Wine[]>('/api/wines/import', { method: 'POST', body: JSON.stringify(rows) }),
  )

export const useDrinkOne = () =>
  useWinesMutation((wine: Wine) =>
    request<Wine>(`/api/wines/${wine.id}`, {
      method: 'PUT',
      body: JSON.stringify({ ...wine, quantity: Math.max(0, wine.quantity - 1) }),
    }),
  )
