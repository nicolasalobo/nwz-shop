'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Layout from '@/components/Layout'

interface Venda {
  id: number
  usuario_email: string
  total: number
  data_hora: string
  observacoes?: string
  itens_venda: ItemVenda[]
}

interface ItemVenda {
  produto_id: number
  quantidade: number
  preco_unitario: number
  produtos: {
    nome: string
    preco: number
  }
}

export default function HistoricoVendas() {
  const [vendas, setVendas] = useState<Venda[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function carregarVendas() {
      setLoading(true)
      
      try {
        // Primeiro tentar sem observações
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
          setVendas([])
        } else {
          // Tentar buscar observações separadamente para vendas existentes
          const vendasComObservacoes = await Promise.all(
            data.map(async (venda) => {
              try {
                const { data: vendaComObs } = await supabase
                  .from('vendas')
                  .select('observacoes')
                  .eq('id', venda.id)
                  .single()
                
                return {
                  ...venda,
                  observacoes: vendaComObs?.observacoes || null
                }
              } catch {
                return {
                  ...venda,
                  observacoes: null
                }
              }
            })
          )
          
          setVendas(vendasComObservacoes as unknown as Venda[] || [])
        }
      } catch (err) {
        console.error('Erro inesperado:', err)
        setVendas([])
      }
      
      setLoading(false)
    }

    carregarVendas()
  }, [])

  const formatarData = (dataString: string) => {
    const data = new Date(dataString)
    return data.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const renderizarProdutos = (itens: ItemVenda[]) => {
    return (
      <div className="space-y-1">
        {itens.map((item, index) => (
          <div key={index} className="flex justify-between text-sm text-gray-300">
            <span>• {item.produtos.nome} ({item.quantidade}x)</span>
            <span>R$ {(item.preco_unitario * item.quantidade).toFixed(2).replace('.', ',')}</span>
          </div>
        ))}
      </div>
    )
  }

  const totalVendas = vendas.reduce((acc, venda) => acc + venda.total, 0)

  return (
    <Layout title="Histórico de Vendas">
      <div className="space-y-6">
        {/* Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-blue-400">
                  {vendas.length}
                </div>
                <span className="text-gray-300">Total de Vendas</span>
              </div>
              <div className="text-3xl">📊</div>
            </div>
          </div>
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-green-400">
                  R$ {totalVendas.toFixed(2).replace('.', ',')}
                </div>
                <span className="text-gray-300">Valor Total</span>
              </div>
              <div className="text-3xl">💰</div>
            </div>
          </div>
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-purple-400">
                  R$ {vendas.length > 0 ? (totalVendas / vendas.length).toFixed(2).replace('.', ',') : '0,00'}
                </div>
                <span className="text-gray-300">Ticket Médio</span>
              </div>
              <div className="text-3xl">📈</div>
            </div>
          </div>
        </div>

        {/* Lista de vendas */}
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-white/10">
            <h3 className="text-lg font-semibold text-white">Vendas Realizadas</h3>
          </div>
          
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-flex items-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span className="text-gray-300">Carregando vendas...</span>
              </div>
            </div>
          ) : vendas.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-4">📋</div>
              <span className="text-gray-300">Nenhuma venda encontrada</span>
              <p className="text-gray-400 text-sm mt-2">As vendas aparecerão aqui quando forem realizadas.</p>
            </div>
          ) : (
            <div className="p-4 space-y-4">
              {vendas.map((venda) => (
                <div key={venda.id} className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-6 hover:bg-white/10 transition-colors">
                  <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                    {/* Informações básicas */}
                    <div>
                      <div className="flex items-center space-x-2 mb-2">
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                          venda.observacoes 
                            ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white' 
                            : 'bg-gradient-to-r from-blue-500 to-blue-600 text-white'
                        }`}>
                          {venda.observacoes ? '✨ Personalizada' : 'Venda'} #{venda.id}
                        </span>
                      </div>
                      <div className="text-sm text-gray-300">
                        <div className="flex items-center space-x-1">
                          <span>📅</span>
                          <span>{formatarData(venda.data_hora)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Produtos */}
                    <div className="lg:col-span-2">
                      <div className="space-y-2">
                        <h4 className="font-medium text-white text-sm">Produtos:</h4>
                        {renderizarProdutos(venda.itens_venda)}
                      </div>
                    </div>

                    {/* Valor total */}
                    <div className="text-right">
                      <div className="text-xl font-bold text-green-400">
                        R$ {venda.total.toFixed(2).replace('.', ',')}
                      </div>
                      <div className="text-sm text-gray-400">
                        Total da venda
                      </div>
                    </div>
                  </div>
                  
                  {/* Motivo da venda personalizada - ocupando toda a largura */}
                  {venda.observacoes && (
                    <div className="mt-4 p-4 bg-gradient-to-r from-purple-500/10 to-purple-600/10 border border-purple-400/30 rounded-lg">
                      <div className="flex items-start space-x-3">
                        <span className="text-purple-400 text-lg">✨</span>
                        <div className="flex-1">
                          <div className="text-sm text-purple-300 font-medium mb-2">
                            Motivo da venda personalizada:
                          </div>
                          <div className="text-base text-white bg-purple-500/10 p-3 rounded-md border border-purple-400/20">
                            {venda.observacoes}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}
