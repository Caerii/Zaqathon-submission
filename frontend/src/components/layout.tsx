import { Link, useLocation } from 'react-router-dom'

interface LayoutProps {
  children: React.ReactNode
}

export function Layout({ children }: LayoutProps) {
  const location = useLocation()

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: '📊' },
    { name: 'Process Email', href: '/process', icon: '📧' },
    { name: 'Settings', href: '/settings', icon: '⚙️' },
  ]

  const isActive = (href: string) => location.pathname === href

  return (
    <div style={{ minHeight: '100vh' }}>
      {/* Navigation */}
      <nav className="nav">
        <div className="nav-content">
          <Link to="/" className="nav-brand">
            <div style={{ fontSize: '24px' }}>🎯</div>
            <span>Smart Order Intake</span>
          </Link>

          <div className="nav-links">
            {navigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className={`nav-link ${isActive(item.href) ? 'active' : ''}`}
              >
                <span>{item.icon}</span>
                <span>{item.name}</span>
              </Link>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main style={{ padding: '32px 0' }}>
        {children}
      </main>
    </div>
  )
} 