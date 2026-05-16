import { redirect } from 'next/navigation'
import { AdminPrototype } from '@/components/digital-receptionist/admin-prototype'
import { hasAdminCookie } from '@/lib/digital-receptionist/server/auth'

export default async function AdminPage() {
  if (!(await hasAdminCookie())) {
    redirect('/admin/login')
  }

  return <AdminPrototype />
}
