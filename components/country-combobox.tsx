"use client"

import * as React from "react"
import { countries } from "@/lib/countries"

interface CountryComboboxProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

export function CountryCombobox({ value, onChange, placeholder = "Country", className }: CountryComboboxProps) {
  const [inputValue, setInputValue] = React.useState("")
  const [showSuggestions, setShowSuggestions] = React.useState(false)
  const [filteredCountries, setFilteredCountries] = React.useState<typeof countries>([])
  const inputRef = React.useRef<HTMLInputElement>(null)

  // Find the selected country name
  const selectedCountry = React.useMemo(() => {
    return countries.find((country) => country.name === value)
  }, [value])

  // Update input value when selected country changes
  React.useEffect(() => {
    if (selectedCountry) {
      setInputValue(selectedCountry.name)
    } else if (value) {
      // If value is a direct country name (not a code)
      setInputValue(value)
    }
  }, [selectedCountry, value])

  // Filter countries based on input
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setInputValue(value)

    if (value.length > 0) {
      const filtered = countries
        .filter((country) => country.name.toLowerCase().includes(value.toLowerCase()))
        .slice(0, 5) // Limit to 5 suggestions

      setFilteredCountries(filtered)
      setShowSuggestions(true)
    } else {
      setFilteredCountries([])
      setShowSuggestions(false)
    }
  }

  // Handle country selection
  const handleSelectCountry = (country: (typeof countries)[0]) => {
    onChange(country.name) // Use full country name instead of code
    setInputValue(country.name)
    setShowSuggestions(false)
    inputRef.current?.blur()
  }

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        onFocus={() => inputValue && setShowSuggestions(true)}
        onBlur={() => {
          // Small delay to allow click on suggestion
          setTimeout(() => setShowSuggestions(false), 200)
        }}
        placeholder={placeholder}
        className="w-full px-4 py-3 bg-[#3a3d4a] rounded-full text-white placeholder-gray-400 focus:outline-none"
      />

      {showSuggestions && filteredCountries.length > 0 && (
        <div className="absolute z-10 w-full mt-1 bg-[#3a3d4a] rounded-lg shadow-lg max-h-60 overflow-auto">
          <ul>
            {filteredCountries.map((country) => (
              <li
                key={country.code}
                className="px-4 py-2 hover:bg-[#4a4d5a] cursor-pointer text-white"
                onMouseDown={() => handleSelectCountry(country)}
              >
                {country.name}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
