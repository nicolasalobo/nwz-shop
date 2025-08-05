// Script para testar a conexão com o Supabase
import { supabase } from './src/lib/supabase'

async function testSupabaseConnection() {
  try {
    console.log('🔄 Testando conexão com Supabase...')
    
    // Teste básico de conectividade
    const { data, error } = await supabase.auth.getUser()
    
    if (error) {
      console.log('❌ Erro na conexão:', error.message)
    } else {
      console.log('✅ Conexão com Supabase OK')
      console.log('📊 Status da auth:', data)
    }

    // Teste de configuração
    console.log('🔧 Configurações:')
    console.log('URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)
    console.log('Anon Key:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Configurado' : 'Não configurado')

  } catch (err) {
    console.error('💥 Erro geral:', err)
  }
}

testSupabaseConnection()
