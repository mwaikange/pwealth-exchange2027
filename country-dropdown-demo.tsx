import { CountryForm } from "./components/country-form"

export default function CountryDropdownDemo() {
  return (
    <div className="container py-10">
      <h1 className="text-2xl font-bold mb-6 text-center">Country Dropdown with Autocomplete</h1>
      <CountryForm />
    </div>
  )
}
