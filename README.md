# 🛍️ NWZ Shop - Sistema de Gestão de Vendas

Um sistema moderno e elegante para gerenciamento completo de vendas e estoque, com design inspirado na página inicial criada anteriormente.

## ✨ Características do Design

### 🎨 Visual Moderno
- **Gradiente azul/roxo/índigo** como base visual
- **Efeitos de vidro** (backdrop blur) em todos os componentes
- **Partículas animadas** para criar dinamismo
- **Transições suaves** e animações de hover
- **Responsivo** para desktop, tablet e mobile

### 🧭 Navegação Intuitiva
- **Layout unificado** em todas as páginas internas
- **Menu de navegação** com ícones e indicação da página ativa
- **Breadcrumbs visuais** com títulos destacados
- **Menu mobile** expansível para dispositivos menores

### 🎯 Páginas Estilizadas

#### 🏠 Página Inicial
- Design elegante com call-to-actions
- Features em destaque com ícones
- Animações e efeitos visuais

#### 🔐 Login
- Formulário moderno com validações
- Ícones nos campos de entrada
- Feedback visual para erros
- Loading states animados

#### 📊 Painel Principal
- Cards interativos para cada funcionalidade
- Display prominente do saldo atual
- Estatísticas rápidas com ícones
- Grid responsivo para os cards

#### 📦 Gestão de Estoque
- Tabela moderna com alternância de cores
- Formulário de adição estilizado
- Badges coloridos para status do estoque
- Edição inline com transições

#### 🛒 Vendas (Comum e Personalizada)
- Interface intuitiva para seleção de produtos
- Preview da venda em tempo real
- Resumo detalhado com cálculos
- Botões de ação destacados

#### 📈 Histórico de Vendas
- Cards elegantes para cada venda
- Estatísticas com ícones e cores temáticas
- Layout de grid responsivo
- Informações organizadas hierarquicamente

## 🛠️ Componentes Reutilizáveis

### Layout.tsx
- Layout base para páginas internas
- Navegação unificada
- Menu responsivo
- Logout integrado

### LoadingSpinner.tsx
- Spinner animado reutilizável
- Diferentes tamanhos (sm, md, lg)
- Texto customizável

## 🎨 Sistema de Cores

```css
/* Cores principais */
- Azul: from-blue-500 to-blue-600
- Roxo: from-purple-500 to-purple-600  
- Verde: from-green-500 to-emerald-600
- Vermelho: from-red-500 to-red-600
- Laranja: from-orange-500 to-orange-600
- Cinza: from-gray-500 to-gray-600

/* Estados */
- Sucesso: green-500/20 com border-green-400
- Erro: red-500/20 com border-red-400
- Aviso: yellow-500/20 com border-yellow-400
- Info: blue-500/20 com border-blue-400
```

## 🚀 Funcionalidades

- ✅ **Autenticação** com Supabase
- ✅ **Gestão de Estoque** completa
- ✅ **Vendas Comuns** com seleção múltipla
- ✅ **Vendas Personalizadas** com preços customizados
- ✅ **Histórico Completo** de todas as transações
- ✅ **Controle de Saldo** em tempo real
- ✅ **Geração de Catálogo** para compartilhamento
- ✅ **Interface Responsiva** para todos os dispositivos

## 🔧 Tecnologias

- **Next.js 14** - Framework React
- **TypeScript** - Tipagem estática
- **Tailwind CSS** - Estilização utilitária
- **Supabase** - Backend como serviço
- **Vercel** - Deploy e hospedagem

## 📱 Responsividade

O sistema é totalmente responsivo e funciona perfeitamente em:
- 📱 **Mobile** (320px+)
- 📱 **Tablet** (768px+)
- 💻 **Desktop** (1024px+)
- 🖥️ **Large Desktop** (1440px+)

## 🎯 UX/UI Highlights

- **Feedback Visual** imediato para todas as ações
- **Estados de Loading** em todas as operações
- **Validações em Tempo Real** nos formulários
- **Animações Significativas** que guiam o usuário
- **Hierarquia Visual Clara** com tipografia e espaçamento
- **Acessibilidade** com contraste adequado e navegação por teclado

---

*Design criado seguindo os padrões da página inicial, mantendo consistência visual e uma experiência de usuário moderna e profissional.*
