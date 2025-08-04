'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const router = useRouter()

  const handleLogin = async () => {
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha })
    if (error) {
      setErro(error.message)
    } else {
      router.push('/painel')
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <h1 className="text-2xl mb-4">Login</h1>
      <input
        className="border p-2 w-full max-w-sm mb-2"
        type="email"
        placeholder="E-mail"
        value={email}
        onChange={e => setEmail(e.target.value)}
      />
      <input
        className="border p-2 w-full max-w-sm mb-2"
        type="password"
        placeholder="Senha"
        value={senha}
        onChange={e => setSenha(e.target.value)}
      />
      {erro && <p className="text-red-600 text-sm">{erro}</p>}
      <button className="bg-blue-600 text-white px-4 py-2 rounded mt-2" onClick={handleLogin}>
        Entrar
      </button>
    </div>
  )
}