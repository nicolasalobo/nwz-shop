#!/bin/bash

# Script para configurar variáveis de ambiente no Vercel
# Execute este script após instalar o Vercel CLI: npm i -g vercel

echo "Configurando variáveis de ambiente no Vercel..."

vercel env add NEXT_PUBLIC_SUPABASE_URL production
# Quando solicitado, cole: https://zypqvbmhwnmfysqbxhhl.supabase.co

vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production  
# Quando solicitado, cole: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp5cHF2Ym1od25tZnlzcWJ4aGhsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQzMjI4MzIsImV4cCI6MjA2OTg5ODgzMn0.99Gtl_PHhGeGNHWsTyuMqNUen1jCn4UIHpI2y4hpoPw

echo "Variáveis configuradas! Faça um novo deploy."
