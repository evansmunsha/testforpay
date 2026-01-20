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
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-gray-900">
          {isDeveloper ? 'Payments' : 'Earnings'}
        </h2>
        <p className="text-gray-600 mt-1">
          {isDeveloper ? 'Track your payment history' : 'View your earnings and payouts'}
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              {isDeveloper ? 'Total Spent' : 'Total Earned'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">${totalAmount.toFixed(2)}</div>
            <p className="text-xs text-gray-500 mt-1">All time (completed)</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              {isDeveloper ? 'Pending Escrow' : 'Pending Payout'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">${pendingAmount.toFixed(2)}</div>
            <p className="text-xs text-gray-500 mt-1">Awaiting completion</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Transactions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{transactions.length}</div>
            <p className="text-xs text-gray-500 mt-1">Total count</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
          <CardDescription>
            {isDeveloper ? 'Your payment transactions' : 'Your earnings history'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <DollarSign className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p className="font-medium mb-2">No transactions yet</p>
              <p className="text-sm">
                {isDeveloper 
                  ? 'Create testing jobs to see payment history' 
                  : 'Complete testing jobs to see earnings'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
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