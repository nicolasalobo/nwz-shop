// app/venda-personalizada/page.tsx

'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type ProdutoSabor = {
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

        setProdutosSabores((data as any[]) || [])
      } catch (e) {
        console.error('Erro inesperado ao carregar produtos:', e)
        setMensagem(`Erro inesperado ao carregar produtos: ${e instanceof Error ? e.message : 'Erro desconhecido'}`)
      }
    }
    fetchProdutosSabores()
  }, [])

  async function registrarVenda() {
    if (!idSelecionado || !preco || !descricao) {
      setMensagem('Preencha todos os campos.')
      return
    }

    const produtoSabor = produtosSabores.find(p => p.id === idSelecionado)
    if (!produtoSabor) {
      setMensagem('Produto não encontrado.')
      return
    }

    const precoPersonalizado = parseFloat(preco)
    
    if (isNaN(precoPersonalizado) || precoPersonalizado <= 0) {
      setMensagem('Digite um preço válido maior que zero.')
      return
    }
    
    try {
      // Preparar dados da venda
      const produtoVenda = {
        id: produtoSabor.id,
        nome: `${produtoSabor.produtos.nome} - ${produtoSabor.sabor}`,
        preco_original: produtoSabor.produtos.preco,
        preco_personalizado: precoPersonalizado,
        quantidade: 1,
        subtotal: precoPersonalizado
      }

      // Registrar venda na tabela vendas
      const { data: vendaData, error } = await supabase
        .from('vendas')
        .insert({
          usuario_email: 'usuario@sistema.com', // Você pode ajustar isso depois
          total: precoPersonalizado
        })
        .select()

      if (error || !vendaData || vendaData.length === 0) {
        console.error('Erro ao registrar venda:', error)
        setMensagem(`Erro ao registrar venda: ${error?.message}`)
        return
      }

      const vendaId = vendaData[0].id

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
    <main className="p-4 text-white max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-4">Venda Personalizada</h1>

      {produtosSabores.length === 0 ? (
        <div className="bg-yellow-600 text-white p-4 rounded mb-4">
          <p className="font-semibold">Nenhum produto disponível</p>
          <p className="text-sm">Não há produtos com estoque para venda no momento.</p>
        </div>
      ) : (
        <>
          <label className="block mb-2">
            Produto:
            <select
              className="w-full p-2 bg-gray-800 rounded mt-1"
              value={idSelecionado ?? ''}
              onChange={(e) => setIdSelecionado(Number(e.target.value))}
            >
              <option value="">Selecione um produto</option>
              {produtosSabores.map((produtoSabor) => (
                <option key={produtoSabor.id} value={produtoSabor.id}>
                  {produtoSabor.produtos.nome} - {produtoSabor.sabor} (Estoque: {produtoSabor.quantidade})
                </option>
              ))}
            </select>
          </label>

          <label className="block mb-2">
            Preço personalizado:
            <input
              type="number"
              step="0.01"
              min="0"
              className="w-full p-2 bg-gray-800 rounded mt-1"
              value={preco}
              onChange={(e) => setPreco(e.target.value)}
              placeholder="Digite o preço personalizado"
            />
          </label>

          <label className="block mb-4">
            Descrição do motivo:
            <textarea
              className="w-full p-2 bg-gray-800 rounded mt-1"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Explique o motivo do preço personalizado"
              rows={3}
            />
          </label>

          <button
            className="bg-blue-600 px-4 py-2 rounded hover:bg-blue-700"
            onClick={registrarVenda}
          >
            Registrar Venda
          </button>
        </>
      )}

      {mensagem && (
        <div className={`mt-4 p-3 rounded ${
          mensagem.includes('sucesso') 
            ? 'bg-green-100 text-green-700 border border-green-300' 
            : 'bg-red-100 text-red-700 border border-red-300'
        }`}>
          {mensagem}
        </div>
      )}
    </main>
  )
}