import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background com gradiente e imagem de fundo */}
      <div 
        className="absolute inset-0 bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900"
        style={{
          backgroundImage: "url('/images/background.jpg')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundBlendMode: 'overlay'
        }}
      >
        {/* Overlay para melhorar a legibilidade */}
        <div className="absolute inset-0 bg-black/40"></div>
      </div>

      {/* Conteúdo principal */}
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header */}
        <header className="p-6 sm:p-8">
          <div className="max-w-7xl mx-auto">
            <h1 className="text-2xl sm:text-3xl font-bold text-white">
              NWZ Shop
            </h1>
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 flex items-center justify-center px-6 sm:px-8">
          <div className="max-w-4xl mx-auto text-center">
            {/* Logo ou ícone principal */}
            <div className="mb-8">
              <div className="w-24 h-24 sm:w-32 sm:h-32 mx-auto mb-6 bg-white/10 backdrop-blur-sm rounded-full flex items-center justify-center border border-white/20">
                <svg 
                  className="w-12 h-12 sm:w-16 sm:h-16 text-white" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" 
                  />
                </svg>
              </div>
            </div>

            {/* Título principal */}
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
              Bem-vindo ao
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
                NWZ Shop
              </span>
            </h2>

            {/* Subtítulo */}
            <p className="text-xl sm:text-2xl text-gray-200 mb-12 max-w-3xl mx-auto leading-relaxed">
              Sua plataforma completa para gerenciamento de vendas e estoque. 
              Controle suas operações de forma simples e eficiente.
            </p>

            {/* Call to action */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link 
                href="/login"
                className="group relative inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-white transition-all duration-300 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full hover:from-blue-700 hover:to-purple-700 hover:scale-105 shadow-xl hover:shadow-2xl"
              >
                <span className="relative z-10">Acessar Sistema</span>
                <svg 
                  className="w-5 h-5 ml-2 transition-transform group-hover:translate-x-1" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M13 7l5 5m0 0l-5 5m5-5H6" 
                  />
                </svg>
              </Link>

              <button className="px-8 py-4 text-lg font-semibold text-white border-2 border-white/30 rounded-full hover:bg-white/10 transition-all duration-300 backdrop-blur-sm">
                Saiba Mais
              </button>
            </div>

            {/* Features destacadas */}
            <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-8 max-w-3xl mx-auto">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-white/10 backdrop-blur-sm rounded-lg flex items-center justify-center">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Controle de Estoque</h3>
                <p className="text-gray-300 text-sm">Gerencie seu inventário de forma inteligente</p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-white/10 backdrop-blur-sm rounded-lg flex items-center justify-center">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Gestão de Vendas</h3>
                <p className="text-gray-300 text-sm">Acompanhe suas vendas em tempo real</p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-white/10 backdrop-blur-sm rounded-lg flex items-center justify-center">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Relatórios</h3>
                <p className="text-gray-300 text-sm">Analise o desempenho do seu negócio</p>
              </div>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="p-6 sm:p-8 text-center">
          <p className="text-gray-400 text-sm">
            © 2025 NWZ Shop. Todos os direitos reservados.
          </p>
        </footer>
      </div>

      {/* Efeito de partículas/decoração */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse" style={{animationDelay: '2s'}}></div>
      </div>
    </div>
  );
}
