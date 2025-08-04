'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSaldo } from '@/lib/getSaldo'

export default function PainelPrincipal() {
  const router = useRouter()
  const [saldo, setSaldo] = useState(0)

  useEffect(() => {
    async function carregarSaldo() {
      const valor = await getSaldo()
      setSaldo(valor)
    }
    carregarSaldo()
  }, [])

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
          Consultar Estoque
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