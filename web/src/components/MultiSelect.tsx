import { CheckIcon, ChevronsUpDownIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

export interface MultiSelectOption {
  value: string
  label: string
}

/**
 * A searchable multi-select. Values are the canonical (English) terms stored in
 * the sheet; labels may be translated for display.
 */
export function MultiSelect({
  options,
  values,
  onChange,
  placeholder,
  id,
}: {
  options: MultiSelectOption[]
  values: string[]
  onChange: (next: string[]) => void
  placeholder: string
  id?: string
}) {
  const { t } = useTranslation()

  const toggle = (value: string) =>
    onChange(values.includes(value) ? values.filter((v) => v !== value) : [...values, value])

  const selectedLabels = values
    .map((v) => options.find((o) => o.value === v)?.label ?? v)
    .join(', ')

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          className="w-full justify-between font-normal"
        >
          <span className={cn('truncate', !values.length && 'text-muted-foreground')}>
            {values.length ? selectedLabels : placeholder}
          </span>
          <ChevronsUpDownIcon className="size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-(--radix-popover-trigger-width) p-0" align="start">
        <Command>
          <CommandInput placeholder={t('form.search')} />
          <CommandList>
            <CommandEmpty>{t('form.noResults')}</CommandEmpty>
            {options.map((o) => (
              <CommandItem key={o.value} value={o.label} onSelect={() => toggle(o.value)}>
                <CheckIcon
                  className={cn('mr-2 size-4', values.includes(o.value) ? 'opacity-100' : 'opacity-0')}
                />
                {o.label}
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
