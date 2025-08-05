# 🚀 Guia de Deploy - NWZ Shop

## ✅ Problemas Resolvidos

### 1. Favicon e Título da Página
- ✅ **Título alterado** de "Create Next App" para "NWZ SHOP"
- ✅ **Favicon personalizado** usando a foto da pessoa (`/images/background.png`)
- ✅ **Ícone da aba do navegador** configurado

### 2. Problema de Login - Diagnóstico e Soluções

#### 🔍 **Diagnóstico:**
O problema de "credenciais inválidas" geralmente está relacionado à configuração das variáveis de ambiente no deploy (Vercel).

#### 🛠️ **Soluções:**

##### **Opção 1: Configurar via Script (Recomendado)**
```bash
# Execute o script já preparado:
./configure-vercel-env.sh
```

##### **Opção 2: Configurar Manualmente no Vercel**
1. Acesse o dashboard do Vercel
2. Vá para o projeto NWZ Shop
3. Acesse **Settings → Environment Variables**
4. Adicione as seguintes variáveis:

```
NEXT_PUBLIC_SUPABASE_URL=https://zypqvbmhwnmfysqbxhhl.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp5cHF2Ym1od25tZnlzcWJ4aGhsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQzMjI4MzIsImV4cCI6MjA2OTg5ODgzMn0.99Gtl_PHhGeGNHWsTyuMqNUen1jCn4UIHpI2y4hpoPw
```

##### **Opção 3: Via Vercel CLI**
```bash
# Instalar Vercel CLI se necessário
npm i -g vercel

# Configurar variáveis
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
```

#### 🔄 **Após Configurar as Variáveis:**
1. Faça um novo deploy:
   ```bash
   git add .
   git commit -m "fix: configuração de variáveis de ambiente"
   git push
   ```
2. Ou force um redeploy no dashboard do Vercel

#### 🧪 **Teste Local vs Produção:**
- **Local:** ✅ Funcionando (variáveis em `.env.local`)
- **Produção:** ❌ Precisa configurar no Vercel

## 📋 **Checklist Final:**
- [ ] Variáveis configuradas no Vercel
- [ ] Novo deploy realizado
- [ ] Teste de login em produção
- [ ] Verificar se o favicon aparece corretamente
- [ ] Confirmar título "NWZ SHOP" na aba

## 🆘 **Se o problema persistir:**
1. Verifique se as variáveis foram salvas no Vercel
2. Force um rebuild completo
3. Verifique os logs de deploy no Vercel
4. Teste a URL do Supabase diretamente

---
*Atualizado em: 5 de agosto de 2025*
