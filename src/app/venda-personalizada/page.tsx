// app/venda-personalizada/page.tsx

'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Layout from '@/components/Layout'

type ProdutoSabor = {
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

export default function VendaPersonalizadaPage() {
  const [produtosSabores, setProdutosSabores] = useState<ProdutoSabor[]>([])
  const [idSelecionado, setIdSelecionado] = useState<number | null>(null)
  const [preco, setPreco] = useState('')
  const [descricao, setDescricao] = useState('')
  const [mensagem, setMensagem] = useState('')

  useEffect(() => {
    async function fetchProdutosSabores() {
      try {
        // Buscar produtos com sabores que têm estoque > 0
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
          .gt('quantidade', 0) // Apenas sabores com estoque

        if (error) {
          console.error('Erro ao carregar produtos com sabores:', error)
          setMensagem(`Erro ao carregar produtos: ${error.message}`)
          return
        }

        setProdutosSabores((data as unknown as ProdutoSabor[]) || [])
      } catch (e) {
        console.error('Erro inesperado ao carregar produtos:', e)
        setMensagem(`Erro inesperado ao carregar produtos: ${e instanceof Error ? e.message : 'Erro desconhecido'}`)
      }
    }
    fetchProdutosSabores()
  }, [])

  async function registrarVenda() {
    if (!idSelecionado || preco === '' || !descricao) {
      setMensagem('Preencha todos os campos.')
      return
    }

    const produtoSabor = produtosSabores.find(p => p.id === idSelecionado)
    if (!produtoSabor) {
      setMensagem('Produto não encontrado.')
      return
    }

    const precoPersonalizado = parseFloat(preco)
    
    if (isNaN(precoPersonalizado) || precoPersonalizado < 0) {
      setMensagem('Digite um preço válido (pode ser R$ 0,00 para consumo próprio).')
      return
    }
    
    try {
      // Preparar dados da venda para inserção direta no banco
      const { data: vendaData, error: vendaError } = await supabase
        .from('vendas')
        .insert({
          usuario_email: 'admin@sistema.com',
          total: precoPersonalizado,
          observacoes: descricao // Salvar o motivo da venda personalizada
        })
        .select('id')
        .single()

      if (vendaError || !vendaData) {
        console.error('Erro ao registrar venda:', vendaError)
        setMensagem(`Erro ao registrar venda: ${vendaError?.message}`)
        return
      }

      const vendaId = vendaData.id

      // Registrar item da venda
      const { error: itemError } = await supabase
        .from('itens_venda')
        .insert({
          venda_id: vendaId,
          produto_id: produtoSabor.produto_id,
          quantidade: 1,
          preco_unitario: precoPersonalizado
        })

      if (itemError) {
        console.error('Erro ao registrar item da venda:', itemError)
        setMensagem(`Erro ao registrar item da venda: ${itemError.message}`)
        return
      }

      // Atualizar estoque do sabor (diminuir 1 unidade)
      const { error: estoqueError } = await supabase
        .from('produto_sabores')
        .update({ quantidade: produtoSabor.quantidade - 1 })
        .eq('id', produtoSabor.id)

      if (estoqueError) {
        console.error('Erro ao atualizar estoque:', estoqueError)
        setMensagem(`Erro ao atualizar estoque: ${estoqueError.message}`)
        return
      }

      // Sincronizar com tabela estoque legada
      const { data: estoqueTotal, error: consultaEstoqueError } = await supabase
        .from('produto_sabores')
        .select('quantidade')
        .eq('produto_id', produtoSabor.produto_id)

      if (!consultaEstoqueError && estoqueTotal) {
        const totalEstoque = estoqueTotal.reduce((sum, item) => sum + item.quantidade, 0)
        
        await supabase
          .from('estoque')
          .upsert({ 
            produto_id: produtoSabor.produto_id, 
            quantidade: totalEstoque 
          })
      }

      // Atualizar saldo nas configurações
      const { data: saldoAtual, error: consultaSaldoError } = await supabase
        .from('configuracoes')
        .select('valor')
        .eq('chave', 'saldo')
        .single()

      if (consultaSaldoError) {
        console.error('Erro ao consultar saldo:', consultaSaldoError)
        setMensagem(`Erro ao consultar saldo: ${consultaSaldoError.message}`)
        return
      }

      const novoSaldo = parseFloat(saldoAtual.valor || '0') + precoPersonalizado
      const { error: saldoError } = await supabase
        .from('configuracoes')
        .update({ valor: novoSaldo.toString() })
        .eq('chave', 'saldo')
      
      if (saldoError) {
        console.error('Erro ao atualizar saldo:', saldoError)
        setMensagem(`Erro ao atualizar saldo: ${saldoError.message}`)
        return
      }

      setMensagem('Venda personalizada registrada com sucesso!')
      setIdSelecionado(null)
      setPreco('')
      setDescricao('')
    } catch (e) {
      console.error('Erro inesperado:', e)
      setMensagem(`Erro inesperado: ${e instanceof Error ? e.message : 'Erro desconhecido'}`)
    }
  }

  return (
    <Layout title="Venda Personalizada">
      <div className="space-y-6">
        {/* Mensagem */}
        {mensagem && (
          <div className={`p-4 rounded-xl border-l-4 ${
            mensagem.includes('sucesso') 
              ? 'bg-green-500/20 border-green-400 text-green-100' 
              : 'bg-red-500/20 border-red-400 text-red-100'
          }`}>
            <p className="font-medium">{mensagem}</p>
          </div>
        )}

        {produtosSabores.length === 0 ? (
          <div className="bg-yellow-500/20 border border-yellow-400/30 rounded-xl p-8 text-center">
            <div className="text-4xl mb-4">📭</div>
            <h3 className="text-lg font-semibold text-yellow-300 mb-2">Nenhum produto disponível</h3>
            <p className="text-yellow-200">Não há produtos com estoque para venda no momento.</p>
          </div>
        ) : (
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
            <div className="flex items-center mb-6">
              <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg flex items-center justify-center mr-3">
                <span className="text-xl">✨</span>
              </div>
              <div>
                <h2 className="text-xl font-semibold text-white">Configurar Venda Personalizada</h2>
                <p className="text-gray-400 text-sm">Defina preços especiais e adicione observações</p>
              </div>
            </div>

            <div className="space-y-6">
              {/* Seleção de Produto */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Produto
                </label>
                <select
                  className="w-full bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent"
                  value={idSelecionado ?? ''}
                  onChange={(e) => setIdSelecionado(Number(e.target.value))}
                >
                  <option value="" className="bg-gray-800">Selecione um produto</option>
                  {produtosSabores
                    .filter(produtoSabor => produtoSabor.produtos)
                    .map((produtoSabor) => (
                    <option key={produtoSabor.id} value={produtoSabor.id} className="bg-gray-800">
                      {produtoSabor.produtos!.nome} - {produtoSabor.sabor} (Estoque: {produtoSabor.quantidade})
                    </option>
                  ))}
                </select>
              </div>

              {/* Preço Personalizado */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Preço Personalizado
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-400">R$</span>
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="w-full pl-10 pr-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent"
                    value={preco}
                    onChange={(e) => setPreco(e.target.value)}
                    placeholder="0,00"
                  />
                </div>
                <p className="text-gray-400 text-xs mt-1">Defina um preço personalizado (R$ 0,00 para consumo próprio)</p>
              </div>

              {/* Descrição do Motivo */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Motivo da Personalização
                </label>
                <textarea
                  className="w-full bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent resize-none"
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  placeholder="Explique o motivo do preço personalizado (ex: promoção, consumo próprio, desconto especial, etc.)"
                  rows={3}
                />
              </div>

              {/* Preview da Venda */}
              {idSelecionado && preco && (() => {
                const produtoSelecionado = produtosSabores.find(p => p.id === idSelecionado)
                return produtoSelecionado?.produtos ? (
                <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-4">
                  <h4 className="font-medium text-white mb-2">Preview da Venda:</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-300">Produto:</span>
                      <span className="text-white">
                        {produtoSelecionado.produtos.nome} - {produtoSelecionado.sabor}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">Preço original:</span>
                      <span className="text-gray-400 line-through">
                        R$ {produtoSelecionado.produtos.preco.toFixed(2).replace('.', ',')}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">Preço personalizado:</span>
                      <span className={`font-medium ${
                        parseFloat(preco || '0') === 0 
                          ? 'text-blue-400' 
                          : 'text-green-400'
                      }`}>
                        R$ {parseFloat(preco || '0').toFixed(2).replace('.', ',')}
                        {parseFloat(preco || '0') === 0 && (
                          <span className="text-xs text-gray-400 ml-2">(consumo próprio)</span>
                        )}
                      </span>
                    </div>
                  </div>
                </div>
                ) : null
              })()}

              {/* Botão de Registrar */}
              <button
                onClick={registrarVenda}
                disabled={!idSelecionado || preco === '' || !descricao.trim()}
                className={`w-full py-4 rounded-xl text-white font-semibold text-lg transition-all duration-300 transform ${
                  idSelecionado && preco !== '' && descricao.trim()
                    ? 'bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 hover:scale-[1.02] shadow-lg hover:shadow-xl'
                    : 'bg-gray-600 cursor-not-allowed opacity-50'
                }`}
              >
                ✨ Registrar Venda Personalizada
              </button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}