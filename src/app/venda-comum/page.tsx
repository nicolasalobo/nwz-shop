'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Layout from '@/components/Layout'

interface ProdutoSabor {
  id: number
  produto_id: number
  sabor: string
  quantidade: number
  produtos?: {
    id: number
    nome: string
    preco: number
  }
}

export default function VendaComum() {
  const [produtosSabores, setProdutosSabores] = useState<ProdutoSabor[]>([])
  const [quantidades, setQuantidades] = useState<Record<number, number>>({})
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    async function fetchProdutosSabores() {
      const { data, error } = await supabase
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
        .gt('quantidade', 0) // Apenas sabores com estoque > 0

      if (error) {
        console.error('Erro ao carregar produto_sabores:', error)
        setMsg(`Erro ao carregar produtos: ${error.message}`)
        return
      }

      if (!data || data.length === 0) {
        setMsg('Nenhum produto com estoque disponível.')
        return
      }

      // Log para debug
      console.log('Dados carregados:', data)

      // Ordenar por produto e sabor
      const dadosOrdenados = (data as unknown as ProdutoSabor[])
        .filter(item => item.produtos) // Garantir que produtos existe
        .sort((a: ProdutoSabor, b: ProdutoSabor) => {
          const nomeComparacao = a.produtos!.nome.localeCompare(b.produtos!.nome)
          if (nomeComparacao !== 0) return nomeComparacao
          return a.sabor.localeCompare(b.sabor)
        })

      setProdutosSabores(dadosOrdenados)

      // Inicializar quantidades com 0
      const initQuant: Record<number, number> = {}
      dadosOrdenados.forEach(item => {
        initQuant[item.id] = 0
      })
      setQuantidades(initQuant)
    }

    fetchProdutosSabores()
  }, [])

  function handleQuantidadeChange(saborId: number, valor: number) {
    const item = produtosSabores.find(p => p.id === saborId)
    if (item && valor > item.quantidade) return

    setQuantidades(prev => ({ ...prev, [saborId]: valor }))
  }

  function podeVender(): boolean {
    return Object.entries(quantidades).some(([id, quantidade]) => {
      const item = produtosSabores.find(p => p.id === Number(id))
      return quantidade > 0 && (item?.quantidade ?? 0) >= quantidade
    })
  }

  const handleCadastrarVenda = async () => {
    setLoading(true)
    setMsg('')

    try {
      // Validar se há produtos selecionados
      const produtosParaVenda = produtosSabores.filter(p => (quantidades[p.id] || 0) > 0)
      
      if (produtosParaVenda.length === 0) {
        setMsg('Selecione pelo menos um produto')
        setLoading(false)
        return
      }

      // Validar estoque antes de prosseguir
      for (const produto of produtosParaVenda) {
        const quantidade = quantidades[produto.id]
        if (quantidade > (produto.quantidade ?? 0)) {
          setMsg(`Estoque insuficiente para ${produto.produtos?.nome || 'Produto'} - ${produto.sabor}. Disponível: ${produto.quantidade}`)
          setLoading(false)
          return
        }
      }

      // Calcula total
      let total = 0
      for (const p of produtosParaVenda) {
        const quantidade = quantidades[p.id]
        if (p.produtos) {
          const subtotal = p.produtos.preco * quantidade
          total += subtotal
        }
      }

      // Registrar venda na tabela vendas
      const { data: vendaData, error: vendaError } = await supabase
        .from('vendas')
        .insert([{
          usuario_email: 'usuario@sistema.com', // Você pode ajustar isso depois
          total
        }])
        .select()

      if (vendaError || !vendaData || vendaData.length === 0) {
        console.error('Erro ao cadastrar venda:', vendaError)
        setMsg(`Erro ao cadastrar venda: ${vendaError?.message}`)
        setLoading(false)
        return
      }

      const vendaId = vendaData[0].id

      // Registrar itens da venda
      const itensVenda = produtosParaVenda.map(p => ({
        venda_id: vendaId,
        produto_id: p.produto_id,
        quantidade: quantidades[p.id],
        preco_unitario: p.produtos?.preco || 0
      }))

      const { error: itensError } = await supabase
        .from('itens_venda')
        .insert(itensVenda)

      if (itensError) {
        console.error('Erro ao cadastrar itens da venda:', itensError)
        setMsg(`Erro ao cadastrar itens da venda: ${itensError.message}`)
        setLoading(false)
        return
      }

      // Atualizar estoque (em ambas as tabelas para compatibilidade)
      for (const produtoSabor of produtosParaVenda) {
        const quantidadeVendida = quantidades[produtoSabor.id]
        
        // 1. Atualizar tabela estoque (antiga - usada pelas vendas)
        const { data: estoqueAtualArray, error: consultaError } = await supabase
          .from('estoque')
          .select('quantidade')
          .eq('produto_id', produtoSabor.produto_id)
          .limit(1)

        if (consultaError) {
          console.error('Erro ao consultar estoque:', consultaError)
          setMsg(`Erro ao consultar estoque: ${consultaError.message}`)
          setLoading(false)
          return
        }
        if (!estoqueAtualArray || estoqueAtualArray.length === 0) {
          setMsg('Nenhum registro de estoque encontrado para o produto.')
          setLoading(false)
          return
        }
        const estoqueAtual = estoqueAtualArray[0]
        const novaQuantidadeEstoque = estoqueAtual.quantidade - quantidadeVendida
        const { error: estoqueError } = await supabase
          .from('estoque')
          .update({ quantidade: novaQuantidadeEstoque })
          .eq('produto_id', produtoSabor.produto_id)

        if (estoqueError) {
          console.error('Erro ao atualizar estoque:', estoqueError)
          setMsg(`Erro ao atualizar estoque: ${estoqueError.message}`)
          setLoading(false)
          return
        }

        // 2. Atualizar produto_sabores específico (nova estrutura)
        const novaQuantidadeSabor = produtoSabor.quantidade - quantidadeVendida
        const { error: saborError } = await supabase
          .from('produto_sabores')
          .update({ quantidade: novaQuantidadeSabor })
          .eq('id', produtoSabor.id)

        if (saborError) {
          console.error('Erro ao atualizar sabor no estoque:', saborError)
          setMsg(`Erro ao atualizar sabor no estoque: ${saborError.message}`)
          setLoading(false)
          return
        }
      }

      // Atualizar saldo nas configurações
      const { data: saldoAtual, error: consultaSaldoError } = await supabase
        .from('configuracoes')
        .select('valor')
        .eq('chave', 'saldo')
        .single()

      if (consultaSaldoError) {
        console.error('Erro ao consultar saldo:', consultaSaldoError)
        setMsg(`Erro ao consultar saldo: ${consultaSaldoError.message}`)
        setLoading(false)
        return
      }

      const novoSaldo = parseFloat(saldoAtual.valor || '0') + total
      const { error: saldoError } = await supabase
        .from('configuracoes')
        .update({ valor: novoSaldo.toString() })
        .eq('chave', 'saldo')

      if (saldoError) {
        console.error('Erro ao atualizar saldo:', saldoError)
        setMsg(`Erro ao atualizar saldo: ${saldoError.message}`)
        setLoading(false)
        return
      }

      setMsg('Venda cadastrada com sucesso!')

      // Resetar quantidades e recarregar produtos para atualizar estoque
      const resetQuant: Record<number, number> = {}
      produtosSabores.forEach(p => {
        resetQuant[p.id] = 0
      })
      setQuantidades(resetQuant)

      // Recarregar produtos com estoque atualizado
      const { data: produtosData, error: produtosError } = await supabase
        .from('produtos')
        .select('*')

      if (!produtosError && produtosData) {
        const { data: estoquesData, error: estoquesError } = await supabase
          .from('estoque')
          .select('produto_id, quantidade')

        if (!estoquesError && estoquesData) {
          const produtosComEstoque = produtosData.map(produto => {
            const estoque = estoquesData.find(e => e.produto_id === produto.id)
            return {
              ...produto,
              estoque: estoque?.quantidade ?? 0
            }
          })
          setProdutosSabores(produtosComEstoque)
        }
      }
    } catch (e) {
      console.error('Erro inesperado:', e)
      setMsg(`Erro inesperado: ${e instanceof Error ? e.message : 'Erro desconhecido'}`)
    }

    setLoading(false)
  }

  return (
    <Layout title="Venda Comum">
      <div className="space-y-6">
        {/* Mensagem */}
        {msg && (
          <div className={`p-4 rounded-xl border-l-4 ${
            msg.includes('sucesso') 
              ? 'bg-green-500/20 border-green-400 text-green-100' 
              : 'bg-red-500/20 border-red-400 text-red-100'
          }`}>
            <p className="font-medium">{msg}</p>
          </div>
        )}

        {produtosSabores.length === 0 ? (
          <div className="bg-yellow-500/20 border border-yellow-400/30 rounded-xl p-8 text-center">
            <div className="text-4xl mb-4">📭</div>
            <h3 className="text-lg font-semibold text-yellow-300 mb-2">Nenhum produto disponível</h3>
            <p className="text-yellow-200">Não há produtos com estoque para venda no momento.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Produtos */}
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl overflow-hidden">
              <div className="p-4 border-b border-white/10">
                <h3 className="text-lg font-semibold text-white flex items-center">
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg flex items-center justify-center mr-3">
                    <span className="text-lg">🛒</span>
                  </div>
                  Produtos Disponíveis
                </h3>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-white/5">
                    <tr>
                      <th className="text-left p-4 text-gray-300 font-medium">Produto</th>
                      <th className="text-right p-4 text-gray-300 font-medium">Preço</th>
                      <th className="text-center p-4 text-gray-300 font-medium">Estoque</th>
                      <th className="text-center p-4 text-gray-300 font-medium">Quantidade</th>
                    </tr>
                  </thead>
                  <tbody>
                    {produtosSabores
                      .filter(p => p.produtos) // Garantir que produtos existe
                      .map(p => (
                      <tr key={p.id} className="border-b border-white/10 hover:bg-white/5 transition-colors">
                        <td className="p-4 text-white font-medium">
                          {p.produtos?.nome || 'Nome não disponível'} - {p.sabor}
                        </td>
                        <td className="p-4 text-right text-green-400 font-medium">
                          R$ {(p.produtos?.preco || 0).toFixed(2).replace('.', ',')}
                        </td>
                        <td className="p-4 text-center">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            p.quantidade > 10 
                              ? 'bg-green-500/20 text-green-300' 
                              : p.quantidade > 0 
                              ? 'bg-yellow-500/20 text-yellow-300' 
                              : 'bg-red-500/20 text-red-300'
                          }`}>
                            {p.quantidade}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <input
                            type="number"
                            min={0}
                            max={p.quantidade}
                            value={quantidades[p.id] || 0}
                            onChange={e => {
                              const valor = parseInt(e.target.value) || 0
                              handleQuantidadeChange(p.id, valor)
                            }}
                            className="w-20 text-center bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Resumo da Venda */}
            {Object.keys(quantidades).some(id => quantidades[parseInt(id)] > 0) && (
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                  <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg flex items-center justify-center mr-3">
                    <span className="text-lg">💰</span>
                  </div>
                  Resumo da Venda
                </h3>
                <div className="space-y-2">
                  {produtosSabores
                    .filter(p => quantidades[p.id] > 0 && p.produtos)
                    .map(p => (
                      <div key={p.id} className="flex justify-between text-gray-300">
                        <span>{p.produtos?.nome || 'Nome não disponível'} - {p.sabor} ({quantidades[p.id]}x)</span>
                        <span className="text-green-400 font-medium">
                          R$ {((p.produtos?.preco || 0) * quantidades[p.id]).toFixed(2).replace('.', ',')}
                        </span>
                      </div>
                    ))}
                  <div className="border-t border-white/10 pt-2 mt-4">
                    <div className="flex justify-between text-lg font-semibold">
                      <span className="text-white">Total:</span>
                      <span className="text-green-400">
                        R$ {produtosSabores
                          .filter(p => p.produtos)
                          .reduce((total, p) => total + ((p.produtos?.preco || 0) * (quantidades[p.id] || 0)), 0)
                          .toFixed(2)
                          .replace('.', ',')}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Botão de Finalizar */}
            <button
              disabled={!podeVender() || loading}
              onClick={handleCadastrarVenda}
              className={`w-full py-4 rounded-xl text-white font-semibold text-lg transition-all duration-300 transform ${
                podeVender() && !loading 
                  ? 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 hover:scale-[1.02] shadow-lg hover:shadow-xl' 
                  : 'bg-gray-600 cursor-not-allowed opacity-50'
              }`}
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processando Venda...
                </div>
              ) : (
                '✅ Finalizar Venda'
              )}
            </button>
          </div>
        )}
      </div>
    </Layout>
  )
}