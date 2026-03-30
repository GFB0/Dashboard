import os
import requests
from dotenv import load_dotenv

# Carrega as variáveis do seu arquivo .env
load_dotenv()

URL_SUPABASE = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
CHAVE_SUPABASE = os.getenv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY")

if not URL_SUPABASE or not CHAVE_SUPABASE:
    raise ValueError("Credenciais do Supabase não encontradas no arquivo .env")

def salvar_avaliacao_no_banco(texto, resolutividade, simplicidade, resumo):
    """
    Salva os dados no Supabase fazendo uma chamada direta para a API REST deles,
    sem precisar da biblioteca pesada que causa erro no Windows.
    """
    # A URL exata da sua tabela
    url_tabela = f"{URL_SUPABASE}/rest/v1/avaliacoes"
    
    # Os crachás de autorização
    cabecalhos = {
        "apikey": CHAVE_SUPABASE,
        "Authorization": f"Bearer {CHAVE_SUPABASE}",
        "Content-Type": "application/json",
        "Prefer": "return=representation" # Pede pro Supabase devolver o dado que acabou de salvar
    }
    
    # O pacote de dados
    dados_para_salvar = {
        "texto_original": texto,
        "resolutividade": resolutividade,
        "simplicidade": simplicidade,
        "resumo": resumo
    }
    
    # O "garçom" do Python entregando os dados lá no Supabase
    resposta = requests.post(url_tabela, headers=cabecalhos, json=dados_para_salvar)
    
    # Se der erro (ex: tabela não existe), isso vai avisar a gente
    resposta.raise_for_status() 
    
    return resposta.json()

def buscar_avaliacoes_do_banco():
    """
    Busca todas as avaliações salvas na tabela do Supabase.
    """
    url_tabela = f"{URL_SUPABASE}/rest/v1/avaliacoes?select=*"
    
    cabecalhos = {
        "apikey": CHAVE_SUPABASE,
        "Authorization": f"Bearer {CHAVE_SUPABASE}",
        "Content-Type": "application/json"
    }
    
    resposta = requests.get(url_tabela, headers=cabecalhos)
    resposta.raise_for_status() 
    
    return resposta.json()