'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface Produto {
  id: number
  nome: string
  preco: number
  estoque?: number // opcional, vamos popular depois
}

export default function VendaComum() {
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [quantidades, setQuantidades] = useState<Record<number, number>>({})
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    async function fetchProdutos() {
      const { data: produtosData, error: produtosError } = await supabase
        .from('produtos')
        .select('*')

      if (produtosError || !produtosData) {
        setMsg('Erro ao carregar produtos.')
        return
      }

      // Buscar os estoques
      const { data: estoquesData, error: estoquesError } = await supabase
        .from('estoque')
        .select('produto_id, quantidade')

      if (estoquesError || !estoquesData) {
        setMsg('Erro ao carregar estoques.')
        return
      }

      // Combinar produtos com seus estoques
      const produtosComEstoque = produtosData.map(produto => {
        const estoque = estoquesData.find(e => e.produto_id === produto.id)
        return {
          ...produto,
          estoque: estoque?.quantidade ?? 0
        }
      })

      setProdutos(produtosComEstoque)

      // Inicializar quantidades com 0
      const initQuant: Record<number, number> = {}
      produtosComEstoque.forEach(p => {
        initQuant[p.id] = 0
      })
      setQuantidades(initQuant)
    }

    fetchProdutos()
  }, [])

  const handleQuantidadeChange = (id: number, valor: number) => {
    if (valor < 0) return
    setQuantidades(prev => ({ ...prev, [id]: valor }))
  }

  const podeVender = Object.entries(quantidades).some(([id, q]) => {
    const produto = produtos.find(p => p.id === Number(id))
    return q > 0 && (produto?.estoque ?? 0) >= q
  })

  const handleCadastrarVenda = async () => {
    setLoading(true)
    setMsg('')

    try {
      // calcula total
      let total = 0
      produtos.forEach(p => {
        total += p.preco * (quantidades[p.id] || 0)
      })

      const user = await supabase.auth.getUser()
      const usuario = user.data.user
      if (!usuario) {
        setMsg('Usuário não autenticado')
        setLoading(false)
        return
      }

      const { data: vendaData, error: vendaError } = await supabase
        .from('vendas')
        .insert([{ usuario_email: usuario.email, total }])
        .select()
        .single()

      if (vendaError) {
        setMsg('Erro ao cadastrar venda')
        setLoading(false)
        return
      }

      const itensVenda = produtos
        .filter(p => (quantidades[p.id] || 0) > 0)
        .map(p => ({
          venda_id: vendaData.id,
          produto_id: p.id,
          quantidade: quantidades[p.id],
          preco_unitario: p.preco
        }))

      const { error: itensError } = await supabase
        .from('itens_venda')
        .insert(itensVenda)

      if (itensError) {
        setMsg('Erro ao cadastrar itens da venda')
        setLoading(false)
        return
      }

      // Atualizar estoque
      for (const item of itensVenda) {
        const { error: estoqueError } = await supabase.rpc('diminuir_estoque', {
          p_produto_id: item.produto_id,
          p_quantidade: item.quantidade
        })
        if (estoqueError) {
          setMsg('Erro ao atualizar estoque')
          setLoading(false)
          return
        }
      }

      // Atualizar saldo
      const { error: saldoError } = await supabase.rpc('aumentar_saldo', {
        p_valor: total
      })
      if (saldoError) {
        setMsg('Erro ao atualizar saldo')
        setLoading(false)
        return
      }

      setMsg('Venda cadastrada com sucesso!')

      // Resetar quantidades
      const resetQuant: Record<number, number> = {}
      produtos.forEach(p => {
        resetQuant[p.id] = 0
      })
      setQuantidades(resetQuant)
    } catch (e) {
      setMsg('Erro inesperado')
    }

    setLoading(false)
  }

  return (
    <div className="p-4 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Venda Comum</h1>

      {msg && <p className="mb-4 text-center text-green-600">{msg}</p>}

      <table className="w-full border-collapse border border-gray-300 mb-4">
        <thead>
          <tr>
            <th className="border border-gray-300 p-2 text-left">Produto</th>
            <th className="border border-gray-300 p-2 text-right">Preço</th>
            <th className="border border-gray-300 p-2 text-center">Estoque</th>
            <th className="border border-gray-300 p-2 text-center">Quantidade</th>
          </tr>
        </thead>
        <tbody>
          {produtos.map(p => (
            <tr key={p.id}>
              <td className="border border-gray-300 p-2">{p.nome}</td>
              <td className="border border-gray-300 p-2 text-right">R$ {p.preco.toFixed(2)}</td>
              <td className="border border-gray-300 p-2 text-center">{p.estoque}</td>
              <td className="border border-gray-300 p-2 text-center">
                <input
                  type="number"
                  min={0}
                  max={p.estoque}
                  value={quantidades[p.id]}
                  onChange={e => handleQuantidadeChange(p.id, parseInt(e.target.value) || 0)}
                  className="w-16 text-center border rounded"
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <button
        disabled={!podeVender || loading}
        onClick={handleCadastrarVenda}
        className={`w-full py-2 rounded text-white ${
          podeVender && !loading ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-400 cursor-not-allowed'
        }`}
      >
        {loading ? 'Cadastrando...' : 'Cadastrar Venda'}
      </button>
    </div>
  )
}