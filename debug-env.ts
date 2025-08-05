// Debug script para verificar as variáveis de ambiente
console.log('=== DEBUG VARIÁVEIS DE AMBIENTE ===')
console.log('NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)
console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'CONFIGURADO' : 'NÃO CONFIGURADO')
console.log('NODE_ENV:', process.env.NODE_ENV)
console.log('===================================')

export {};
