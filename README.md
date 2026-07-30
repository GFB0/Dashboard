# 🧠 Hub de Inteligência Estratégica (ETL com IA)

> Um sistema completo de **Extração, Transformação e Carga (ETL)** impulsionado por Inteligência Artificial para automatizar a leitura de documentos e transformar textos desestruturados em dashboards gerenciais dinâmicos.

---

## 🎯 O Que Este Projeto Resolve?

### ⚠️ O Problema
Profissionais de RH, Liderança e Saúde Ocupacional lidam diariamente com um alto volume de dados desestruturados (laudos em PDF/Word, transcrições, planilhas mistas). O trabalho de ler esses documentos, identificar métricas específicas (como necessidades ergonômicas) e tabular relatórios é lento, custoso e sujeito a falhas humanas.

### ✅ A Solução
Uma plataforma onde o usuário cria "Templates de Extração" personalizados e faz o upload de documentos brutos. Um agente de IA atua como um engenheiro de dados, garimpando as respostas exatas e salvando os dados perfeitamente estruturados no banco, alimentando gráficos visuais em tempo real.

---

## 🚀 Principais Funcionalidades

* **🤖 Motor de Extração (IA):** Lê textos informados manualmente ou arquivos físicos (`.docx`, `.pdf`, `.csv`, `.xlsx`) e converte parágrafos em dados categóricos.
* **📋 Construtor de Templates:** Interface para criar critérios personalizados de avaliação (Texto Curto, Múltipla Escolha, etc).
* **📦 Processamento em Lote (Batching):** Identifica múltiplas pessoas dentro de um mesmo texto ou planilha, separando as entidades de forma atômica.
* **📊 Dashboards Real-Time:** Visualização imediata de KPIs, gráficos de barras, gráficos de pizza (análise de sentimento) e tabelas de log estruturadas.
* **🧩 Arquitetura Multi-Módulo:** Separação estrita no banco de dados e interface entre jornadas diferentes (ex: Treinamentos vs Acessibilidade).
* **🔒 Segurança contra IDOR:** Uso de UUIDs (Slugs) em rotas públicas para garantir a proteção de dados sensíveis.

---

## 🛠️ Stack Tecnológico

### Frontend (A Vitrine)
- **Framework:** React.js (Vite)
- **Gráficos:** Recharts
- **Deploy:** Vercel

### Backend (O Cérebro)
- **Linguagem & API:** Python (FastAPI)
- **Inteligência Artificial:** Google GenAI (Gemini 1.5)
- **Engenharia de Dados:** PyPDF2, python-docx, Pandas
- **Deploy:** Render

### Banco de Dados (A Memória)
- **SGBD:** Supabase (PostgreSQL)
- **Segurança:** RLS (Row-Level Security) ativo

---

## ⚙️ Como a Arquitetura Funciona na Prática?

1. **Upload:** O usuário anexa um laudo (`.docx` ou `.pdf`) ou uma base mista (`.csv`) no painel.
2. **Leitura (Backend):** O FastAPI recebe a requisição, identifica a extensão e extrai a string bruta de forma programática.
3. **Processamento (LLM):** O texto é injetado em um prompt sistêmico, instruindo a IA a buscar critérios definidos pelo template. A IA devolve estritamente um *Array JSON*.
4. **Carga (Supabase):** O Python itera sobre o JSON validado, normaliza as respostas e insere os metadados relacionais no PostgreSQL.
5. **Visualização (Frontend):** O React detecta a requisição finalizada e renderiza imediatamente os novos insights nos gráficos do dashboard.
