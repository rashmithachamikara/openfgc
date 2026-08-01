/*
 * Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com).
 * Licensed under the Apache License, Version 2.0.
 */

import { Chip } from '@wso2/oxygen-ui'
import type { ElementType } from '../../../types/catalog'
import { ELEMENT_TYPE_PRESENTATION } from '../utils/elementTypePresentation'

interface ElementTypeChipProps {
  type: ElementType
}

function ElementTypeChip({ type }: ElementTypeChipProps): React.JSX.Element {
  const { Icon, label } = ELEMENT_TYPE_PRESENTATION[type]

  return <Chip size="small" sx={{ px: 0.5 }} icon={<Icon size={14} />} label={label} />
}

export default ElementTypeChip
