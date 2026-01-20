'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { DollarSign, Clock, CheckCircle, XCircle } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { Badge } from '@/components/ui/badge'

interface Transaction {
  id: string
  amount: number
  totalAmount: number
  status: string
  createdAt: string
  job: {
    appName: string
  }
  application?: {
    tester: {
      name: string | null
      email: string
    }
  }
}

export default function PaymentsPage() {
  const { isDeveloper } = useAuth()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchTransactions()
  }, [])

  const fetchTransactions = async () => {
    try {
      const response = await fetch('/api/user/transactions')
      const data = await response.json()
      if (response.ok) {
        setTransactions(data.transactions)
      }
    } catch (error) {
      console.error('Failed to fetch transactions:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED': return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'PENDING': return <Clock className="h-4 w-4 text-yellow-600" />
      case 'FAILED': return <XCircle className="h-4 w-4 text-red-600" />
      default: return null
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'bg-green-100 text-green-800'
      case 'PENDING': return 'bg-yellow-100 text-yellow-800'
      case 'FAILED': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const totalAmount = transactions
    .filter(t => t.status === 'COMPLETED')
    .reduce((sum, t) => sum + (isDeveloper ? t.totalAmount : t.amount), 0)

  const pendingAmount = transactions
    .filter(t => t.status === 'PENDING')
    .reduce((sum, t) => sum + (isDeveloper ? t.totalAmount : t.amount), 0)

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">
          {isDeveloper ? 'Payments' : 'Earnings'}
        </h2>
        <p className="text-sm sm:text-base text-gray-600 mt-1">
          {isDeveloper ? 'Track your payment history' : 'View your earnings and payouts'}
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-6">
        <Card>
          <CardHeader className="pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
            <CardTitle className="text-xs sm:text-sm font-medium text-gray-600 truncate">
              {isDeveloper ? 'Total Spent' : 'Total Earned'}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
            <div className="text-xl sm:text-3xl font-bold">${totalAmount.toFixed(2)}</div>
            <p className="text-[10px] sm:text-xs text-gray-500 mt-1">All time (completed)</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
            <CardTitle className="text-xs sm:text-sm font-medium text-gray-600 truncate">
              {isDeveloper ? 'Pending Escrow' : 'Pending Payout'}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
            <div className="text-xl sm:text-3xl font-bold">${pendingAmount.toFixed(2)}</div>
            <p className="text-[10px] sm:text-xs text-gray-500 mt-1">Awaiting completion</p>
          </CardContent>
        </Card>

        <Card className="col-span-2 md:col-span-1">
          <CardHeader className="pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
            <CardTitle className="text-xs sm:text-sm font-medium text-gray-600">
              Transactions
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
            <div className="text-xl sm:text-3xl font-bold">{transactions.length}</div>
            <p className="text-[10px] sm:text-xs text-gray-500 mt-1">Total count</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="px-3 sm:px-6">
          <CardTitle className="text-base sm:text-lg">Transaction History</CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            {isDeveloper ? 'Your payment transactions' : 'Your earnings history'}
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0 sm:px-6">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-12 text-gray-500 px-4">
              <DollarSign className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-4 text-gray-400" />
              <p className="font-medium mb-2 text-sm sm:text-base">No transactions yet</p>
              <p className="text-xs sm:text-sm">
                {isDeveloper 
                  ? 'Create testing jobs to see payment history' 
                  : 'Complete testing jobs to see earnings'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              {/* Mobile card view */}
              <div className="sm:hidden space-y-3 px-3">
                {transactions.map((t) => (
                  <div key={t.id} className="border rounded-lg p-3 bg-gray-50">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{t.job.appName}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(t.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge className={`${getStatusColor(t.status)} text-[10px]`} variant="outline">
                        {getStatusIcon(t.status)}
                        <span className="ml-1">{t.status}</span>
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-bold">
                        ${(isDeveloper ? t.totalAmount : t.amount).toFixed(2)}
                      </span>
                      {isDeveloper && t.application?.tester && (
                        <span className="text-xs text-gray-500 truncate max-w-[120px]">
                          {t.application.tester.name || t.application.tester.email}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              {/* Desktop table view */}
              <table className="hidden sm:table w-full text-sm text-left">
                <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                  <tr>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Job / App</th>
                    {isDeveloper && <th className="px-4 py-3">Tester</th>}
                    <th className="px-4 py-3">Amount</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {transactions.map((t) => (
                    <tr key={t.id} className="bg-white hover:bg-gray-50">
                      <td className="px-4 py-4 whitespace-nowrap">
                        {new Date(t.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-4">
                        <p className="font-medium">{t.job.appName}</p>
                      </td>
                      {isDeveloper && (
                        <td className="px-4 py-4 text-gray-600">
                          {t.application?.tester.name || t.application?.tester.email}
                        </td>
                      )}
                      <td className="px-4 py-4 font-bold">
                        ${(isDeveloper ? t.totalAmount : t.amount).toFixed(2)}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <Badge className={getStatusColor(t.status)} variant="outline">
                            {getStatusIcon(t.status)}
                            <span className="ml-1.5">{t.status}</span>
                          </Badge>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}