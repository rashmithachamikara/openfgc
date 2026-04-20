import { Chip, IconButton, ListingTable, TablePagination } from '@wso2/oxygen-ui'
import { CircleCheckBig, Eye, ShieldX } from '@wso2/oxygen-ui-icons-react'
import { Fragment, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link as RouterLink } from 'react-router-dom'
import type { ConsentRecord } from '../../../types/consent'
import { formatIsoDateTime } from '../../../utils/dateTime'

interface ConsentRegistryTableProps {
  rows: ConsentRecord[]
  totalCount: number
  page: number
  rowsPerPage: number
  onPageChange: (page: number) => void
  onRowsPerPageChange: (rowsPerPage: number) => void
  onApprove: (consentID: string) => void
  onRevoke: (consentID: string) => void
  isMutating: boolean
}

type SortField = 'id' | 'type' | 'status' | 'createdAt'
type SortDirection = 'asc' | 'desc'

function getStatusChipColor(
  status: ConsentRecord['status'],
): 'success' | 'warning' | 'error' | 'default' {
  if (status === 'Active') {
    return 'success'
  }

  if (status === 'Pending') {
    return 'warning'
  }

  if (status === 'Revoked') {
    return 'error'
  }

  return 'default'
}

const CREATED_AT_FORMAT_OPTIONS: Intl.DateTimeFormatOptions = {
  month: 'short',
  day: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
}

function sortConsentRows(
  rows: ConsentRecord[],
  sortField: SortField,
  sortDirection: SortDirection,
): ConsentRecord[] {
  const sortedRows = [...rows].sort((leftRow, rightRow) => {
    const leftValue = leftRow[sortField]
    const rightValue = rightRow[sortField]

    if (leftValue < rightValue) {
      return -1
    }

    if (leftValue > rightValue) {
      return 1
    }

    return 0
  })

  return sortDirection === 'asc' ? sortedRows : sortedRows.reverse()
}

function ConsentRegistryTable({
  rows,
  totalCount,
  page,
  rowsPerPage,
  onPageChange,
  onRowsPerPageChange,
  onApprove,
  onRevoke,
  isMutating,
}: ConsentRegistryTableProps): React.JSX.Element {
  const { t } = useTranslation('common')
  const [sortField, setSortField] = useState<SortField>('createdAt')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

  const sortedRows = useMemo(
    () => sortConsentRows(rows, sortField, sortDirection),
    [rows, sortDirection, sortField],
  )

  const groupedRows = useMemo(() => {
    const groupedMap = new Map<string, ConsentRecord[]>()

    sortedRows.forEach((row) => {
      const existingRows = groupedMap.get(row.clientName)

      if (existingRows) {
        groupedMap.set(row.clientName, [...existingRows, row])
        return
      }

      groupedMap.set(row.clientName, [row])
    })

    return Array.from(groupedMap.entries()).map(([clientName, clientRows]) => ({
      clientName,
      clientRows,
    }))
  }, [sortedRows])

  const rowsPerPageOptions: number[] = [5, 10, 25]

  const selectedRowIds: readonly string[] = []

  return (
    <ListingTable.Provider
      density="standard"
      page={page}
      rowsPerPage={rowsPerPage}
      totalCount={totalCount}
      selected={selectedRowIds}
      sortField={sortField}
      sortDirection={sortDirection}
      isSelected={() => false}
      onBulkDelete={() => {}}
      onClearSelection={() => {}}
      onDensityChange={() => {}}
      onPageChange={onPageChange}
      onRowsPerPageChange={onRowsPerPageChange}
      onSearchChange={() => {}}
      onSelectAll={() => {}}
      onSelectionChange={() => {}}
      onSortChange={(nextField, nextDirection) => {
        setSortField(nextField as SortField)
        setSortDirection(nextDirection)
      }}
    >
      <ListingTable.Container sx={{ minWidth: 900 }}>
        <ListingTable
          density="standard"
          variant="table"
          aria-label={t('consentRegistry.table.tableAriaLabel')}
        >
          <ListingTable.Head>
            <ListingTable.Row>
              <ListingTable.Cell>
                <ListingTable.SortLabel field="id">
                  {t('consentRegistry.table.headers.consentId')}
                </ListingTable.SortLabel>
              </ListingTable.Cell>
              <ListingTable.Cell>
                <ListingTable.SortLabel field="type">
                  {t('consentRegistry.table.headers.type')}
                </ListingTable.SortLabel>
              </ListingTable.Cell>
              <ListingTable.Cell>
                <ListingTable.SortLabel field="status">
                  {t('consentRegistry.table.headers.status')}
                </ListingTable.SortLabel>
              </ListingTable.Cell>
              <ListingTable.Cell>{t('consentRegistry.table.headers.purposes')}</ListingTable.Cell>
              <ListingTable.Cell>
                <ListingTable.SortLabel field="createdAt">
                  {t('consentRegistry.table.headers.created')}
                </ListingTable.SortLabel>
              </ListingTable.Cell>
              <ListingTable.Cell align="center">
                {t('consentRegistry.table.headers.actions')}
              </ListingTable.Cell>
            </ListingTable.Row>
          </ListingTable.Head>

          <ListingTable.Body>
            {groupedRows.map((group) => (
              <Fragment key={group.clientName}>
                <ListingTable.Row
                  variant="table"
                  sx={{
                    bgcolor: 'action.hover',
                  }}
                >
                  <ListingTable.Cell colSpan={6} sx={{ fontWeight: 700 }}>
                    {t('consentRegistry.table.clientLabel', { client: group.clientName })}
                  </ListingTable.Cell>
                </ListingTable.Row>

                {group.clientRows.map((row) => (
                  <ListingTable.Row key={row.id} hover variant="table">
                    <ListingTable.Cell>#{row.id}</ListingTable.Cell>
                    <ListingTable.Cell>{row.type}</ListingTable.Cell>
                    <ListingTable.Cell>
                      <Chip
                        size="small"
                        color={getStatusChipColor(row.status)}
                        label={t(`consentRegistry.status.${row.status.toLowerCase()}`)}
                        variant="outlined"
                      />
                    </ListingTable.Cell>
                    <ListingTable.Cell>{row.purposes.join(', ')}</ListingTable.Cell>
                    <ListingTable.Cell>
                      {formatIsoDateTime(row.createdAt, CREATED_AT_FORMAT_OPTIONS)}
                    </ListingTable.Cell>
                    <ListingTable.Cell align="center">
                      <ListingTable.RowActions visibility="always">
                        <IconButton
                          size="small"
                          component={RouterLink}
                          to={`/consents/${row.id}`}
                          aria-label={t('consentRegistry.actions.view')}
                        >
                          <Eye size={16} />
                        </IconButton>
                        {row.canApprove ? (
                          <IconButton
                            size="small"
                            color="warning"
                            aria-label={t('consentRegistry.actions.approve')}
                            disabled={isMutating}
                            onClick={() => {
                              onApprove(row.id)
                            }}
                          >
                            <CircleCheckBig size={16} />
                          </IconButton>
                        ) : (
                          <IconButton
                            size="small"
                            color="error"
                            disabled={!row.canRevoke || isMutating}
                            aria-label={t('consentRegistry.actions.revoke')}
                            onClick={() => {
                              onRevoke(row.id)
                            }}
                          >
                            <ShieldX size={16} />
                          </IconButton>
                        )}
                      </ListingTable.RowActions>
                    </ListingTable.Cell>
                  </ListingTable.Row>
                ))}
              </Fragment>
            ))}
          </ListingTable.Body>
        </ListingTable>

        <TablePagination
          component="div"
          count={totalCount}
          page={page}
          rowsPerPage={rowsPerPage}
          rowsPerPageOptions={rowsPerPageOptions}
          onPageChange={(_, nextPage) => {
            onPageChange(nextPage)
          }}
          onRowsPerPageChange={(event) => {
            onRowsPerPageChange(Number(event.target.value))
          }}
        />
      </ListingTable.Container>
    </ListingTable.Provider>
  )
}

export default ConsentRegistryTable
