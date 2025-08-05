'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface ProdutoSabor {
  id: number
  produto_id: number
  sabor: string
  quantidade: number
  produtos: {
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

      if (error || !data) {
        setMsg('Erro ao carregar produtos.')
        return
      }

      // Ordenar por produto e sabor
      const dadosOrdenados = (data as unknown as ProdutoSabor[]).sort((a: ProdutoSabor, b: ProdutoSabor) => {
        const nomeComparacao = a.produtos.nome.localeCompare(b.produtos.nome)
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
          setMsg(`Estoque insuficiente para ${produto.produtos.nome} - ${produto.sabor}. Disponível: ${produto.quantidade}`)
          setLoading(false)
          return
        }
      }

      // Calcula total e prepara produtos para o JSON
      let total = 0
      const produtosVenda = produtosParaVenda.map(p => {
        const quantidade = quantidades[p.id]
        const subtotal = p.produtos.preco * quantidade
        total += subtotal
        return {
          id: p.id,
          nome: `${p.produtos.nome} - ${p.sabor}`,
          preco: p.produtos.preco,
          quantidade,
          subtotal
        }
      })

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
      const itensVenda = produtosVenda.map(produto => ({
        venda_id: vendaId,
        produto_id: produto.id,
        quantidade: produto.quantidade,
        preco_unitario: produto.preco
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
      for (const produto of produtosVenda) {
        // 1. Atualizar tabela estoque (antiga - usada pelas vendas)
        const { data: estoqueAtual, error: consultaError } = await supabase
          .from('estoque')
          .select('quantidade')
          .eq('produto_id', produto.id)
          .single()

        if (consultaError) {
          console.error('Erro ao consultar estoque:', consultaError)
          setMsg(`Erro ao consultar estoque: ${consultaError.message}`)
          setLoading(false)
          return
        }

        const novaQuantidadeEstoque = estoqueAtual.quantidade - produto.quantidade
        const { error: estoqueError } = await supabase
          .from('estoque')
          .update({ quantidade: novaQuantidadeEstoque })
          .eq('produto_id', produto.id)

        if (estoqueError) {
          console.error('Erro ao atualizar estoque:', estoqueError)
          setMsg(`Erro ao atualizar estoque: ${estoqueError.message}`)
          setLoading(false)
          return
        }

        // 2. Atualizar também produto_sabores (nova estrutura)
        // Buscar sabores do produto para distribuir a redução
        const { data: saboresProduto } = await supabase
          .from('produto_sabores')
          .select('id, quantidade, sabor')
          .eq('produto_id', produto.id)
          .order('quantidade', { ascending: false }) // Começar pelos com mais estoque

        if (saboresProduto && saboresProduto.length > 0) {
          let quantidadeRestante = produto.quantidade
          
          for (const sabor of saboresProduto) {
            if (quantidadeRestante <= 0) break
            
            const reduzir = Math.min(sabor.quantidade, quantidadeRestante)
            const novaQuantidadeSabor = sabor.quantidade - reduzir
            
            await supabase
              .from('produto_sabores')
              .update({ quantidade: novaQuantidadeSabor })
              .eq('id', sabor.id)
            
            quantidadeRestante -= reduzir
          }
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
    <div className="p-4 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Venda Comum</h1>

      {msg && (
        <div className={`mb-4 p-3 rounded ${
          msg.includes('sucesso') 
            ? 'bg-green-100 text-green-700 border border-green-300' 
            : 'bg-red-100 text-red-700 border border-red-300'
        }`}>
          {msg}
        </div>
      )}

      {produtosSabores.length === 0 ? (
        <div className="bg-yellow-600 text-white p-4 rounded mb-4">
          <p className="font-semibold">Nenhum produto disponível</p>
          <p className="text-sm">Não há produtos com estoque para venda no momento.</p>
        </div>
      ) : (
        <>
          <table className="w-full border-collapse border border-gray-300 mb-4">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 p-2 text-left">Produto</th>
                <th className="border border-gray-300 p-2 text-right">Preço</th>
                <th className="border border-gray-300 p-2 text-center">Estoque</th>
                <th className="border border-gray-300 p-2 text-center">Quantidade</th>
              </tr>
            </thead>
            <tbody>
              {produtosSabores.map(p => (
                <tr key={p.id}>
                  <td className="border border-gray-300 p-2">{p.produtos.nome} - {p.sabor}</td>
                  <td className="border border-gray-300 p-2 text-right">R$ {p.produtos.preco.toFixed(2)}</td>
                  <td className="border border-gray-300 p-2 text-center">{p.quantidade}</td>
                  <td className="border border-gray-300 p-2 text-center">
                    <input
                      type="number"
                      min={0}
                      max={p.quantidade}
                      value={quantidades[p.id] || 0}
                      onChange={e => {
                        const valor = parseInt(e.target.value) || 0
                        handleQuantidadeChange(p.id, valor)
                      }}
                      className="w-16 text-center border rounded"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <button
            disabled={!podeVender() || loading}
            onClick={handleCadastrarVenda}
            className={`w-full py-2 rounded text-white ${
              podeVender() && !loading ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-400 cursor-not-allowed'
            }`}
          >
            {loading ? 'Cadastrando...' : 'Cadastrar Venda'}
          </button>
        </>
      )}
    </div>
  )
}