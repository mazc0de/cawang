import { Link, Outlet } from 'react-router'
import { BalanceFragment } from '@/components/balance-fragment'
import { Wordmark } from '@/components/brand-mark'
import { HeaderUtilities } from '@/components/header/header-utilities'
import { AlwaysShowAmounts } from '@/providers/amount-visibility'

export function AuthLayout() {
  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="flex flex-col px-4 py-4 sm:px-8">
        <div className="flex items-center justify-between">
          <Link to="/" className="rounded-lg">
            <Wordmark />
          </Link>
          <HeaderUtilities notifications={false} />
        </div>
        <main className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-[380px]">
            <Outlet />
          </div>
        </main>
      </div>
      <aside className="hidden items-center justify-center bg-raised p-10 lg:flex">
        <AlwaysShowAmounts>
          <BalanceFragment />
        </AlwaysShowAmounts>
      </aside>
    </div>
  )
}
