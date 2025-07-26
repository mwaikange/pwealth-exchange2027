import type React from "react"

interface DashboardHeaderProps {
  title?: string
}

const DashboardHeader: React.FC<DashboardHeaderProps> = ({ title }) => {
  return (
    <header className="bg-gray-800 text-white p-4">
      <h1 className="text-2xl font-semibold">Peer Wealth Platforms</h1>
      {title && <p className="text-sm">{title}</p>}
    </header>
  )
}

export default DashboardHeader
export { DashboardHeader }
