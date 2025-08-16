'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { getSaldo } from '@/lib/getSaldo'
import Layout from '@/components/Layout'

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
  const [produtosSabores, setProdutosSabores] = useState<ProdutoSabor[]>([])
  const [loading, setLoading] = useState(true)
  const [carregando, setCarregando] = useState(false)
  const [editando, setEditando] = useState<number | null>(null)
  const [itemEditando, setItemEditando] = useState<ProdutoSabor | null>(null)
  const [novoNome, setNovoNome] = useState('')
  const [novoPreco, setNovoPreco] = useState('')
  const [novoCusto, setNovoCusto] = useState('')
  const [novoSabor, setNovoSabor] = useState('')
  const [novaQuantidade, setNovaQuantidade] = useState('')
  const [msg, setMsg] = useState('')
  const [saldoAtual, setSaldoAtual] = useState(0)

  const precoNum = parseFloat(novoPreco) || 0
  const custoNum = parseFloat(novoCusto) || 0
  const quantidadeNum = parseInt(novaQuantidade) || 0
  // Preço sugerido = 1,5x custo, arredondado para cima ao próximo múltiplo de 5
  const precoSugerido = (() => {
    if (custoNum <= 0) return 0
    const base = custoNum * 1.5
    // Próximo múltiplo de 5 para cima
    return Math.ceil(base / 5) * 5
  })()

  useEffect(() => {
    carregarEstoque()
    carregarSaldo()
  }, [])

  const carregarSaldo = async () => {
    try {
      const saldo = await getSaldo()
      setSaldoAtual(saldo)
      } catch {
        console.error('Erro ao carregar saldo:')
      }
  }

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
    // Determina preço final: se não informado ou zero e existir preço sugerido positivo, aplica sugestão
    let precoFinal = precoNum
    const usouPrecoSugerido = precoFinal <= 0 && precoSugerido > 0
    if (usouPrecoSugerido) {
      precoFinal = precoSugerido
    }

    if (!novoNome.trim() || !novoSabor.trim() || precoFinal <= 0 || custoNum < 0 || quantidadeNum < 0) {
      alert('Por favor, preencha todos os campos corretamente')
      return
    }

    // Verificar se o saldo ficará negativo e pedir confirmação
    const custoTotal = custoNum * quantidadeNum
    const saldoAposCompra = saldoAtual - custoTotal
    
    if (saldoAposCompra < 0) {
      const confirmar = confirm(
        `Esta compra deixará seu saldo negativo (R$ ${saldoAposCompra.toFixed(2).replace('.', ',')}).\n\nDeseja continuar mesmo assim?`
      )
      if (!confirmar) return
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
            preco: precoFinal
          }])
          .select('id')
          .single()

        if (errorProduto) throw errorProduto
        produtoId = novoProduto.id
      }

      // Verificar se o sabor já existe para este produto
      const { data: saborExistente } = await supabase
        .from('produto_sabores')
        .select('id, quantidade')
        .eq('produto_id', produtoId)
        .eq('sabor', novoSabor.trim())
        .single()

      let adicionadoAExistente = false
      if (saborExistente) {
        // Se sabor já existe, somar a quantidade existente
        adicionadoAExistente = true
        const novaQuantidadeTotal = saborExistente.quantidade + quantidadeNum
        const { error: errorSabor } = await supabase
          .from('produto_sabores')
          .update({ quantidade: novaQuantidadeTotal })
          .eq('id', saborExistente.id)

        if (errorSabor) throw errorSabor
      } else {
        // Adicionar novo sabor
        const { error: errorSabor } = await supabase
          .from('produto_sabores')
          .insert([{
            produto_id: produtoId,
            sabor: novoSabor.trim(),
            quantidade: quantidadeNum
          }])

        if (errorSabor) throw errorSabor
      }

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

      // Deduzir o custo do saldo
      const custoTotal = custoNum * quantidadeNum
      if (custoTotal > 0) {
        // Consultar saldo atual
        const { data: saldoAtual, error: consultaSaldoError } = await supabase
          .from('configuracoes')
          .select('valor')
          .eq('chave', 'saldo')
          .single()

        if (consultaSaldoError) {
          console.error('Erro ao consultar saldo:', consultaSaldoError)
          alert(`Erro ao consultar saldo: ${consultaSaldoError.message}`)
          return
        }

        const novoSaldo = parseFloat(saldoAtual.valor || '0') - custoTotal
        const { error: saldoError } = await supabase
          .from('configuracoes')
          .update({ valor: novoSaldo.toString() })
          .eq('chave', 'saldo')

        if (saldoError) {
          console.error('Erro ao atualizar saldo:', saldoError)
          alert(`Erro ao atualizar saldo: ${saldoError.message}`)
          return
        }
      }

      await carregarEstoque()
      await carregarSaldo() // Atualizar saldo após adicionar produto
      
      // Mensagem de sucesso
      const avisoPreco = usouPrecoSugerido ? '\n(Preço sugerido aplicado automaticamente)' : ''
      const avisoExistente = adicionadoAExistente ? '\n(Quantidade adicionada ao produto existente)' : ''
      if (custoTotal > 0) {
        alert(`Produto adicionado com sucesso!${avisoPreco}${avisoExistente}\nCusto deduzido: R$ ${custoTotal.toFixed(2).replace('.', ',')}\nNovo saldo: R$ ${(saldoAtual - custoTotal).toFixed(2).replace('.', ',')}`)
      } else {
        alert(`Produto adicionado com sucesso!${avisoPreco}${avisoExistente}`)
      }
      
      setNovoNome('')
      setNovoSabor('')
      setNovoPreco('')
      setNovoCusto('')
      setNovaQuantidade('')
    } catch (error) {
      console.error('Erro ao adicionar produto:', error)
      alert('Erro ao adicionar produto')
    } finally {
      setCarregando(false)
    }
  }

  const editarProduto = async (sabor: string, quantidade: number, custo: number = 0) => {
    if (!itemEditando) return

    setCarregando(true)
    try {
      // Calcular diferença de quantidade para deduzir custo do saldo
      const diferenca = quantidade - itemEditando.quantidade
      const custoTotal = custo * diferenca

      // Se há diferença positiva (aumento) e custo > 0, verificar saldo
      if (diferenca > 0 && custo > 0) {
        const saldoAposCompra = saldoAtual - custoTotal
        
        if (saldoAposCompra < 0) {
          const confirmar = confirm(
            `Este aumento deixará seu saldo negativo (R$ ${saldoAposCompra.toFixed(2).replace('.', ',')}).\n\nDeseja continuar mesmo assim?`
          )
          if (!confirmar) {
            setCarregando(false)
            return
          }
        }
      }

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

      // Deduzir custo do saldo se houve aumento de quantidade
      if (diferenca > 0 && custoTotal > 0) {
        const { data: saldoData, error: consultaSaldoError } = await supabase
          .from('configuracoes')
          .select('valor')
          .eq('chave', 'saldo')
          .single()

        if (consultaSaldoError) {
          console.error('Erro ao consultar saldo:', consultaSaldoError)
          alert(`Erro ao consultar saldo: ${consultaSaldoError.message}`)
          return
        }

        const novoSaldo = parseFloat(saldoData.valor || '0') - custoTotal
        const { error: saldoError } = await supabase
          .from('configuracoes')
          .update({ valor: novoSaldo.toString() })
          .eq('chave', 'saldo')

        if (saldoError) {
          console.error('Erro ao atualizar saldo:', saldoError)
          alert(`Erro ao atualizar saldo: ${saldoError.message}`)
          return
        }

        await carregarSaldo() // Atualizar saldo na interface
        alert(`Produto editado com sucesso!\nCusto deduzido: R$ ${custoTotal.toFixed(2).replace('.', ',')}`)
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
    <Layout title="Gerenciar Estoque">
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

        {/* Saldo Atual */}
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center mr-3">
                <span className="text-lg">💰</span>
              </div>
              <h3 className="text-lg font-semibold text-white">Saldo Disponível</h3>
            </div>
            <div className={`text-2xl font-bold ${
              saldoAtual >= 0 ? 'text-green-400' : 'text-red-400'
            }`}>
              R$ {saldoAtual.toFixed(2).replace('.', ',')}
            </div>
          </div>
        </div>

        {/* Adicionar novo produto */}
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center">
            <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg flex items-center justify-center mr-3">
              <span className="text-lg">+</span>
            </div>
            Adicionar Novo Produto/Sabor
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Nome do Produto</label>
              <input
                type="text"
                placeholder="Ex: Brigadeiro Gourmet"
                value={novoNome}
                onChange={(e) => setNovoNome(e.target.value)}
                className="w-full bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Preço de Venda</label>
              <input
                type="number"
                step="0.01"
                placeholder={`Sugerido: ${precoSugerido.toFixed(2).replace('.', ',')}`}
                value={novoPreco}
                onChange={(e) => setNovoPreco(e.target.value)}
                className="w-full bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Preço de Custo</label>
              <input
                type="number"
                step="0.01"
                placeholder="0,00"
                value={novoCusto}
                onChange={(e) => setNovoCusto(e.target.value)}
                className="w-full bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Sabor</label>
              <input
                type="text"
                placeholder="Ex: Chocolate"
                value={novoSabor}
                onChange={(e) => setNovoSabor(e.target.value)}
                className="w-full bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Quantidade</label>
              <input
                type="number"
                placeholder="0"
                value={novaQuantidade}
                onChange={(e) => setNovaQuantidade(e.target.value)}
                className="w-full bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={adicionarProduto}
                disabled={carregando}
                className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 disabled:from-gray-600 disabled:to-gray-700 text-white font-semibold px-4 py-2 rounded-lg transition-all duration-300 transform hover:scale-105 disabled:scale-100 disabled:cursor-not-allowed"
              >
                {carregando ? 'Adicionando...' : 'Adicionar'}
              </button>
            </div>
          </div>
          
          {/* Preview do custo total */}
          {custoNum > 0 && quantidadeNum > 0 && (
            <div className="mt-4 p-4 bg-red-500/10 border border-red-400/30 rounded-lg">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Saldo atual:</span>
                  <span className="text-white font-semibold">
                    R$ {saldoAtual.toFixed(2).replace('.', ',')}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-red-300">Custo total a ser deduzido:</span>
                  <span className="text-red-400 font-semibold">
                    - R$ {(custoNum * quantidadeNum).toFixed(2).replace('.', ',')}
                  </span>
                </div>
                <div className="flex justify-between items-center border-t border-red-400/30 pt-2">
                  <span className="text-gray-300">Saldo após compra:</span>
                  <span className={`font-semibold ${
                    (saldoAtual - (custoNum * quantidadeNum)) >= 0 
                      ? 'text-green-400' 
                      : 'text-red-400'
                  }`}>
                    R$ {(saldoAtual - (custoNum * quantidadeNum)).toFixed(2).replace('.', ',')}
                  </span>
                </div>
                {(saldoAtual - (custoNum * quantidadeNum)) < 0 && (
                  <div className="text-red-300 text-xs mt-2 flex items-center">
                    <span className="mr-1">⚠️</span>
                    Atenção: Esta compra resultará em saldo negativo!
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Lista de produtos */}
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-white/10">
            <h3 className="text-lg font-semibold text-white">Produtos em Estoque</h3>
          </div>
          
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-flex items-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span className="text-gray-300">Carregando estoque...</span>
              </div>
            </div>
          ) : produtosSabores.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-4">📦</div>
              <span className="text-gray-300">Nenhum produto encontrado no estoque.</span>
              <p className="text-gray-400 text-sm mt-2">Adicione o primeiro produto usando o formulário acima.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-white/5">
                  <tr>
                    <th className="text-left p-4 text-gray-300 font-medium">Produto</th>
                    <th className="text-left p-4 text-gray-300 font-medium">Sabor</th>
                    <th className="text-right p-4 text-gray-300 font-medium">Preço</th>
                    <th className="text-center p-4 text-gray-300 font-medium">Quantidade</th>
                    <th className="text-center p-4 text-gray-300 font-medium">Custo Unit.</th>
                    <th className="text-center p-4 text-gray-300 font-medium">Ações</th>
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
                      onSave={(sabor, quantidade, custo) => {
                        editarProduto(sabor, quantidade, custo)
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
    </Layout>
  )
}

interface EstoqueItemProps {
  item: ProdutoSabor
  editando: boolean
  onEdit: () => void
  onSave: (sabor: string, quantidade: number, custo: number) => void
  onCancel: () => void
  onRemove: () => void
}

function EstoqueItem({ item, editando, onEdit, onSave, onCancel, onRemove }: EstoqueItemProps) {
  const [nome, setNome] = useState(item.produtos.nome)
  const [preco, setPreco] = useState(item.produtos.preco.toString())
  const [sabor, setSabor] = useState(item.sabor)
  const [quantidade, setQuantidade] = useState(item.quantidade.toString())
  const [custo, setCusto] = useState('0')

  const handleSave = () => {
    const precoNum = parseFloat(preco)
    const quantidadeNum = parseInt(quantidade)
    const custoNum = parseFloat(custo)

    if (isNaN(precoNum) || precoNum <= 0) {
      alert('Digite um preço válido')
      return
    }

    if (isNaN(quantidadeNum) || quantidadeNum < 0) {
      alert('Digite uma quantidade válida')
      return
    }

    if (isNaN(custoNum) || custoNum < 0) {
      alert('Digite um custo válido (pode ser 0)')
      return
    }

    if (!sabor.trim()) {
      alert('Digite um sabor válido')
      return
    }

    onSave(sabor.trim(), quantidadeNum, custoNum)
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
          <input
            type="number"
            step="0.01"
            placeholder="Custo (opcional)"
            value={custo}
            onChange={(e) => setCusto(e.target.value)}
            className="bg-gray-800 border border-gray-600 rounded px-2 py-1 w-full text-center"
          />
          <small className="text-gray-400 text-xs block mt-1">
            {parseInt(quantidade) > item.quantidade && parseFloat(custo) > 0 ? 
              `Custo do aumento: R$ ${(parseFloat(custo) * (parseInt(quantidade) - item.quantidade)).toFixed(2).replace('.', ',')}` : 
              'Informar se aumentar'
            }
          </small>
        </td>
        <td className="p-4">
          <div className="flex gap-2 justify-center">
            <button
              onClick={handleSave}
              className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white px-3 py-1 rounded-lg text-sm font-medium transition-all duration-300"
            >
              Salvar
            </button>
            <button
              onClick={onCancel}
              className="bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white px-3 py-1 rounded-lg text-sm font-medium transition-all duration-300"
            >
              Cancelar
            </button>
          </div>
        </td>
      </tr>
    )
  }

  return (
    <tr className="border-b border-white/10 hover:bg-white/5 transition-colors">
      <td className="p-4 font-medium text-white">{item.produtos.nome}</td>
      <td className="p-4 text-gray-300">{item.sabor}</td>
      <td className="p-4 text-right text-green-400 font-medium">R$ {item.produtos.preco.toFixed(2).replace('.', ',')}</td>
      <td className="p-4 text-center">
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          item.quantidade > 10 
            ? 'bg-green-500/20 text-green-300' 
            : item.quantidade > 0 
            ? 'bg-yellow-500/20 text-yellow-300' 
            : 'bg-red-500/20 text-red-300'
        }`}>
          {item.quantidade}
        </span>
      </td>
      <td className="p-4 text-center text-gray-400 text-sm">
        -
      </td>
      <td className="p-4">
        <div className="flex gap-2 justify-center">
          <button
            onClick={onEdit}
            className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-3 py-1 rounded-lg text-sm font-medium transition-all duration-300 transform hover:scale-105"
          >
            ✏️ Editar
          </button>
          <button
            onClick={onRemove}
            className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white px-3 py-1 rounded-lg text-sm font-medium transition-all duration-300 transform hover:scale-105"
          >
            🗑️ Remover
          </button>
        </div>
      </td>
    </tr>
  )
}
