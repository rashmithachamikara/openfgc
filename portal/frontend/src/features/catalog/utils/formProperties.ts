/*
 * Copyright (c) 2026, WSO2 LLC. (https://wso2.com).
 * Licensed under the Apache License, Version 2.0.
 */

export interface PropertyEntry {
  id: number
  key: string
  value: string
}

export function propertiesToEntries(properties?: Record<string, string>): PropertyEntry[] {
  return Object.entries(properties ?? {}).map(([key, value], index) => ({ id: index, key, value }))
}

export function entriesToProperties(entries: PropertyEntry[]): Record<string, string> | undefined {
  const properties = Object.fromEntries(
    entries
      .map((entry) => [entry.key.trim(), entry.value] as const)
      .filter(([key]) => Boolean(key)),
  )

  return Object.keys(properties).length > 0 ? properties : undefined
}
