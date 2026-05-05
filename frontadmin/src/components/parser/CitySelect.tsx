import * as React from "react"
import { Check, ChevronsUpDown, X } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"

export type City = {
  id: number
  title: string
  region?: string
}

interface CitySelectProps {
  selectedCities: City[]
  onChange: (cities: City[]) => void
  disabled?: boolean
  maxCount?: number
}

export function CitySelect({ selectedCities, onChange, disabled, maxCount }: CitySelectProps) {
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState("")
  const [options, setOptions] = React.useState<City[]>([])
  const [isLoading, setIsLoading] = React.useState(false)

  React.useEffect(() => {
    if (!query || query.length < 2) {
      setOptions([])
      return
    }

    const timer = setTimeout(async () => {
      setIsLoading(true)
      try {
        const res = await fetch(`/api/admin/parser/cities?q=${encodeURIComponent(query)}`)
        const data = await res.json()
        if (data && data.items) {
          setOptions(data.items)
        }
      } catch (err) {
        console.error("Failed to fetch cities", err)
      } finally {
        setIsLoading(false)
      }
    }, 400)

    return () => clearTimeout(timer)
  }, [query])

  const toggleCity = (city: City) => {
    const exists = selectedCities.find((c) => c.id === city.id)
    if (exists) {
      onChange(selectedCities.filter((c) => c.id !== city.id))
    } else {
      if (maxCount && selectedCities.length >= maxCount) {
        // Replace the last one or clear and set
        onChange([city])
      } else {
        onChange([...selectedCities, city])
      }
    }
  }

  const removeCity = (id: number) => {
    onChange(selectedCities.filter((c) => c.id !== id))
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {selectedCities.map((city) => (
          <Badge key={city.id} variant="secondary" className="flex items-center gap-1 text-sm">
            {city.title}
            <button
              type="button"
              className="rounded-full outline-none ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
              onClick={() => removeCity(city.id)}
              disabled={disabled}
            >
              <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
              <span className="sr-only">Удалить</span>
            </button>
          </Badge>
        ))}
      </div>
      
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger render={
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
            disabled={disabled}
          >
            Выберите город...
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        } />
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput 
              placeholder="Поиск города..." 
              value={query}
              onValueChange={setQuery}
            />
            <CommandList>
              <CommandEmpty>
                {isLoading ? "Поиск..." : (query.length < 2 ? "Введите хотя бы 2 символа" : "Город не найден.")}
              </CommandEmpty>
              <CommandGroup>
                {options.map((city) => (
                  <CommandItem
                    key={city.id}
                    value={city.id.toString()}
                    onSelect={() => {
                      toggleCity(city)
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        selectedCities.find((c) => c.id === city.id) ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {city.title} {city.region && <span className="text-muted-foreground ml-1 text-xs">({city.region})</span>}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
}
