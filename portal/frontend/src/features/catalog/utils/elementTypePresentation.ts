/*
 * Copyright (c) 2026, WSO2 LLC. (https://wso2.com).
 * Licensed under the Apache License, Version 2.0.
 */

import { Braces, CodeXml, Type as TypeIcon } from '@wso2/oxygen-ui-icons-react'
import type { ElementType } from '../../../types/catalog'

export const ELEMENT_TYPE_PRESENTATION = {
  basic: {
    label: 'Basic',
    Icon: TypeIcon,
  },
  json: {
    label: 'JSON',
    Icon: Braces,
  },
  xml: {
    label: 'XML',
    Icon: CodeXml,
  },
} satisfies Record<ElementType, { label: string; Icon: typeof TypeIcon }>
