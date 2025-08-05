'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSaldo } from '@/lib/getSaldo'
import { supabase } from '@/lib/supabase'

export default function PainelPrincipal() {
  const router = useRouter()
  const [saldo, setSaldo] = useState(0)
  const [msg, setMsg] = useState('')

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
        const produto = item.produtos as any // Forçar tipo para acessar propriedades aninhadas
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

      // Copiar para área de transferência
      await navigator.clipboard.writeText(catalogo)
      setMsg('Catálogo copiado para área de transferência!')
      
      // Limpar mensagem após 3 segundos
      setTimeout(() => setMsg(''), 3000)
    } catch (e) {
      setMsg(`Erro ao copiar catálogo: ${e instanceof Error ? e.message : 'Erro desconhecido'}`)
      setTimeout(() => setMsg(''), 3000)
    }
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      
      {/* Header com saldo no canto superior direito */}
      <div className="flex justify-end items-center p-4">
        <span className="text-lg font-bold text-black bg-white px-4 py-2 rounded">
          R$ {saldo.toFixed(2)}
        </span>
      </div>

      {/* Conteúdo principal centralizado */}
      <div className="flex flex-col items-center justify-center flex-grow space-y-4">
        <h1 className="text-3xl font-bold mb-4">Painel Principal</h1>

        {/* Mensagem */}
        {msg && (
          <div className={`mb-4 p-3 rounded ${
            msg.includes('copiado') || msg.includes('sucesso')
              ? 'bg-green-100 text-green-700 border border-green-300' 
              : 'bg-blue-100 text-blue-700 border border-blue-300'
          }`}>
            {msg}
          </div>
        )}

        <button
          onClick={() => router.push('/venda-comum')}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded w-64"
        >
          Registrar Venda Comum
        </button>

        <button
          onClick={() => router.push('/venda-personalizada')}
          className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-6 rounded w-64"
        >
          Registrar Venda Personalizada
        </button>

        <button
          onClick={() => router.push('/estoque')}
          className="bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded w-64"
        >
          Gerenciar Estoque
        </button>

        <button
          onClick={copiarCatalogo}
          className="bg-orange-600 hover:bg-orange-700 text-white font-semibold py-3 px-6 rounded w-64"
        >
          📋 Copiar Catálogo
        </button>

        <button
          onClick={() => router.push('/historico')}
          className="bg-gray-700 hover:bg-gray-800 text-white font-semibold py-3 px-6 rounded w-64"
        >
          Histórico de Vendas
        </button>
      </div>
    </div>
  )
}