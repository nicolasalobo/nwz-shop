import { supabase } from './supabase'

export async function getSaldo(): Promise<number> {
  const { data, error } = await supabase
    .from('configuracoes')
    .select('valor')
    .eq('chave', 'saldo')
    .single()

  if (error || !data) return 0
  return parseFloat(data.valor)
}