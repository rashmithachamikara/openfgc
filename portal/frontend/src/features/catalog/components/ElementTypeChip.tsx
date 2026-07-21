/*
 * Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com).
 * Licensed under the Apache License, Version 2.0.
 */

import { Chip } from '@wso2/oxygen-ui'
import { Braces, CodeXml, Type as TypeIcon } from '@wso2/oxygen-ui-icons-react'
import type { ElementType } from '../../../types/catalog'

interface ElementTypeChipProps {
  type: ElementType
}

function ElementTypeChip({ type }: ElementTypeChipProps): React.JSX.Element {
  if (type === 'json') {
    return <Chip size="small" sx={{ px: 0.5 }} icon={<Braces size={14} />} label="JSON" />
  }

  if (type === 'xml') {
    return <Chip size="small" sx={{ px: 0.5 }} icon={<CodeXml size={14} />} label="XML" />
  }

  return <Chip size="small" sx={{ px: 0.5 }} icon={<TypeIcon size={14} />} label="Basic" />
}

export default ElementTypeChip
