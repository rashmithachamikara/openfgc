import { QueryClient } from '@tanstack/react-query'

const FIVE_MINUTES_IN_MS = 5 * 60 * 1000

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: FIVE_MINUTES_IN_MS,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

export default queryClient
