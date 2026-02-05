import { redirect } from 'next/navigation'

export default function ApplicationRedirectPage() {
  redirect('/dashboard/applications')
}
