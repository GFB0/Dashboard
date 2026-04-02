import os
import json
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from google import genai
from dotenv import load_dotenv
from typing import List

# Importa as novas funções do banco
from database import alternar_status_turma, buscar_dados_dashboard, criar_turma_no_banco, buscar_turma_por_id, listar_turmas_do_banco, salvar_avaliacao_dinamica

load_dotenv()
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
cliente_gemini = genai.Client(api_key=GEMINI_API_KEY)

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:5173"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

# --- NOVOS MODELOS DE DADOS PARA SUPORTAR CHECKBOXES ---
class PerguntaInput(BaseModel):
    texto: str
    tipo: str # Pode ser: 'texto', 'unica_escolha', 'multipla_escolha'
    opcoes: List[str] = [] # Se for escolha, guarda as opções. Ex: ["Sim", "Não", "Talvez"]
    obrigatoria: bool = True # Se a pergunta é obrigatória ou não

# Modelos do que a API espera receber do React
class NovaTurmaInput(BaseModel):
    nome_treinamento: str
    perguntas: List[PerguntaInput] # Lista de perguntas. Ex: ["Nota de Empatia?", "O cliente ficou satisfeito?"]

class AvaliacaoDinamicaInput(BaseModel):
    turma_id: int
    texto_avaliacao: str

# ROTA 1: O Admin cria o Formulário (A Turma)
@app.post("/api/turmas")
def api_criar_turma(dados: NovaTurmaInput):
    try:
        # Convertendo os objetos Pydantic para dicionários antes de salvar no banco
        perguntas_dict = [p.dict() for p in dados.perguntas]
        turma = criar_turma_no_banco(dados.nome_treinamento, perguntas_dict)
        return {"sucesso": True, "turma": turma}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/turmas")
def api_listar_turmas():
    try:
        return {"sucesso": True, "turmas": listar_turmas_do_banco()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ROTA 3: Avalia o texto bruto via IA (Agora com suporte a Lotes/Múltiplas Avaliações)
@app.post("/api/avaliar")
def avaliar_texto_dinamico(dados: AvaliacaoDinamicaInput):
    try:
        turma = buscar_turma_por_id(dados.turma_id)
        if not turma:
            raise HTTPException(status_code=404, detail="Formulário não encontrado.")
            
        perguntas_admin = turma["perguntas_json"]
        
        # Constrói as regras baseadas no tipo de pergunta
        instrucoes_perguntas = ""
        for p in perguntas_admin:
            if p['tipo'] == 'unica_escolha':
                instrucoes_perguntas += f"- '{p['texto']}': Responda ESTRITAMENTE com UMA destas opções exatas: {p['opcoes']}. Se o texto não contiver a informação, ou se a resposta for ambígua, retorne null.\n"
            elif p['tipo'] == 'multipla_escolha':
                instrucoes_perguntas += f"- '{p['texto']}': Responda com uma LISTA contendo uma ou mais destas opções: {p['opcoes']}. Se não houver menção clara, retorne null.\n"
            else:
                instrucoes_perguntas += f"- '{p['texto']}': (Pergunta Aberta) Extraia os pontos principais e resuma em até 10 palavras. Se o texto não falar sobre isso, retorne null.\n"

        prompt = f"""
        Você é um agente de Inteligência de Treinamentos. Seu trabalho é extrair dados de avaliações de instrutores.
        
        ATENÇÃO - MODO EM LOTE: O texto recebido pode conter o relato de MÚLTIPLAS avaliações (ex: vários instrutores ou turmas diferentes relatados de uma vez). 
        Identifique CADA avaliação/pessoa distinta mencionada no texto e gere um relatório separado para cada uma.
        
        REGRAS DE EXTRAÇÃO PARA CADA AVALIAÇÃO IDENTIFICADA:
        {instrucoes_perguntas}
        
        MÉTRICA UNIVERSAL OBRIGATÓRIA:
        Para cada avaliação, classifique o sentimento geral ("Sucesso", "Atenção" ou "Crítico").
        
        Texto recebido do coordenador: "{dados.texto_avaliacao}"
        
        Devolva APENAS um JSON válido contendo uma LISTA (Array) de objetos. Mesmo se houver apenas uma avaliação, devolva dentro de uma lista. 
        A estrutura exata exigida é:
        [
            {{
                "alvo_identificado": "Nome do instrutor/turma desta avaliação específica (Ex: Nilza)",
                "sentimento_geral": "Sucesso/Atenção/Crítico",
                "respostas": {{
                    "Pergunta 1": "Resposta",
                    "Pergunta 2": "Resposta"
                }},
                "resumo_ia": "Um resumo executivo focado APENAS no que aconteceu com ESTA pessoa/turma."
            }},
            {{ ... (próxima avaliação, se houver) ... }}
        ]
        """
        
        resposta_ia = cliente_gemini.models.generate_content(model='gemini-2.5-flash', contents=prompt)
        texto_limpo = resposta_ia.text.strip().replace("```json", "").replace("```", "")
        resultados_json = json.loads(texto_limpo)
        
        # Garante que o resultado seja sempre uma lista para podermos iterar
        if not isinstance(resultados_json, list):
            resultados_json = [resultados_json]
            
        registros_salvos = []
        
        # Faz um loop para salvar cada avaliação encontrada de forma independente
        for resultado in resultados_json:
            alvo = resultado.get("alvo_identificado", "Desconhecido")
            resumo_base = resultado.get("resumo_ia", "")
            
            resumo_com_sentimento = f"[{resultado.get('sentimento_geral', 'Neutro')}] {resumo_base}"
            
            salvo_no_banco = salvar_avaliacao_dinamica(
                turma_id=dados.turma_id,
                texto=dados.texto_avaliacao, # Mantém o texto original completo como lastro (auditoria)
                respostas_json=resultado.get("respostas", {}),
                resumo=resumo_com_sentimento
            )
            registros_salvos.append(salvo_no_banco)
        
        return {"sucesso": True, "dados_salvos": registros_salvos}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
    # Novo modelo para receber os dados dos cliques do usuário
class AvaliacaoManualInput(BaseModel):
    turma_id: int
    respostas: dict # Ex: {"Qual a nota?": "5", "Tem aptidão?": ["Não"]}

class StatusTurmaInput(BaseModel):
    ativo: bool

# ROTA 4: O usuário preencheu o formulário na mão (Interface Pública)
@app.post("/api/avaliar_manual")
def avaliar_formulario_manual(dados: AvaliacaoManualInput):
    try:
        # Atualizamos o prompt para exigir o sentimento_geral igual ao Agente IA
        prompt = f"""
        Atue como um analista especialista em Inteligência de Treinamentos. 
        Leia as respostas estruturadas de um formulário de avaliação abaixo:
        {json.dumps(dados.respostas, ensure_ascii=False)}

        Sua tarefa é criar um resumo analítico de uma ou duas frases sobre o comportamento e resultado avaliado.
        MÉTRICA UNIVERSAL OBRIGATÓRIA:
        Classifique o sentimento/saúde geral destas respostas em UMA destas 3 categorias exatas: "Sucesso", "Atenção" ou "Crítico".
        
        Devolva APENAS um JSON válido nesta estrutura exata:
        {{
            "sentimento_geral": "Sua classificação (Sucesso/Atenção/Crítico)",
            "resumo_ia": "Seu resumo analítico aqui."
        }}
        """
        
        resposta_ia = cliente_gemini.models.generate_content(model='gemini-2.5-flash', contents=prompt)
        texto_limpo = resposta_ia.text.strip().replace("```json", "").replace("```", "")
        resultado_json = json.loads(texto_limpo)
        
        # Junta o sentimento geral ao resumo para o Dashboard conseguir ler
        resumo_com_sentimento = f"[{resultado_json.get('sentimento_geral', 'Neutro')}] {resultado_json.get('resumo_ia', '')}"
        
        salvo_no_banco = salvar_avaliacao_dinamica(
            turma_id=dados.turma_id,
            texto="[PREENCHIMENTO MANUAL VIA FORMULÁRIO]",
            respostas_json=dados.respostas,
            resumo=resumo_com_sentimento
        )
        
        return {"sucesso": True, "dados_salvos": salvo_no_banco}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ROTA 5: Rota pública para o link do formulário buscar as perguntas
@app.get("/api/turmas/{turma_id}")
def api_obter_turma(turma_id: int):
    try:
        turma = buscar_turma_por_id(turma_id)
        if not turma:
            raise HTTPException(status_code=404, detail="Formulário não encontrado")
        return {"sucesso": True, "turma": turma}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
# ROTA 6: Alimenta os gráficos do painel de administração
@app.get("/api/dashboard")
def api_dashboard():
    try:
        dados = buscar_dados_dashboard()
        return {"sucesso": True, "avaliacoes": dados}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
# ROTA 7: Ativar ou Inativar um Template
@app.patch("/api/turmas/{turma_id}/status")
def api_alterar_status(turma_id: int, dados: StatusTurmaInput):
    try:
        res = alternar_status_turma(turma_id, dados.ativo)
        return {"sucesso": True, "dados": res}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))