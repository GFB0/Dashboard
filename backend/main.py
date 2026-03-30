import os
import json
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from google import genai
from dotenv import load_dotenv

# IMPORTANTE: Importando a função que acabamos de criar no database.py
from database import buscar_avaliacoes_do_banco, salvar_avaliacao_no_banco

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
cliente_gemini = genai.Client(api_key=GEMINI_API_KEY)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class AvaliacaoInput(BaseModel):
    texto_avaliacao: str

@app.get("/api/status")
def checar_status():
    return {"mensagem": "Conexão entre React e Python realizada com sucesso!"}

@app.post("/api/avaliar")
def avaliar_texto(dados: AvaliacaoInput):
    try:
        prompt = f"""
        Você é um sistema especialista em extrair dados estruturados de avaliações de treinamento.
        Analise o texto fornecido e extraia as informações estritamente no formato JSON abaixo.
        Não adicione nenhuma explicação, nem formatação Markdown (como ```json). Apenas o JSON puro.
        
        Regras de extração:
        - "resolutividade": Nota de 0 a 10 (se não for mencionado, coloque null)
        - "simplicidade": Booleano (true se a comunicação foi simples, false se foi complexa, null se não mencionado)
        - "resumo": Uma frase curta resumindo o comportamento avaliado.

        Texto da avaliação: "{dados.texto_avaliacao}"
        """
        
        # 1. Envia para o Gemini
        resposta = cliente_gemini.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt,
        )
        
        texto_limpo = resposta.text.strip().replace("```json", "").replace("```", "")
        resultado_json = json.loads(texto_limpo)
        
        # 2. Salva no Supabase chamando a nossa função do database.py
        dados_salvos = salvar_avaliacao_no_banco(
            texto=dados.texto_avaliacao,
            resolutividade=resultado_json.get("resolutividade"),
            simplicidade=resultado_json.get("simplicidade"),
            resumo=resultado_json.get("resumo")
        )
        
        # 3. Devolve sucesso para o React
        return {
            "sucesso": True, 
            "dados_extraidos_ia": resultado_json,
            "dados_salvos_banco": dados_salvos
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@app.get("/api/dashboard")
def obter_dados_dashboard():
    try:
        dados = buscar_avaliacoes_do_banco()
        return {"sucesso": True, "avaliacoes": dados}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))