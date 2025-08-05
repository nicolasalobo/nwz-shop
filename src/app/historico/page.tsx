'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

interface Venda {
  id: number
  usuario_email: string
  total: number
  data_hora: string
  itens_venda: {
    produto_id: number
    quantidade: number
    preco_unitario: number
    produtos: {
      nome: string
      preco: number
    }
  }[]
}

export default function HistoricoVendas() {
  const router = useRouter()
  const [vendas, setVendas] = useState<Venda[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function carregarVendas() {
      setLoading(true)
      
      const { data, error } = await supabase
        .from('vendas')
        .select(`
          id,
          usuario_email,
          total,
          data_hora,
          itens_venda!inner (
            produto_id,
            quantidade,
            preco_unitario,
            produtos!inner (
              nome,
              preco
            )
          )
        `)
        .order('data_hora', { ascending: false })

      if (error) {
        console.error('Erro ao carregar vendas:', error)
      } else {
        setVendas(data as any || [])
      }
      
      setLoading(false)
    }

    carregarVendas()
  }, [])

  const formatarData = (dataString: string) => {
    const data = new Date(dataString)
    return data.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const renderizarProdutos = (itensVenda: any[]) => {
    return (
      <div className="text-sm space-y-1">
        {itensVenda.map((item, index) => (
          <div key={index}>
            <span className="font-medium">{item.produtos.nome}</span> - 
            Qtd: {item.quantidade} x R$ {item.preco_unitario.toFixed(2)} = 
            R$ {(item.quantidade * item.preco_unitario).toFixed(2)}
            {item.preco_unitario !== item.produtos.preco && (
              <span className="text-blue-600 ml-2">
                (Preço original: R$ {item.produtos.preco.toFixed(2)})
              </span>
            )}
          </div>
        ))}
      </div>
    )
  }

  const totalVendas = vendas.reduce((acc, venda) => acc + venda.total, 0)

  return (
    <div className="min-h-screen bg-black text-white p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Histórico de Vendas</h1>
          <button
            onClick={() => router.push('/painel')}
            className="bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded"
          >
            Voltar ao Painel
          </button>
        </div>

        {/* Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-gray-800 p-4 rounded-lg">
            <div className="text-2xl font-bold text-blue-400">
              {vendas.length}
            </div>
            <span className="text-gray-400">Total de Vendas</span>
          </div>
          <div className="bg-gray-800 p-4 rounded-lg">
            <div className="text-2xl font-bold text-green-400">
              R$ {totalVendas.toFixed(2)}
            </div>
            <span className="text-gray-400">Valor Total</span>
          </div>
          <div className="bg-gray-800 p-4 rounded-lg">
            <div className="text-2xl font-bold text-purple-400">
              R$ {vendas.length > 0 ? (totalVendas / vendas.length).toFixed(2) : '0.00'}
            </div>
            <span className="text-gray-400">Ticket Médio</span>
          </div>
        </div>

        {/* Lista de vendas */}
        {loading ? (
          <div className="text-center py-8">
            <span className="text-gray-400">Carregando vendas...</span>
          </div>
        ) : vendas.length === 0 ? (
          <div className="text-center py-8">
            <span className="text-gray-400">Nenhuma venda encontrada</span>
          </div>
        ) : (
          <div className="space-y-4">
            {vendas.map((venda) => (
              <div key={venda.id} className="bg-gray-900 p-4 rounded border border-gray-700">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {/* Informações básicas */}
                  <div>
                    <span className="inline-block px-2 py-1 rounded text-xs font-medium bg-blue-600 text-white">
                      Venda #{venda.id}
                    </span>
                    <div className="mt-2 text-sm text-gray-400">
                      {formatarData(venda.data_hora)}
                    </div>
                  </div>

                  {/* Produtos */}
                  <div className="col-span-2">
                    {renderizarProdutos(venda.itens_venda)}
                  </div>

                  {/* Valor total */}
                  <div className="text-right">
                    <div className="text-xl font-bold text-green-400">
                      R$ {venda.total.toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
