'use client'

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useState } from "react";

interface LayoutProps {
  children: React.ReactNode;
  title: string;
}

export default function Layout({ children, title }: LayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  const menuItems = [
    { href: '/painel', label: 'Painel', icon: '🏠' },
    { href: '/estoque', label: 'Estoque', icon: '📦' },
    { href: '/venda-comum', label: 'Venda Comum', icon: '🛒' },
    { href: '/venda-personalizada', label: 'Venda Personalizada', icon: '✨' },
    { href: '/historico', label: 'Histórico', icon: '📊' },
  ];

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900">
      {/* Overlay para o gradiente */}
      <div className="absolute inset-0 bg-black/20"></div>

      {/* Efeito de partículas/decoração */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse" style={{animationDelay: '2s'}}></div>
      </div>

      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header/Navigation */}
        <header className="p-4 sm:p-6">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between">
              <Link href="/" className="text-2xl font-bold text-white hover:text-blue-300 transition-colors">
                NWZ Shop
              </Link>

              {/* Desktop Navigation */}
              <nav className="hidden lg:flex items-center space-x-6">
                {menuItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-full transition-all duration-300 ${
                      pathname === item.href
                        ? 'bg-white/20 text-white'
                        : 'text-gray-300 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <span>{item.icon}</span>
                    <span>{item.label}</span>
                  </Link>
                ))}
                <button
                  onClick={handleLogout}
                  className="flex items-center space-x-2 px-4 py-2 rounded-full text-gray-300 hover:text-white hover:bg-red-500/20 transition-all duration-300"
                >
                  <span>🚪</span>
                  <span>Sair</span>
                </button>
              </nav>

              {/* Mobile Menu Button */}
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="lg:hidden p-2 rounded-lg bg-white/10 backdrop-blur-sm border border-white/20 text-white"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>

            {/* Mobile Navigation */}
            {isMenuOpen && (
              <div className="lg:hidden mt-4 p-4 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20">
                <nav className="flex flex-col space-y-2">
                  {menuItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setIsMenuOpen(false)}
                      className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-300 ${
                        pathname === item.href
                          ? 'bg-white/20 text-white'
                          : 'text-gray-300 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      <span className="text-lg">{item.icon}</span>
                      <span>{item.label}</span>
                    </Link>
                  ))}
                  <button
                    onClick={handleLogout}
                    className="flex items-center space-x-3 px-4 py-3 rounded-lg text-gray-300 hover:text-white hover:bg-red-500/20 transition-all duration-300"
                  >
                    <span className="text-lg">🚪</span>
                    <span>Sair</span>
                  </button>
                </nav>
              </div>
            )}
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 px-4 sm:px-6 pb-8">
          <div className="max-w-7xl mx-auto">
            {/* Page Title */}
            <div className="mb-8">
              <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">
                {title}
              </h1>
              <div className="h-1 w-20 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full"></div>
            </div>

            {/* Page Content */}
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-6 sm:p-8 shadow-2xl">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
