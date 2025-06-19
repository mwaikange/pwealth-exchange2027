interface Order {
  ref: string
  amount: number
  status: "Active" | "Filled" | "Expired" | "Queued"
  progress: string
}

interface OrderTableProps {
  title: string
  orders: Order[]
}

export default function OrderTable({ title, orders }: OrderTableProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "Active":
        return "text-green-600 dark:text-green-400"
      case "Filled":
        return "text-blue-600 dark:text-blue-400"
      case "Expired":
        return "text-red-600 dark:text-red-400"
      case "Queued":
        return "text-yellow-600 dark:text-yellow-400"
      default:
        return "text-gray-600 dark:text-gray-400"
    }
  }

  return (
    <div>
      <div className="bg-cyan-100 dark:bg-cyan-900/30 p-3 rounded-t-lg">
        <div className="grid grid-cols-4 gap-4 font-semibold text-gray-800 dark:text-gray-200">
          <div>{title}</div>
          <div>Amount</div>
          <div>Status</div>
          <div>#</div>
        </div>
      </div>
      <div className="bg-white dark:bg-gray-800 border border-t-0 border-gray-200 dark:border-gray-700 rounded-b-lg">
        {orders.map((order) => (
          <div
            key={order.ref}
            className="grid grid-cols-4 gap-4 p-3 border-b border-gray-100 dark:border-gray-700 last:border-b-0"
          >
            <div className="text-sm text-gray-900 dark:text-gray-100">{order.ref}</div>
            <div className="text-sm text-gray-900 dark:text-gray-100">{order.amount}</div>
            <div className={`text-sm font-medium ${getStatusColor(order.status)}`}>{order.status}</div>
            <div className="text-sm text-gray-900 dark:text-gray-100">{order.progress}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
