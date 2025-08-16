'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSaldo } from '@/lib/getSaldo'
import { supabase } from '@/lib/supabase'
import Layout from '@/components/Layout'

export default function PainelPrincipal() {
  const router = useRouter()
  const [saldo, setSaldo] = useState(0)
  const [msg, setMsg] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [modalText, setModalText] = useState('')
  // Helper para copiar texto com vários fallbacks (clipboard API -> execCommand -> navigator.share -> prompt)
  const copyTextToClipboard = async (text: string) => {
    // 1) Tentar primeiro o fallback síncrono (textarea + execCommand).
    // Em muitos navegadores móveis/webviews isso preserva o contexto de gesto e permite copiar automaticamente.
    try {
      const textarea = document.createElement('textarea')
      textarea.value = text
      textarea.style.position = 'fixed'
      textarea.style.left = '-9999px'
      textarea.style.top = '0'
      document.body.appendChild(textarea)
      textarea.focus()
      textarea.select()

      const successful = document.execCommand('copy')
      document.body.removeChild(textarea)
      if (successful) return true
    } catch {
      // continua para tentar Clipboard API
    }

    // 2) Clipboard API moderno (assíncrono)
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text)
        return true
      }
    } catch {
      // pode lançar NotAllowedError em alguns contextos (ex.: iframed/webview)
    }

    // 3) Tentar compartilhar via Web Share API (bom para mobile/webviews)
    try {
      if (typeof navigator !== 'undefined' && 'share' in navigator) {
        const shareFn = (navigator as unknown as { share?: (opts: { text: string }) => Promise<void> }).share
        if (typeof shareFn === 'function') {
          await shareFn({ text })
          return true
        }
      }
    } catch {
      // ignora e continua
    }

  // 4) Último recurso: não abrir UI aqui; o modal React será usado pelo fluxo principal
  return false
  }

  const handleModalCopy = () => {
    try {
      // Criar textarea temporária no DOM, selecionar e copiar de forma síncrona (dentro do clique)
      const textarea = document.createElement('textarea')
      textarea.value = modalText
      textarea.style.position = 'fixed'
      textarea.style.left = '-9999px'
      textarea.style.top = '0'
      document.body.appendChild(textarea)
      textarea.focus()
      textarea.select()
      const successful = document.execCommand('copy')
      document.body.removeChild(textarea)
      if (successful) {
        setMsg('Catálogo copiado para área de transferência!')
      } else {
        setMsg('Não foi possível copiar automaticamente. Selecione e copie manualmente.')
      }
    } catch {
      setMsg('Erro ao copiar automaticamente. Selecione e copie manualmente.')
    } finally {
      setModalOpen(false)
      setTimeout(() => setMsg(''), 3000)
    }
  }

  useEffect(() => {
    async function carregarSaldo() {
      const valor = await getSaldo()
      setSaldo(valor)
    }
    carregarSaldo()

    // Atualizar saldo quando a página ganhar foco (usuário voltar)
    const handleFocus = () => {
      carregarSaldo()
    }

    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [])

  const copiarCatalogo = async () => {
    try {
      setMsg('Gerando catálogo...')
      
      // Buscar produtos com estoque disponível
      const { data: produtosSabores, error } = await supabase
        .from('produto_sabores')
        .select(`
          id,
          produto_id,
          sabor,
          quantidade,
          produtos (
            id,
            nome,
            preco
          )
        `)
        .gt('quantidade', 0) // Apenas produtos com estoque > 0
        .order('produtos(nome)')

      if (error) {
        setMsg(`Erro ao carregar produtos: ${error.message}`)
        return
      }

      if (!produtosSabores || produtosSabores.length === 0) {
        setMsg('Nenhum produto em estoque encontrado')
        return
      }

      // Agrupar produtos por modelo/categoria considerando apenas produtos em estoque
      const produtosAgrupados: Record<string, { itens: string[], preco: number }> = {}
      
      produtosSabores.forEach(item => {
        const produto = item.produtos as unknown as { nome: string; preco: number } // Type assertion para acessar propriedades aninhadas
        const produtoNome = produto.nome
        const sabor = item.sabor
        
        // Tentar detectar se o nome tem um padrão como "Modelo - Sabor" ou similar
        const temSeparador = produtoNome.includes(' - ') || produtoNome.includes(' | ') || produtoNome.includes(' / ')
        
        if (temSeparador) {
          // Se tem separador, considerar a primeira parte como modelo
          const partes = produtoNome.split(/ - | \| | \/ /)
          const modelo = partes[0].trim()
          
          const chave = `${modelo}_${produto.preco}`
          if (!produtosAgrupados[chave]) {
            produtosAgrupados[chave] = { itens: [], preco: produto.preco }
          }
          if (!produtosAgrupados[chave].itens.includes(sabor)) {
            produtosAgrupados[chave].itens.push(sabor)
          }
        } else {
          // Se não tem separador, agrupar por produto base
          const chave = `${produtoNome}_${produto.preco}`
          if (!produtosAgrupados[chave]) {
            produtosAgrupados[chave] = { itens: [], preco: produto.preco }
          }
          
          // Se é o mesmo produto mas sabores diferentes, adicionar sabor
          if (sabor !== 'Original') {
            if (!produtosAgrupados[chave].itens.includes(sabor)) {
              produtosAgrupados[chave].itens.push(sabor)
            }
          } else {
            // Para sabor "Original", usar o nome do produto se não estiver já
            if (!produtosAgrupados[chave].itens.includes(produtoNome)) {
              produtosAgrupados[chave].itens.push(produtoNome)
            }
          }
        }
      })

      // Gerar texto do catálogo limpo, sem mostrar quantidades
      let catalogo = 'NWZ Shop🔥\n'
      
      const grupos = Object.entries(produtosAgrupados)
      grupos.forEach(([chave, info], index) => {
        if (index > 0) catalogo += '\n' // Linha vazia entre produtos
        
        const modelo = chave.split('_')[0]
        catalogo += `${modelo} R$ ${info.preco.toFixed(2)}\n`
        
        // Se há múltiplos itens, listar como sabores
        if (info.itens.length > 1) {
          info.itens.forEach(item => {
            catalogo += `• ${item}\n`
          })
        } else {
          // Se é item único, mostrar apenas se for diferente do modelo
          if (info.itens[0] && info.itens[0] !== modelo) {
            catalogo += `• ${info.itens[0]}\n`
          }
        }
      })

      // Copiar para área de transferência com fallbacks
      const ok = await copyTextToClipboard(catalogo)
      if (ok) {
        setMsg('Catálogo copiado para área de transferência!')
      } else {
        // Abrir modal com texto para o usuário tocar em "Copiar" (disparo síncrono no clique)
        setModalText(catalogo)
        setModalOpen(true)
        setMsg('Toque em Copiar no modal caso a cópia automática não tenha funcionado')
      }
      
      // Limpar mensagem após 3 segundos
      setTimeout(() => setMsg(''), 3000)
    } catch (e) {
      setMsg(`Erro ao copiar catálogo: ${e instanceof Error ? e.message : 'Erro desconhecido'}`)
      setTimeout(() => setMsg(''), 3000)
    }
  }

  const cards = [
    {
      title: 'Venda Comum',
      description: 'Registre vendas rápidas de produtos em estoque',
      icon: '🛒',
      action: () => router.push('/venda-comum'),
      color: 'from-blue-500 to-blue-600'
    },
    {
      title: 'Venda Personalizada',
      description: 'Vendas com personalizações e detalhes específicos',
      icon: '✨',
      action: () => router.push('/venda-personalizada'),
      color: 'from-purple-500 to-purple-600'
    },
    {
      title: 'Gerenciar Estoque',
      description: 'Controle completo do seu inventário',
      icon: '📦',
      action: () => router.push('/estoque'),
      color: 'from-green-500 to-green-600'
    },
    {
      title: 'Copiar Catálogo',
      description: 'Gere um catálogo atualizado para compartilhar',
      icon: '📋',
      action: copiarCatalogo,
      color: 'from-orange-500 to-orange-600'
    },
    {
      title: 'Histórico de Vendas',
      description: 'Visualize relatórios e histórico completo',
      icon: '📊',
      action: () => router.push('/historico'),
      color: 'from-gray-500 to-gray-600'
    }
  ]

  return (
    <Layout title="Painel Principal">
      <div className="space-y-8">
        {/* Saldo Display */}
        <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-medium opacity-90">Saldo Atual</h2>
              <p className="text-3xl font-bold">
                R$ {saldo.toFixed(2).replace('.', ',')}
              </p>
            </div>
            <div className="text-4xl">
              💰
            </div>
          </div>
        </div>

        {/* Mensagem */}
        {msg && (
          <div className={`p-4 rounded-xl border-l-4 ${
            msg.includes('copiado') || msg.includes('sucesso') || msg.includes('✅')
              ? 'bg-green-500/20 border-green-400 text-green-100' 
              : 'bg-blue-500/20 border-blue-400 text-blue-100'
          }`}>
            <p className="font-medium">{msg}</p>
          </div>
        )}

        {/* Modal de cópia (aparece quando modalOpen=true) */}
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="w-full max-w-2xl bg-slate-900 text-white p-4 rounded-md shadow-lg">
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-lg font-semibold">Catálogo gerado</h3>
                <button onClick={() => setModalOpen(false)} className="text-sm text-gray-300">Fechar</button>
              </div>
              <textarea
                readOnly
                value={modalText}
                className="w-full h-64 p-3 bg-transparent border border-white/10 rounded-md text-sm whitespace-pre-wrap overflow-y-auto"
                onFocus={(e) => (e.target as HTMLTextAreaElement).select()}
              />
              <div className="mt-3 flex gap-2 justify-end">
                <button onClick={handleModalCopy} className="px-4 py-2 bg-blue-600 rounded-md">Copiar</button>
                <button onClick={() => setModalOpen(false)} className="px-4 py-2 bg-gray-700 rounded-md">Fechar</button>
              </div>
            </div>
          </div>
        )}

        {/* Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {cards.map((card, index) => (
            <button
              key={index}
              onClick={card.action}
              className="group relative bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6 hover:bg-white/10 transition-all duration-300 transform hover:scale-105 text-left"
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`w-12 h-12 rounded-lg bg-gradient-to-r ${card.color} flex items-center justify-center text-2xl`}>
                  {card.icon}
                </div>
                <svg className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">
                {card.title}
              </h3>
              <p className="text-gray-300 text-sm">
                {card.description}
              </p>
            </button>
          ))}
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-4 text-center">
            <div className="text-2xl mb-2">🎯</div>
            <div className="text-sm text-gray-300">Meta do Mês</div>
            <div className="text-lg font-semibold text-white">Em breve</div>
          </div>
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-4 text-center">
            <div className="text-2xl mb-2">📈</div>
            <div className="text-sm text-gray-300">Vendas Hoje</div>
            <div className="text-lg font-semibold text-white">Em breve</div>
          </div>
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-4 text-center">
            <div className="text-2xl mb-2">⚡</div>
            <div className="text-sm text-gray-300">Status</div>
            <div className="text-lg font-semibold text-green-400">Online</div>
          </div>
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-4 text-center">
            <div className="text-2xl mb-2">🕒</div>
            <div className="text-sm text-gray-300">Última Venda</div>
            <div className="text-lg font-semibold text-white">Em breve</div>
          </div>
        </div>
      </div>
    </Layout>
  )
}