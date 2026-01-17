import { DollarSign } from 'lucide-react'
import Link from 'next/link'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 via-white to-purple-50">
      <div className="absolute top-4 left-4">
        <Link href="/" className="flex items-center gap-2">
          <DollarSign className="h-8 w-8 text-blue-600" />
          <span className="text-2xl font-bold text-gray-900">TestForPay</span>
        </Link>
      </div>
      {children}
    </div>
  )
}