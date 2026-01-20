import Image from 'next/image'
import Link from 'next/link'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="absolute top-4 left-4 sm:top-6 sm:left-6">
        <Link href="/" className="flex items-center">
          <Image 
            src="/images/logo.svg" 
            alt="TestForPay" 
            width={160} 
            height={36}
            className="h-8 sm:h-9 w-auto"
          />
        </Link>
      </div>
      {children}
    </div>
  )
}