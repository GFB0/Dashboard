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

  // --- DESIGN PREMIUM E MODERNO ---
  const Estilos = {
    fundo: { minHeight: '100vh', background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)', fontFamily: "'Inter', 'Segoe UI', sans-serif", padding: '40px 20px', display: 'flex', justifyContent: 'center' },
    container: { width: '100%', maxWidth: '720px' },
    cardCabecalho: { backgroundColor: '#ffffff', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 24px rgba(0,0,0,0.04)', marginBottom: '24px', border: '1px solid rgba(226, 232, 240, 0.8)', position: 'relative' },
    bordaTopo: { height: '8px', background: 'linear-gradient(90deg, #8b5cf6 0%, #3b82f6 100%)' },
    tituloCabecalho: { padding: '32px 32px 12px 32px', fontSize: '32px', color: '#0f172a', margin: 0, fontWeight: '800', letterSpacing: '-0.5px', lineHeight: '1.2' },
    descricao: { padding: '0 32px 32px 32px', color: '#64748b', fontSize: '16px', margin: 0, lineHeight: '1.6' },
    cardPergunta: { backgroundColor: '#ffffff', borderRadius: '16px', padding: '32px', boxShadow: '0 2px 12px rgba(0,0,0,0.02)', marginBottom: '20px', border: '1px solid rgba(226, 232, 240, 0.8)', transition: 'transform 0.2s ease, box-shadow 0.2s ease', position: 'relative', overflow: 'hidden' },
    tituloPergunta: { fontSize: '17px', color: '#1e293b', fontWeight: '600', marginBottom: '20px', lineHeight: '1.4' },
    inputTexto: { width: '100%', border: '2px solid #e2e8f0', borderRadius: '10px', padding: '14px 16px', fontSize: '15px', outline: 'none', transition: 'all 0.2s ease', backgroundColor: '#f8fafc', color: '#334155', boxSizing: 'border-box' },
    botaoSubmit: { width: '100%', background: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)', color: '#fff', border: 'none', padding: '16px 32px', borderRadius: '12px', fontSize: '16px', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s ease', boxShadow: '0 4px 12px rgba(139, 92, 246, 0.25)', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }
  };

  if (erro) return <div style={{ textAlign: 'center', padding: '50px', fontFamily: 'sans-serif', color: '#ef4444' }}><h2>{erro}</h2></div>;
  
  if (!turma) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
      <div style={{ width: '40px', height: '40px', border: '4px solid #e2e8f0', borderTopColor: '#8b5cf6', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
      <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
    </div>
  );

  if (turma.ativo === false) {
    return (
      <div style={Estilos.fundo}>
        <div style={Estilos.container}>
          <div style={{...Estilos.cardCabecalho, textAlign: 'center', padding: '48px 32px'}}>
             <div style={{ width: '64px', height: '64px', backgroundColor: '#fee2e2', color: '#ef4444', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', margin: '0 auto 24px' }}>🔒</div>
             <h1 style={{ color: '#0f172a', fontSize: '24px', fontWeight: '800', marginBottom: '16px' }}>Formulário Encerrado</h1>
             <p style={{ color: '#64748b', fontSize: '16px', lineHeight: '1.6', margin: 0 }}>
               O treinamento <strong>"{turma.nome_treinamento}"</strong> não está mais aceitando respostas no momento.
             </p>
          </div>
        </div>
      </div>
    );
  }
  
  if (sucesso) {
    return (
      <div style={Estilos.fundo}>
        <div style={Estilos.container}>
          <div style={{...Estilos.cardCabecalho, textAlign: 'center', padding: '64px 32px'}}>
            <div style={{ width: '80px', height: '80px', backgroundColor: '#dcfce7', color: '#10b981', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '40px', margin: '0 auto 24px', animation: 'scaleIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)' }}>✓</div>
            <h1 style={{ color: '#0f172a', fontSize: '28px', fontWeight: '800', marginBottom: '16px' }}>Tudo Certo!</h1>
            <p style={{ color: '#64748b', fontSize: '16px', lineHeight: '1.6', margin: 0 }}>
              Sua avaliação para <strong>{turma.nome_treinamento}</strong> foi enviada com sucesso.<br/>O motor de inteligência artificial já está analisando suas respostas.
            </p>
          </div>
        </div>
        <style>{`@keyframes scaleIn { 0% { transform: scale(0); } 100% { transform: scale(1); } }`}</style>
      </div>
    );
  }

  return (
    <div style={Estilos.fundo}>
      <style>{`
        .pergunta-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 25px rgba(0,0,0,0.05) !important;
        }
        .input-text:focus {
          border-color: #8b5cf6 !important;
          background-color: #ffffff !important;
          box-shadow: 0 0 0 4px rgba(139, 92, 246, 0.1);
        }
        .opcao-label {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          cursor: pointer;
          padding: 14px 16px;
          border-radius: 10px;
          border: 2px solid #f1f5f9;
          margin-bottom: 10px;
          background-color: #ffffff;
          transition: all 0.2s ease;
        }
        .opcao-label:hover {
          border-color: #cbd5e1;
          background-color: #f8fafc;
        }
        .opcao-label.selecionado {
          border-color: #8b5cf6;
          background-color: #f5f3ff;
        }
        .radio-custom {
          width: 20px;
          height: 20px;
          margin-top: 2px;
          cursor: pointer;
          accent-color: #8b5cf6;
        }
        .btn-enviar:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(139, 92, 246, 0.4) !important;
        }
        .btn-enviar:active {
          transform: translateY(0);
        }
      `}</style>

      {toast && (
        <div style={{ position: 'fixed', top: '24px', right: '24px', backgroundColor: toast.tipo === 'sucesso' ? '#10b981' : '#ef4444', color: '#fff', padding: '16px 24px', borderRadius: '12px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)', zIndex: 9999, display: 'flex', alignItems: 'center', gap: '12px', fontWeight: '600', animation: 'slideIn 0.3s ease-out' }}>
          <span style={{ fontSize: '20px' }}>{toast.tipo === 'sucesso' ? '✓' : '⚠'}</span>
          {toast.mensagem}
        </div>
      )}

      <div style={Estilos.container}>
        
        {/* CABEÇALHO DO FORMULÁRIO */}
        <div style={Estilos.cardCabecalho}>
          <div style={Estilos.bordaTopo}></div>
          <h1 style={Estilos.tituloCabecalho}>{turma.nome_treinamento}</h1>
          <p style={Estilos.descricao}>
            Por favor, preencha as informações abaixo com atenção. Seus feedbacks são processados por inteligência artificial para melhorar continuamente nossos treinamentos.
          </p>
        </div>

        <form onSubmit={enviarFormulario}>
          {turma.perguntas_json.map((p, pIndex) => (
            <div key={pIndex} style={Estilos.cardPergunta} className="pergunta-card">
              
              <div style={Estilos.tituloPergunta}>
                {p.texto} {p.obrigatoria && <span style={{ color: '#ef4444', marginLeft: '4px' }}>*</span>}
              </div>

              {p.tipo === 'texto' && (
                <input 
                  type="text" 
                  value={respostas[p.texto] || ''} 
                  onChange={(e) => lidarComMudanca(p.texto, e.target.value, 'texto')} 
                  placeholder="Digite sua resposta aqui..." 
                  style={Estilos.inputTexto} 
                  className="input-text"
                  required={p.obrigatoria} 
                />
              )}

              {p.tipo === 'unica_escolha' && p.opcoes.map((opcao, oIndex) => {
                const selecionado = respostas[p.texto] === opcao;
                return (
                  <label key={oIndex} className={`opcao-label ${selecionado ? 'selecionado' : ''}`}>
                    <input 
                      type="radio" 
                      name={`pergunta_${pIndex}`} 
                      value={opcao} 
                      checked={selecionado} 
                      onChange={(e) => lidarComMudanca(p.texto, e.target.value, 'unica_escolha')} 
                      className="radio-custom"
                      required={p.obrigatoria} 
                    />
                    <span style={{ fontSize: '15px', color: selecionado ? '#4c1d95' : '#334155', fontWeight: selecionado ? '600' : '400' }}>{opcao}</span>
                  </label>
                );
              })}

              {p.tipo === 'multipla_escolha' && p.opcoes.map((opcao, oIndex) => {
                const selecionado = (respostas[p.texto] || []).includes(opcao);
                return (
                  <label key={oIndex} className={`opcao-label ${selecionado ? 'selecionado' : ''}`}>
                    <input 
                      type="checkbox" 
                      value={opcao} 
                      checked={selecionado} 
                      onChange={(e) => lidarComMudanca(p.texto, e.target.value, 'multipla_escolha', e.target.checked)} 
                      className="radio-custom"
                    />
                    <span style={{ fontSize: '15px', color: selecionado ? '#4c1d95' : '#334155', fontWeight: selecionado ? '600' : '400' }}>{opcao}</span>
                  </label>
                );
              })}
            </div>
          ))}

          <div style={{ marginTop: '32px', marginBottom: '64px' }}>
            <button type="submit" disabled={enviando} style={{ ...Estilos.botaoSubmit, opacity: enviando ? 0.7 : 1 }} className="btn-enviar">
              {enviando ? (
                 <>
                   <div style={{ width: '20px', height: '20px', border: '3px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                   Processando Respostas...
                 </>
              ) : (
                 'Enviar Avaliação Segura'
              )}
            </button>
            <div style={{ textAlign: 'center', marginTop: '16px', color: '#94a3b8', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              Protegido por Inteligência Artificial
            </div>
          </div>
        </form>

      </div>
    </div>
  );
}

export default Formulario;