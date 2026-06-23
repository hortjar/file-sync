import { useQuery } from "@tanstack/react-query";

export { getApiConflictsQueryKey } from "../generated/@tanstack/react-query.gen";

import { getApiConflictsOptions } from "../generated/@tanstack/react-query.gen";

export function useConflictCount(): number {
  const { data } = useQuery({
    ...getApiConflictsOptions(),
    refetchInterval: 60_000,
  });
  return (data as { id: string }[] | undefined)?.length ?? 0;
}
