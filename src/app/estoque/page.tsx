'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

interface Produto {
  id: number
  nome: string
  preco: number
}

interface ProdutoSabor {
  id: number
  produto_id: number
  sabor: string
  quantidade: number
  produtos: Produto
}

export default function GerenciarEstoque() {
  const router = useRouter()
  const [produtosSabores, setProdutosSabores] = useState<ProdutoSabor[]>([])
  const [loading, setLoading] = useState(true)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [carregando, setCarregando] = useState(false)
  const [editando, setEditando] = useState<number | null>(null)
  const [itemEditando, setItemEditando] = useState<ProdutoSabor | null>(null)
  const [novoNome, setNovoNome] = useState('')
  const [novoPreco, setNovoPreco] = useState('')
  const [novoSabor, setNovoSabor] = useState('')
  const [novaQuantidade, setNovaQuantidade] = useState('')
  const [msg, setMsg] = useState('')

  const precoNum = parseFloat(novoPreco) || 0
  const quantidadeNum = parseInt(novaQuantidade) || 0

  useEffect(() => {
    carregarEstoque()
  }, [])

  const carregarEstoque = async () => {
    setLoading(true)
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

    if (error) {
      console.error('Erro ao carregar estoque:', error)
      setMsg(`Erro ao carregar estoque: ${error.message}`)
    } else {
      // Ordenar no frontend
      const dadosOrdenados = (data as unknown as ProdutoSabor[] || []).sort((a: ProdutoSabor, b: ProdutoSabor) => {
        const nomeComparacao = a.produtos.nome.localeCompare(b.produtos.nome)
        if (nomeComparacao !== 0) return nomeComparacao
        return a.sabor.localeCompare(b.sabor)
      })
      setProdutosSabores(dadosOrdenados)
    }
    setLoading(false)
  }

  const adicionarProduto = async () => {
    if (!novoNome.trim() || !novoSabor.trim() || precoNum <= 0 || quantidadeNum < 0) {
      alert('Por favor, preencha todos os campos corretamente')
      return
    }

    setCarregando(true)
    try {
      // Primeiro, verificar se o produto já existe
      const { data: produtoExistente } = await supabase
        .from('produtos')
        .select('id')
        .eq('nome', novoNome.trim())
        .single()

      let produtoId: number

      if (produtoExistente) {
        produtoId = produtoExistente.id
      } else {
        // Criar novo produto
        const { data: novoProduto, error: errorProduto } = await supabase
          .from('produtos')
          .insert([{
            nome: novoNome.trim(),
            preco: precoNum
          }])
          .select('id')
          .single()

        if (errorProduto) throw errorProduto
        produtoId = novoProduto.id
      }

      // Verificar se o sabor já existe para este produto
      const { data: saborExistente } = await supabase
        .from('produto_sabores')
        .select('id')
        .eq('produto_id', produtoId)
        .eq('sabor', novoSabor.trim())
        .single()

      if (saborExistente) {
        alert('Este sabor já existe para este produto!')
        return
      }

      // Adicionar o sabor
      const { error: errorSabor } = await supabase
        .from('produto_sabores')
        .insert([{
          produto_id: produtoId,
          sabor: novoSabor.trim(),
          quantidade: quantidadeNum
        }])

      if (errorSabor) throw errorSabor

      // Atualizar/criar na tabela estoque para compatibilidade com vendas
      const { data: todosSabores } = await supabase
        .from('produto_sabores')
        .select('quantidade')
        .eq('produto_id', produtoId)

      if (todosSabores) {
        const quantidadeTotal = todosSabores.reduce((total, item) => total + item.quantidade, 0)
        
        // Verificar se já existe entrada na tabela estoque
        const { data: estoqueExistente } = await supabase
          .from('estoque')
          .select('id')
          .eq('produto_id', produtoId)
          .single()

        if (estoqueExistente) {
          // Atualizar entrada existente
          const { error: errorEstoque } = await supabase
            .from('estoque')
            .update({ quantidade: quantidadeTotal })
            .eq('produto_id', produtoId)

          if (errorEstoque) {
            console.warn('Aviso: Não foi possível atualizar a tabela estoque antiga:', errorEstoque)
          }
        } else {
          // Criar nova entrada
          const { error: errorEstoque } = await supabase
            .from('estoque')
            .insert([{
              produto_id: produtoId,
              quantidade: quantidadeTotal
            }])

          if (errorEstoque) {
            console.warn('Aviso: Não foi possível criar entrada na tabela estoque antiga:', errorEstoque)
          }
        }
      }

      await carregarEstoque()
      setNovoNome('')
      setNovoSabor('')
      setNovoPreco('')
      setNovaQuantidade('')
    } catch (error) {
      console.error('Erro ao adicionar produto:', error)
      alert('Erro ao adicionar produto')
    } finally {
      setCarregando(false)
    }
  }

  const editarProduto = async (sabor: string, quantidade: number) => {
    if (!itemEditando) return

    setCarregando(true)
    try {
      // 1. Atualizar o sabor no produto_sabores
      const { error: errorSabor } = await supabase
        .from('produto_sabores')
        .update({
          sabor: sabor,
          quantidade: quantidade
        })
        .eq('id', itemEditando.id)

      if (errorSabor) throw errorSabor

      // 2. Recalcular e atualizar quantidade total na tabela estoque (para compatibilidade com vendas)
      const { data: todosSabores } = await supabase
        .from('produto_sabores')
        .select('quantidade')
        .eq('produto_id', itemEditando.produto_id)

      if (todosSabores) {
        // Calcular nova quantidade total considerando a atualização atual
        let quantidadeTotal = 0
        for (const item of todosSabores) {
          quantidadeTotal += item.quantidade
        }
        // Ajustar para a nova quantidade do item editado
        quantidadeTotal = quantidadeTotal - itemEditando.quantidade + quantidade

        // Atualizar tabela estoque para compatibilidade
        const { error: errorEstoque } = await supabase
          .from('estoque')
          .update({ quantidade: quantidadeTotal })
          .eq('produto_id', itemEditando.produto_id)

        if (errorEstoque) {
          console.warn('Aviso: Não foi possível atualizar a tabela estoque antiga:', errorEstoque)
        }
      }

      await carregarEstoque()
      setItemEditando(null)
    } catch (error) {
      console.error('Erro ao editar produto:', error)
      alert('Erro ao editar produto')
    } finally {
      setCarregando(false)
    }
  }

  const removerProduto = async (item: ProdutoSabor) => {
    if (!confirm(`Tem certeza que deseja remover ${item.produtos.nome} - ${item.sabor}?`)) {
      return
    }

    setCarregando(true)
    try {
      // 1. Remover da tabela produto_sabores (nova)
      const { error: errorSabores } = await supabase
        .from('produto_sabores')
        .delete()
        .eq('id', item.id)

      if (errorSabores) throw errorSabores

      // 2. Verificar se ainda existem outros sabores para este produto
      const { data: outrosSabores } = await supabase
        .from('produto_sabores')
        .select('id')
        .eq('produto_id', item.produto_id)

      // 3. Se não há outros sabores, remover também da tabela estoque (antiga)
      if (!outrosSabores || outrosSabores.length === 0) {
        const { error: errorEstoque } = await supabase
          .from('estoque')
          .delete()
          .eq('produto_id', item.produto_id)

        if (errorEstoque) {
          console.warn('Aviso: Não foi possível remover da tabela estoque antiga:', errorEstoque)
        }
      } else {
        // 4. Se há outros sabores, atualizar a quantidade total na tabela estoque
        const { data: todosSabores } = await supabase
          .from('produto_sabores')
          .select('quantidade')
          .eq('produto_id', item.produto_id)

        if (todosSabores) {
          const quantidadeTotal = todosSabores.reduce((total, sabor) => total + sabor.quantidade, 0)
          
          const { error: errorUpdateEstoque } = await supabase
            .from('estoque')
            .update({ quantidade: quantidadeTotal })
            .eq('produto_id', item.produto_id)

          if (errorUpdateEstoque) {
            console.warn('Aviso: Não foi possível atualizar a tabela estoque antiga:', errorUpdateEstoque)
          }
        }
      }

      await carregarEstoque()
    } catch (error) {
      console.error('Erro ao remover produto:', error)
      alert('Erro ao remover produto')
    } finally {
      setCarregando(false)
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const atualizarProdutoSabor = async (produtoSabor: ProdutoSabor, novoSabor: string, novaQuantidadeNum: number) => {
    try {
      // Atualizar produto se necessário
      const { error: produtoError } = await supabase
        .from('produtos')
        .update({ nome: produtoSabor.produtos.nome, preco: produtoSabor.produtos.preco })
        .eq('id', produtoSabor.produtos.id)

      if (produtoError) {
        setMsg(`Erro ao atualizar produto: ${produtoError.message}`)
        return
      }

      // Atualizar sabor e quantidade
      const { error: saborError } = await supabase
        .from('produto_sabores')
        .update({ sabor: novoSabor, quantidade: novaQuantidadeNum })
        .eq('id', produtoSabor.id)

      if (saborError) {
        setMsg(`Erro ao atualizar sabor: ${saborError.message}`)
        return
      }

      setMsg('Produto/sabor atualizado com sucesso!')
      setEditando(null)
      carregarEstoque()
    } catch (e) {
      setMsg(`Erro inesperado: ${e instanceof Error ? e.message : 'Erro desconhecido'}`)
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const removerProdutoSabor = async (produtoSaborId: number) => {
    if (!confirm('Tem certeza que deseja remover este sabor?')) return

    try {
      // Remover sabor
      const { error: saborError } = await supabase
        .from('produto_sabores')
        .delete()
        .eq('id', produtoSaborId)

      if (saborError) {
        setMsg(`Erro ao remover sabor: ${saborError.message}`)
        return
      }

      setMsg('Sabor removido com sucesso!')
      carregarEstoque()
    } catch (e) {
      setMsg(`Erro inesperado: ${e instanceof Error ? e.message : 'Erro desconhecido'}`)
    }
  }

  return (
    <div className="min-h-screen bg-black text-white p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Gerenciar Estoque</h1>
          <button
            onClick={() => router.push('/painel')}
            className="bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded"
          >
            Voltar ao Painel
          </button>
        </div>

        {/* Mensagem */}
        {msg && (
          <div className={`mb-4 p-3 rounded ${
            msg.includes('sucesso') 
              ? 'bg-green-100 text-green-700 border border-green-300' 
              : 'bg-red-100 text-red-700 border border-red-300'
          }`}>
            {msg}
          </div>
        )}

        {/* Adicionar novo produto */}
        <div className="bg-gray-900 p-4 rounded-lg mb-6">
          <h2 className="text-xl font-bold mb-4">Adicionar Novo Produto/Sabor</h2>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <input
              type="text"
              placeholder="Nome do produto"
              value={novoNome}
              onChange={(e) => setNovoNome(e.target.value)}
              className="bg-gray-800 border border-gray-600 rounded px-3 py-2"
            />
            <input
              type="number"
              step="0.01"
              placeholder="Preço"
              value={novoPreco}
              onChange={(e) => setNovoPreco(e.target.value)}
              className="bg-gray-800 border border-gray-600 rounded px-3 py-2"
            />
            <input
              type="text"
              placeholder="Sabor"
              value={novoSabor}
              onChange={(e) => setNovoSabor(e.target.value)}
              className="bg-gray-800 border border-gray-600 rounded px-3 py-2"
            />
            <input
              type="number"
              placeholder="Quantidade inicial"
              value={novaQuantidade}
              onChange={(e) => setNovaQuantidade(e.target.value)}
              className="bg-gray-800 border border-gray-600 rounded px-3 py-2"
            />
            <button
              onClick={adicionarProduto}
              className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded"
            >
              Adicionar
            </button>
          </div>
        </div>

        {/* Lista de produtos */}
        {loading ? (
          <div className="text-center py-8">
            <span className="text-gray-400">Carregando estoque...</span>
          </div>
        ) : produtosSabores.length === 0 ? (
          <div className="text-center py-8">
            <span className="text-gray-400">Nenhum produto encontrado no estoque.</span>
          </div>
        ) : (
          <div className="bg-gray-900 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-800">
                <tr>
                  <th className="text-left p-4">Produto</th>
                  <th className="text-left p-4">Sabor</th>
                  <th className="text-right p-4">Preço</th>
                  <th className="text-center p-4">Quantidade</th>
                  <th className="text-center p-4">Ações</th>
                </tr>
              </thead>
              <tbody>
                {produtosSabores.map((item) => (
                  <EstoqueItem
                    key={item.id}
                    item={item}
                    editando={editando === item.id}
                    onEdit={() => {
                      setEditando(item.id)
                      setItemEditando(item)
                    }}
                    onSave={(sabor, quantidade) => {
                      editarProduto(sabor, quantidade)
                    }}
                    onCancel={() => {
                      setEditando(null)
                      setItemEditando(null)
                    }}
                    onRemove={() => removerProduto(item)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

interface EstoqueItemProps {
  item: ProdutoSabor
  editando: boolean
  onEdit: () => void
  onSave: (sabor: string, quantidade: number) => void
  onCancel: () => void
  onRemove: () => void
}

function EstoqueItem({ item, editando, onEdit, onSave, onCancel, onRemove }: EstoqueItemProps) {
  const [nome, setNome] = useState(item.produtos.nome)
  const [preco, setPreco] = useState(item.produtos.preco.toString())
  const [sabor, setSabor] = useState(item.sabor)
  const [quantidade, setQuantidade] = useState(item.quantidade.toString())

  const handleSave = () => {
    const precoNum = parseFloat(preco)
    const quantidadeNum = parseInt(quantidade)

    if (isNaN(precoNum) || precoNum <= 0) {
      alert('Digite um preço válido')
      return
    }

    if (isNaN(quantidadeNum) || quantidadeNum < 0) {
      alert('Digite uma quantidade válida')
      return
    }

    if (!sabor.trim()) {
      alert('Digite um sabor válido')
      return
    }

    onSave(sabor.trim(), quantidadeNum)
  }

  if (editando) {
    return (
      <tr className="border-b border-gray-700">
        <td className="p-4">
          <input
            type="text"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            className="bg-gray-800 border border-gray-600 rounded px-2 py-1 w-full"
          />
        </td>
        <td className="p-4">
          <input
            type="text"
            value={sabor}
            onChange={(e) => setSabor(e.target.value)}
            className="bg-gray-800 border border-gray-600 rounded px-2 py-1 w-full"
          />
        </td>
        <td className="p-4">
          <input
            type="number"
            step="0.01"
            value={preco}
            onChange={(e) => setPreco(e.target.value)}
            className="bg-gray-800 border border-gray-600 rounded px-2 py-1 w-full text-right"
          />
        </td>
        <td className="p-4">
          <input
            type="number"
            value={quantidade}
            onChange={(e) => setQuantidade(e.target.value)}
            className="bg-gray-800 border border-gray-600 rounded px-2 py-1 w-full text-center"
          />
        </td>
        <td className="p-4">
          <div className="flex gap-2 justify-center">
            <button
              onClick={handleSave}
              className="bg-green-600 hover:bg-green-700 px-3 py-1 rounded text-sm"
            >
              Salvar
            </button>
            <button
              onClick={onCancel}
              className="bg-gray-600 hover:bg-gray-700 px-3 py-1 rounded text-sm"
            >
              Cancelar
            </button>
          </div>
        </td>
      </tr>
    )
  }

  return (
    <tr className="border-b border-gray-700 hover:bg-gray-800">
      <td className="p-4 font-medium">{item.produtos.nome}</td>
      <td className="p-4">{item.sabor}</td>
      <td className="p-4 text-right">R$ {item.produtos.preco.toFixed(2)}</td>
      <td className="p-4 text-center">{item.quantidade}</td>
      <td className="p-4">
        <div className="flex gap-2 justify-center">
          <button
            onClick={onEdit}
            className="bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded text-sm"
          >
            Editar
          </button>
          <button
            onClick={onRemove}
            className="bg-red-600 hover:bg-red-700 px-3 py-1 rounded text-sm"
          >
            Remover
          </button>
        </div>
      </td>
    </tr>
  )
}
