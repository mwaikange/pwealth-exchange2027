"use client"

import { useState } from "react"
import { CountryCombobox } from "./country-combobox"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export function CountryForm() {
  const [country, setCountry] = useState("")

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Country Selection</CardTitle>
        <CardDescription>Select your country from the dropdown or search by typing</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid w-full items-center gap-4">
          <div className="flex flex-col space-y-1.5">
            <Label htmlFor="country">Country</Label>
            <CountryCombobox value={country} onChange={setCountry} />
          </div>

          {country && (
            <div className="p-3 bg-muted rounded-md">
              <p>
                Selected country code: <span className="font-mono">{country}</span>
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
