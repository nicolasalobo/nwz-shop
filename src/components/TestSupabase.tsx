'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function TestSupabase() {
  const [status, setStatus] = useState('testando...')
  const [details, setDetails] = useState('')

  useEffect(() => {
    async function test() {
      try {
        // Teste básico de conectividade
        const { error } = await supabase.auth.getUser()
        if (error) {
          setStatus(`❌ Erro: ${error.message}`)
        } else {
          setStatus('✅ Conexão OK')
        }

        setDetails(`
          URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL}
          Anon Key: ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Configurado' : 'Não configurado'}
        `)

      } catch {
        setStatus(`💥 Erro geral`)
      }
    }
    
    test()
  }, [])

  return (
    <div className="p-4 bg-gray-100 rounded">
      <h3>Status do Supabase</h3>
      <p>{status}</p>
      <pre className="text-xs">{details}</pre>
    </div>
  )
}
