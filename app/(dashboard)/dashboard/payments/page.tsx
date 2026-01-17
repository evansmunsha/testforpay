'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { DollarSign } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'

export default function PaymentsPage() {
  const { isDeveloper } = useAuth()

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
            <div className="text-3xl font-bold">$0.00</div>
            <p className="text-xs text-gray-500 mt-1">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              {isDeveloper ? 'This Month' : 'Pending'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">$0.00</div>
            <p className="text-xs text-gray-500 mt-1">
              {isDeveloper ? 'Current month' : 'Awaiting payout'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Transactions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">0</div>
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
          <div className="text-center py-12 text-gray-500">
            <DollarSign className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p className="font-medium mb-2">No transactions yet</p>
            <p className="text-sm">
              {isDeveloper 
                ? 'Create testing jobs to see payment history' 
                : 'Complete testing jobs to see earnings'}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}