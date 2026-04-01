import os
import requests
from dotenv import load_dotenv

load_dotenv()

URL_SUPABASE = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
CHAVE_SUPABASE = os.getenv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY")

cabecalhos = {
    "apikey": CHAVE_SUPABASE,
    "Authorization": f"Bearer {CHAVE_SUPABASE}",
    "Content-Type": "application/json",
    "Prefer": "return=representation" 
}

# 1. Cria um novo "Google Form" para uma turma
def criar_turma_no_banco(nome_treinamento, perguntas_lista):
    url = f"{URL_SUPABASE}/rest/v1/turmas"
    dados = {
        "nome_treinamento": nome_treinamento,
        "perguntas_json": perguntas_lista # O Supabase guarda a lista de perguntas nativamente
    }
    resposta = requests.post(url, headers=cabecalhos, json=dados)
    resposta.raise_for_status()
    return resposta.json()[0] # Retorna a turma criada (com o ID gerado)

# 2. Busca as perguntas de uma turma específica antes de mandar para a IA
def buscar_turma_por_id(turma_id):
    url = f"{URL_SUPABASE}/rest/v1/turmas?id=eq.{turma_id}&select=*"
    cabecalhos_get = {"apikey": CHAVE_SUPABASE, "Authorization": f"Bearer {CHAVE_SUPABASE}"}
    resposta = requests.get(url, headers=cabecalhos_get)
    resposta.raise_for_status()
    dados = resposta.json()
    return dados[0] if dados else None

# 3. Salva o JSON estruturado que a IA gerou
def salvar_avaliacao_dinamica(turma_id, texto, respostas_json, resumo):
    url = f"{URL_SUPABASE}/rest/v1/avaliacoes_dinamicas"
    dados = {
        "turma_id": turma_id,
        "texto_original": texto,
        "respostas_ia": respostas_json,
        "resumo_ia": resumo
    }
    resposta = requests.post(url, headers=cabecalhos, json=dados)
    resposta.raise_for_status()
    return resposta.json()[0]

# 4. Lista todas as turmas para o menu do React
def listar_turmas_do_banco():
    # Adicionamos 'ativo' no select
    url = f"{URL_SUPABASE}/rest/v1/turmas?select=id,nome_treinamento,perguntas_json,ativo&order=created_at.desc"
    cabecalhos_get = {"apikey": CHAVE_SUPABASE, "Authorization": f"Bearer {CHAVE_SUPABASE}"}
    resposta = requests.get(url, headers=cabecalhos_get)
    resposta.raise_for_status()
    return resposta.json()

# 5. Busca os dados para o Dashboard moderno
def buscar_dados_dashboard():
    # Agora pedimos o ID e as perguntas também, para o React conseguir montar os gráficos dinâmicos
    url = f"{URL_SUPABASE}/rest/v1/avaliacoes_dinamicas?select=*,turmas(id,nome_treinamento,perguntas_json)"
    cabecalhos_get = {"apikey": CHAVE_SUPABASE, "Authorization": f"Bearer {CHAVE_SUPABASE}"}
    resposta = requests.get(url, headers=cabecalhos_get)
    resposta.raise_for_status()
    return resposta.json()
    
# NOVA FUNÇÃO: Ativar/Inativar Formulário
def alternar_status_turma(turma_id, novo_status):
    url = f"{URL_SUPABASE}/rest/v1/turmas?id=eq.{turma_id}"
    dados = {"ativo": novo_status}
    resposta = requests.patch(url, headers=cabecalhos, json=dados)
    resposta.raise_for_status()
    return resposta.json()