import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';

function Formulario() {
  const { id } = useParams(); // Pega o ID da turma direto da URL
  const [turma, setTurma] = useState(null);
  const [respostas, setRespostas] = useState({});
  const [enviando, setEnviando] = useState(false);
  const [sucesso, setSucesso] = useState(false);
  const [erro, setErro] = useState(null);
  const [toast, setToast] = useState(null);

  const mostrarToast = (mensagem, tipo = 'sucesso') => {
    setToast({ mensagem, tipo });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    // Busca as perguntas deste formulário específico assim que a página carrega
    const buscarFormulario = async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/turmas/${id}`);
        const json = await res.json();
        if (json.sucesso) setTurma(json.turma);
        else setErro("Formulário não encontrado.");
      } catch (err) {
        setErro("Erro de conexão com o servidor.");
      }
    };
    buscarFormulario();
  }, [id]);

  const lidarComMudanca = (perguntaTexto, valor, tipo, checado) => {
    setRespostas(prev => {
      const atualizadas = { ...prev };
      if (tipo === 'multipla_escolha') {
        const listaAtual = atualizadas[perguntaTexto] || [];
        if (checado) atualizadas[perguntaTexto] = [...listaAtual, valor];
        else atualizadas[perguntaTexto] = listaAtual.filter(item => item !== valor);
      } else {
        atualizadas[perguntaTexto] = valor;
      }
      return atualizadas;
    });
  };

  const enviarFormulario = async (e) => {
    e.preventDefault();
    setEnviando(true);
    try {
      const res = await fetch(import.meta.env.VITE_API_URL + '/api/avaliar_manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ turma_id: turma.id, respostas: respostas }),
      });
      if (res.ok) setSucesso(true);
      else throw new Error("Falha ao salvar");
    } catch (err) {
      mostrarToast("Erro ao enviar avaliação.", "erro");
    } finally {
      setEnviando(false);
    }
  };

  // --- MATERIAL DESIGN ESTILOS ---
  const MDesign = {
    fundo: { minHeight: '100vh', backgroundColor: '#f0ebf8', fontFamily: "'Roboto', 'Helvetica', 'Arial', sans-serif", padding: '30px 15px', display: 'flex', justifyContent: 'center' },
    container: { width: '100%', maxWidth: '640px' },
    cardCabecalho: { backgroundColor: '#fff', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(60,64,67,0.3)', marginBottom: '15px' },
    bordaTopo: { height: '10px', backgroundColor: 'rgb(103, 58, 183)' },
    tituloCabecalho: { padding: '24px', fontSize: '32px', color: '#202124', margin: 0, fontWeight: '400' },
    cardPergunta: { backgroundColor: '#fff', borderRadius: '8px', padding: '24px', boxShadow: '0 1px 3px rgba(60,64,67,0.3)', marginBottom: '15px' },
    tituloPergunta: { fontSize: '16px', color: '#202124', fontWeight: '400', marginBottom: '16px', letterSpacing: '0.1px' },
    inputTexto: { width: '100%', border: 'none', borderBottom: '1px solid #d1d5db', padding: '8px 0', fontSize: '14px', outline: 'none', transition: 'border-color 0.2s', backgroundColor: 'transparent' },
    labelOpcao: { display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', marginBottom: '16px', color: '#202124', fontSize: '14px' },
    radioBox: { width: '20px', height: '20px', cursor: 'pointer', accentColor: 'rgb(103, 58, 183)' },
    botaoSubmit: { backgroundColor: 'rgb(103, 58, 183)', color: '#fff', border: 'none', padding: '10px 24px', borderRadius: '4px', fontSize: '14px', fontWeight: '500', cursor: 'pointer', letterSpacing: '0.5px', textTransform: 'uppercase', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }
  };

  if (erro) return <div style={{ textAlign: 'center', padding: '50px', fontFamily: 'sans-serif' }}><h2>{erro}</h2></div>;
  if (!turma) return <div style={{ textAlign: 'center', padding: '50px', fontFamily: 'sans-serif' }}>Carregando formulário...</div>;

  // NOVA TRAVA: Se o formulário foi desativado no painel, bloqueia a tela inteira.
  if (turma.ativo === false) {
    return (
      <div style={MDesign.fundo}>
        <div style={MDesign.container}>
          <div style={MDesign.cardCabecalho}>
            <div style={{ height: '10px', backgroundColor: '#5f6368' }}></div> {/* Borda cinza para indicar inativo */}
            <div style={{ padding: '32px 24px' }}>
              <h1 style={{ ...MDesign.tituloCabecalho, color: '#5f6368', padding: 0 }}>O formulário "{turma.nome_treinamento}" não aceita mais respostas</h1>
              <p style={{ color: '#202124', fontSize: '15px', marginTop: '16px', lineHeight: '1.5' }}>
                Este formulário foi desativado pelo administrador. Se você acha que isso é um erro, entre em contato com o responsável pelo treinamento.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  if (sucesso) {
    return (
      <div style={MDesign.fundo}>
        <div style={MDesign.container}>
          <div style={MDesign.cardCabecalho}>
            <div style={MDesign.bordaTopo}></div>
            <div style={{ padding: '24px' }}>
              <h1 style={MDesign.tituloCabecalho}>{turma.nome_treinamento}</h1>
              <p style={{ color: '#202124', fontSize: '14px', marginTop: '16px' }}>Sua resposta foi registrada. A IA já está processando os dados para o dashboard.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={MDesign.fundo}>
      {toast && (
        <div style={{ position: 'fixed', top: '24px', right: '24px', backgroundColor: toast.tipo === 'sucesso' ? '#10b981' : '#ef4444', color: '#fff', padding: '16px 24px', borderRadius: '8px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', zIndex: 9999, display: 'flex', alignItems: 'center', gap: '12px', fontWeight: '600', animation: 'slideIn 0.3s ease-out' }}>
          <span style={{ fontSize: '20px' }}>{toast.tipo === 'sucesso' ? '✓' : '⚠'}</span>
          {toast.mensagem}
          <style>{`@keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }`}</style>
        </div>
      )}
      <div style={MDesign.container}>
        
        {/* CABEÇALHO DO GOOGLE FORMS */}
        <div style={MDesign.cardCabecalho}>
          <div style={MDesign.bordaTopo}></div>
          <h1 style={MDesign.tituloCabecalho}>{turma.nome_treinamento}</h1>
          <p style={{ padding: '0 24px 24px', color: '#5f6368', fontSize: '14px', margin: 0, borderTop: '1px solid #dadce0', paddingTop: '12px' }}>
            Formulário oficial de avaliação. Preencha os campos abaixo.
          </p>
        </div>

        <form onSubmit={enviarFormulario}>
          {turma.perguntas_json.map((p, pIndex) => (
            <div key={pIndex} style={MDesign.cardPergunta}>
              
              {/* 1. O ASTERISCO AGORA É CONDICIONAL */}
              <div style={MDesign.tituloPergunta}>
                {p.texto} {p.obrigatoria && <span style={{ color: '#d93025' }}>*</span>}
              </div>

              {/* 2. O REQUIRED NO TEXTO AGORA É CONDICIONAL */}
              {p.tipo === 'texto' && (
                <input 
                  type="text" 
                  value={respostas[p.texto] || ''} 
                  onChange={(e) => lidarComMudanca(p.texto, e.target.value, 'texto')} 
                  placeholder="Sua resposta" 
                  style={MDesign.inputTexto} 
                  onFocus={(e) => e.target.style.borderBottom = '2px solid rgb(103, 58, 183)'}
                  onBlur={(e) => e.target.style.borderBottom = '1px solid #d1d5db'}
                  required={p.obrigatoria} 
                />
              )}

              {/* 3. O REQUIRED NO RADIO AGORA É CONDICIONAL */}
              {p.tipo === 'unica_escolha' && p.opcoes.map((opcao, oIndex) => (
                <label key={oIndex} style={MDesign.labelOpcao}>
                  <input 
                    type="radio" 
                    name={`pergunta_${pIndex}`} 
                    value={opcao} 
                    checked={respostas[p.texto] === opcao} 
                    onChange={(e) => lidarComMudanca(p.texto, e.target.value, 'unica_escolha')} 
                    style={MDesign.radioBox} 
                    required={p.obrigatoria} 
                  />
                  {opcao}
                </label>
              ))}

              {/* CHECKBOX: Em HTML padrão, colocar "required" em vários checkboxes exige que TODOS sejam marcados. Então para múltipla escolha deixamos livre. */}
              {p.tipo === 'multipla_escolha' && p.opcoes.map((opcao, oIndex) => (
                <label key={oIndex} style={MDesign.labelOpcao}>
                  <input 
                    type="checkbox" 
                    value={opcao} 
                    checked={(respostas[p.texto] || []).includes(opcao)} 
                    onChange={(e) => lidarComMudanca(p.texto, e.target.value, 'multipla_escolha', e.target.checked)} 
                    style={MDesign.radioBox} 
                  />
                  {opcao}
                </label>
              ))}
            </div>
          ))}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
            <button type="submit" disabled={enviando} style={{ ...MDesign.botaoSubmit, backgroundColor: enviando ? '#ccc' : 'rgb(103, 58, 183)' }}>
              {enviando ? 'Enviando...' : 'Enviar'}
            </button>
            <span style={{ color: '#5f6368', fontSize: '12px' }}>Protegido por Agente IA</span>
          </div>
        </form>

      </div>
    </div>
  );
}

export default Formulario;