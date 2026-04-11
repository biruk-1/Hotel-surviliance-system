import Header from './Header'
import AppFooter from './AppFooter'

export default function PublicLayout({ children }) {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <Header showUserMenu={false} />
      <main className="flex flex-1 items-center justify-center px-4 py-8 sm:px-6 lg:px-8">
        {children}
      </main>
      <AppFooter />
    </div>
  )
}
