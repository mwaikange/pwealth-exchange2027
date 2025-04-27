export default function Loading() {
  return (
    <div className="flex items-center justify-center h-screen bg-[#1c1e26] text-white">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white mx-auto mb-4"></div>
        <p>Loading...</p>
      </div>
    </div>
  )
}
