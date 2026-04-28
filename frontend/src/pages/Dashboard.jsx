import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

function Dashboard() {
  const [abaAtiva, setAbaAtiva] = useState('painel'); 
  const [filtroTurma, setFiltroTurma] = useState('global'); 
  const [menuAberto, setMenuAberto] = useState(false);
  const [larguraJanela, setLarguraJanela] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);
  
  const [dadosBrutos, setDadosBrutos] = useState([]);
  const [kpis, setKpis] = useState({ total: 0, horasPoupadas: 0, treinosAtivos: 0 });
  const [dadosGraficoTreinamentos, setDadosGraficoTreinamentos] = useState([]);
  const [dadosTermometro, setDadosTermometro] = useState([]);
  const [turmasDisponiveis, setTurmasDisponiveis] = useState([]);

  const [turmasParaSelect, setTurmasParaSelect] = useState([]);
  const [nomeTurma, setNomeTurma] = useState('');
  const [perguntas, setPerguntas] = useState([{ texto: '', tipo: 'texto', opcoes: [], obrigatoria: false }]);
  const [turmaSelecionada, setTurmaSelecionada] = useState('');
  const [textoAvaliacao, setTextoAvaliacao] = useState('');
  const [processando, setProcessando] = useState(false);
  const [arquivoUpload, setArquivoUpload] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [toast, setToast] = useState(null);

  const mostrarToast = (mensagem, tipo = 'sucesso') => {
    setToast({ mensagem, tipo });
    setTimeout(() => setToast(null), 4000);
  };
  const CORES = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#14b8a6', '#f43f5e'];
  const CORES_TERMOMETRO = { 'Sucesso': '#10b981', 'Atenção': '#f59e0b', 'Crítico': '#ef4444' };

  const carregarDados = async () => {
    try {
      const resTurmas = await fetch(import.meta.env.VITE_API_URL + '/api/turmas');
      const jsonTurmas = await resTurmas.json();
      if (jsonTurmas.sucesso) setTurmasParaSelect(jsonTurmas.turmas);

      if (abaAtiva === 'painel') {
        const resDash = await fetch(import.meta.env.VITE_API_URL + '/api/dashboard');
        const jsonDash = await resDash.json();
        
        if (jsonDash.sucesso) {
          const avaliacoes = jsonDash.avaliacoes;
          setDadosBrutos(avaliacoes);

          const turmasUnicas = [];
          const mapTurmas = new Map();
          const contagemTreinamentos = {};
          const contagemSentimentos = { 'Sucesso': 0, 'Atenção': 0, 'Crítico': 0 };

          avaliacoes.forEach(av => {
            if (av.turmas && !mapTurmas.has(av.turmas.id)) {
              mapTurmas.set(av.turmas.id, true);
              turmasUnicas.push(av.turmas);
            }
            const nome = av.turmas?.nome_treinamento || "Desconhecido";
            contagemTreinamentos[nome] = (contagemTreinamentos[nome] || 0) + 1;

            const match = av.resumo_ia?.match(/\[(.*?)\]/);
            const sentimento = match ? match[1] : 'Neutro';
            if (contagemSentimentos[sentimento] !== undefined) contagemSentimentos[sentimento]++;
          });
          setTurmasDisponiveis(turmasUnicas);

          const horasEconomizadas = ((avaliacoes.length * 5) / 60).toFixed(1);
          const qtdTreinosAtivos = jsonTurmas.turmas ? jsonTurmas.turmas.filter(t => t.ativo !== false).length : 0;

          setKpis({ total: avaliacoes.length, horasPoupadas: horasEconomizadas, treinosAtivos: qtdTreinosAtivos });
          
          setDadosTermometro([
            { name: 'Sucesso', value: contagemSentimentos['Sucesso'] },
            { name: 'Atenção', value: contagemSentimentos['Atenção'] },
            { name: 'Crítico', value: contagemSentimentos['Crítico'] }
          ].filter(i => i.value > 0)); 
          
          const formataGraficoBarras = Object.keys(contagemTreinamentos).map(nome => ({
            treinamento: nome.length > 20 ? nome.substring(0, 20) + '...' : nome,
            volume: contagemTreinamentos[nome]
          }));
          setDadosGraficoTreinamentos(formataGraficoBarras);
        }
      }
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
    carregarDados();
    const handleResize = () => {
      setLarguraJanela(window.innerWidth);
      if (window.innerWidth > 1024) setMenuAberto(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [abaAtiva]);

  const isMobile = larguraJanela <= 1024;

  const gerarGraficosEspecificos = () => {
    if (filtroTurma === 'global') return null;
    const turmaId = parseInt(filtroTurma);
    const dadosDestaTurma = dadosBrutos.filter(av => av.turmas?.id === turmaId);
    if (dadosDestaTurma.length === 0) return <p style={{color: '#64748b'}}>Sem dados ainda.</p>;

    const perguntasDoFormulario = dadosDestaTurma[0].turmas.perguntas_json || [];
    const perguntasFechadas = perguntasDoFormulario.filter(p => p.tipo !== 'texto');
    const perguntasAbertas = perguntasDoFormulario.filter(p => p.tipo === 'texto');

    return (
      <>
        <div style={Estilos.chartGrid(isMobile)}>
         {perguntasFechadas.map((pergunta, index) => {
            const contagem = {};
            dadosDestaTurma.forEach(av => {
              let resposta = av.respostas_ia[pergunta.texto];
              const normalizar = (texto) => {
                 if (typeof texto !== 'string') return texto;
                 const limpo = texto.trim().toLowerCase();
                 const encontrada = (pergunta.opcoes || []).find(op => op.trim().toLowerCase() === limpo);
                 return encontrada || texto.trim();
              };
              if (resposta === null || resposta === undefined || resposta === "") {
                 contagem["Não Informado"] = (contagem["Não Informado"] || 0) + 1;
              } else if (Array.isArray(resposta)) {
                 if (resposta.length === 0) {
                     contagem["Não Informado"] = (contagem["Não Informado"] || 0) + 1;
                 } else {
                     resposta.forEach(r => {
                         const certinho = normalizar(r);
                         contagem[certinho] = (contagem[certinho] || 0) + 1;
                     });
                 }
              } else {
                 const certinho = normalizar(resposta);
                 contagem[certinho] = (contagem[certinho] || 0) + 1;
              }
            });

            const dadosGrafico = Object.keys(contagem).map(chave => ({ nome: String(chave).substring(0, 25), valor: contagem[chave] }));
            if (dadosGrafico.length === 0) return null;
            const usarPizza = dadosGrafico.length <= 4;

            return (
              <div key={`grafico-${index}`} style={Estilos.card}>
                <h3 style={{ marginTop: 0, fontSize: '15px', color: '#0f172a', marginBottom: '24px', lineHeight: '1.4' }}>{pergunta.texto}</h3>
                <ResponsiveContainer width="100%" height={260}>
                  {usarPizza ? (
                    <PieChart>
                      <Pie data={dadosGrafico} nameKey="nome" dataKey="valor" cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={2}>
                        {dadosGrafico.map((_, i) => <Cell key={`cell-${i}`} fill={CORES[i % CORES.length]} stroke="none" /> )}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
                      <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '13px', color: '#334155' }} iconType="circle" />
                    </PieChart>
                  ) : (
                    <BarChart data={dadosGrafico} margin={{ left: -20, right: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="nome" axisLine={false} tickLine={false} tick={{fontSize: 11, fill: '#64748b'}} />
                      <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#64748b'}} allowDecimals={false} />
                      <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
                      <Bar dataKey="valor" name="Avaliações" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={45} />
                    </BarChart>
                  )}
                </ResponsiveContainer>
              </div>
            );
          })}
        </div>

          {/* PERGUNTAS ABERTAS */}
        {perguntasAbertas.length > 0 && (
          <div style={{ marginTop: '48px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '2px solid #e2e8f0', paddingBottom: '16px', marginBottom: '32px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '12px', backgroundColor: '#f0fdfa', color: '#0d9488', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>💬</div>
              <h3 style={{ color: '#0f172a', fontSize: '20px', fontWeight: '800', margin: 0, letterSpacing: '-0.5px' }}>
                Voz do Participante (Feedbacks Qualitativos)
              </h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
              {perguntasAbertas.map((pergunta, index) => {
                const respostas = dadosDestaTurma
                  .filter(av => av.respostas_ia[pergunta.texto] && av.respostas_ia[pergunta.texto].trim() !== '')
                  .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                  .slice(0, 10);
                  
                if (respostas.length === 0) return null;

                return (
                  <div key={`aberta-${index}`}>
                    <h4 style={{ margin: '0 0 16px 0', fontSize: '15px', color: '#334155', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
                       <span style={{ display: 'inline-block', padding: '4px 8px', backgroundColor: '#f1f5f9', color: '#64748b', borderRadius: '6px', fontSize: '12px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Pergunta Aberta</span>
                       {pergunta.texto}
                    </h4>
                    
                    <div style={{ display: 'flex', overflowX: 'auto', gap: '20px', paddingBottom: '16px', scrollBehavior: 'smooth', scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch' }}>
                      {respostas.map((av, idx) => (
                        <div key={idx} style={{ flex: '0 0 auto', width: isMobile ? '85%' : '340px', scrollSnapAlign: 'start', backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '24px', boxShadow: '0 4px 12px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column', position: 'relative', transition: 'transform 0.2s ease, box-shadow 0.2s ease' }} onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 10px 25px -5px rgba(0,0,0,0.05)'; }} onMouseOut={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.02)'; }}>
                          <span style={{ position: 'absolute', top: '16px', right: '20px', fontSize: '60px', color: '#f8fafc', fontFamily: 'serif', lineHeight: 1, zIndex: 0 }}>"</span>
                          
                          <p style={{ margin: 0, color: '#334155', fontSize: '14px', lineHeight: '1.7', flex: 1, zIndex: 1, position: 'relative', fontWeight: '500' }}>
                            {av.respostas_ia[pergunta.texto]}
                          </p>
                          
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #f1f5f9', zIndex: 1, position: 'relative' }}>
                             <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>👤</div>
                             <div>
                               <div style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a' }}>Participante</div>
                               <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '500' }}>{new Date(av.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                             </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </>
    );
  };

  const alternarStatusTemplate = async (id, statusAtual) => {
    try {
      await fetch(`${import.meta.env.VITE_API_URL}/api/turmas/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ativo: !statusAtual })
      });
      carregarDados();
    } catch (err) { mostrarToast("Erro ao alterar status.", "erro"); }
  };

  const salvarTurma = async (e) => {
    e.preventDefault(); setProcessando(true);
    const validas = perguntas.filter(p => p.texto.trim() !== '');
    try {
      await fetch(import.meta.env.VITE_API_URL + '/api/turmas', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nome_treinamento: nomeTurma, perguntas: validas }) });
      mostrarToast("Template salvo com sucesso!"); setNomeTurma(''); setPerguntas([{ texto: '', tipo: 'texto', opcoes: [], obrigatoria: false }]); carregarDados();
    } catch (err) { mostrarToast("Erro ao salvar template.", "erro"); } finally { setProcessando(false); }
  };

  const enviarParaAgente = async (e) => {
    e.preventDefault(); 
    if (!arquivoUpload && !textoAvaliacao) {
       mostrarToast("Por favor, cole um texto ou envie um arquivo.", "erro");
       return;
    }
    setProcessando(true);
    if (arquivoUpload) setIsScanning(true);
    
    try {
      if (arquivoUpload) {
        const formData = new FormData();
        formData.append('turma_id', turmaSelecionada);
        formData.append('arquivo', arquivoUpload);
        await fetch(import.meta.env.VITE_API_URL + '/api/avaliar_arquivo', { 
            method: 'POST', 
            body: formData 
        });
      } else {
        await fetch(import.meta.env.VITE_API_URL + '/api/avaliar', { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify({ turma_id: parseInt(turmaSelecionada), texto_avaliacao: textoAvaliacao }) 
        });
      }
      mostrarToast("Avaliação processada com sucesso!"); setTextoAvaliacao(''); setArquivoUpload(null); carregarDados();
    } catch (err) { 
        mostrarToast("Erro ao processar avaliação.", "erro"); 
    } finally { 
        setProcessando(false); 
        setIsScanning(false);
    }
  };

  // --- ESTILOS MODERNOS ---
  // --- ESTILOS PREMIUM ---
  const Estilos = {
    layout: { display: 'flex', minHeight: '100vh', backgroundColor: '#f1f5f9', fontFamily: "'Inter', sans-serif", position: 'relative', overflow: 'hidden' },
    sidebar: (aberto, mobile) => ({ 
      width: '280px', 
      background: '#0f172a', 
      color: '#fff', 
      display: 'flex', 
      flexDirection: 'column',
      position: mobile ? 'fixed' : 'relative',
      left: mobile ? (aberto ? '0' : '-300px') : '0',
      top: mobile ? 0 : '16px',
      bottom: mobile ? 0 : '16px',
      margin: mobile ? 0 : '0 0 0 16px',
      height: mobile ? '100vh' : 'calc(100vh - 32px)',
      borderRadius: mobile ? '0' : '24px',
      zIndex: 1000,
      transition: 'left 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
      overflow: 'hidden'
    }),
    overlay: {
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.6)',
      backdropFilter: 'blur(4px)',
      zIndex: 999,
      display: 'block'
    },
    hamburger: {
      display: 'flex', flexDirection: 'column', justifyContent: 'space-around',
      width: '24px', height: '20px', background: 'transparent', border: 'none',
      cursor: 'pointer', padding: 0, zIndex: 1001, position: 'relative'
    },
    logo: { padding: '32px 24px', fontSize: '18px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '16px', letterSpacing: '-0.5px', lineHeight: '1.2' },
    menuItem: (ativo) => ({ 
      padding: '16px 20px', margin: '8px 20px', borderRadius: '16px', cursor: 'pointer', 
      backgroundColor: ativo ? '#3b82f6' : 'transparent', 
      color: ativo ? '#ffffff' : '#94a3b8', 
      fontSize: '14px', fontWeight: '600', transition: 'all 0.2s ease',
      boxShadow: ativo ? '0 4px 12px rgba(59, 130, 246, 0.3)' : 'none',
      display: 'flex', alignItems: 'center', gap: '14px'
    }),
    main: (mobile) => ({ flex: 1, padding: mobile ? '20px' : '32px 48px 48px 48px', overflowY: 'auto', height: '100vh', boxSizing: 'border-box' }),
    cardGrid: (mobile) => ({ display: 'grid', gridTemplateColumns: mobile ? '1fr' : 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', marginBottom: '40px' }),
    chartGrid: (mobile) => ({ display: 'grid', gridTemplateColumns: mobile ? '1fr' : 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px', marginBottom: '40px' }),
    card: { backgroundColor: '#ffffff', padding: '32px', borderRadius: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', border: '1px solid rgba(226,232,240,0.6)', transition: 'transform 0.2s ease, box-shadow 0.2s ease' },
    tabelaCelula: { padding: '20px 16px', color: '#334155', fontSize: '14px', borderBottom: '1px solid #f1f5f9' }
  };

  return (
    <div style={Estilos.layout}>
      {toast && (
        <div style={{ position: 'fixed', top: '24px', right: '24px', backgroundColor: toast.tipo === 'sucesso' ? '#10b981' : '#ef4444', color: '#fff', padding: '16px 24px', borderRadius: '8px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', zIndex: 9999, display: 'flex', alignItems: 'center', gap: '12px', fontWeight: '600', animation: 'slideIn 0.3s ease-out' }}>
          <span style={{ fontSize: '20px' }}>{toast.tipo === 'sucesso' ? '✓' : '⚠'}</span>
          {toast.mensagem}
          <style>{`@keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }`}</style>
        </div>
      )}
      
      {isMobile && menuAberto && <div style={Estilos.overlay} onClick={() => setMenuAberto(false)} />}

      <div style={Estilos.sidebar(menuAberto, isMobile)}>
        <div style={Estilos.logo}>
          <div style={{ width: '36px', height: '36px', background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '20px', fontWeight: '900', boxShadow: '0 4px 12px rgba(59, 130, 246, 0.4)' }}>T</div> 
          <div>
            <div style={{ color: '#f8fafc', fontWeight: '800' }}>Training</div>
            <div style={{ color: '#3b82f6', fontSize: '13px', fontWeight: '700' }}>Intelligence</div>
          </div>
        </div>
        
        <div style={{ flex: 1, marginTop: '24px', overflowY: 'auto' }}>
          <div style={Estilos.menuItem(abaAtiva === 'painel')} onClick={() => { setAbaAtiva('painel'); setMenuAberto(false); }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/></svg>
            Visão Global
          </div>
          <div style={Estilos.menuItem(abaAtiva === 'agente')} onClick={() => { setAbaAtiva('agente'); setMenuAberto(false); }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="4" width="16" height="16" rx="2" ry="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/><line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/><line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="14" x2="23" y2="14"/><line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="14" x2="4" y2="14"/></svg>
            Motor IA
          </div>
          <div style={Estilos.menuItem(abaAtiva === 'criar')} onClick={() => { setAbaAtiva('criar'); setMenuAberto(false); }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
            Templates
          </div>
        </div>

        <div style={{ padding: '24px', borderTop: '1px solid rgba(255,255,255,0.05)', backgroundColor: 'rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '15px' }}>AD</div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ color: '#f8fafc', fontSize: '14px', fontWeight: '700' }}>Administrador</span>
            <span style={{ color: '#64748b', fontSize: '12px', fontWeight: '500' }}>Admin Panel</span>
          </div>
        </div>
      </div>

      <div style={Estilos.main(isMobile)}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isMobile ? '24px' : '40px', borderBottom: '1px solid #e2e8f0', paddingBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '12px' : '24px' }}>
            {isMobile && !menuAberto && (
              <button style={Estilos.hamburger} onClick={() => setMenuAberto(true)}>
                <div style={{ width: '100%', height: '3px', background: '#0f172a', borderRadius: '2px' }}></div>
                <div style={{ width: '100%', height: '3px', background: '#0f172a', borderRadius: '2px' }}></div>
                <div style={{ width: '100%', height: '3px', background: '#0f172a', borderRadius: '2px' }}></div>
              </button>
            )}
            <h1 style={{ fontSize: isMobile ? '22px' : '28px', color: '#0f172a', margin: 0, fontWeight: '800', letterSpacing: '-1px' }}>
              {abaAtiva === 'painel' ? 'Visão Global' : abaAtiva === 'agente' ? 'Motor IA' : 'Construtor de Templates'}
            </h1>

            {abaAtiva === 'painel' && !isMobile && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', borderLeft: '2px solid #e2e8f0', paddingLeft: '24px' }}>
                <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Filtro de Turma</span>
                <select value={filtroTurma} onChange={(e) => setFiltroTurma(e.target.value)} style={{ padding: '10px 16px', borderRadius: '12px', border: '2px solid #e2e8f0', backgroundColor: '#f8fafc', color: '#0f172a', fontSize: '14px', fontWeight: '700', outline: 'none', cursor: 'pointer', transition: '0.2s', appearance: 'none' }} onFocus={e => e.target.style.borderColor='#3b82f6'} onBlur={e => e.target.style.borderColor='#e2e8f0'}>
                  <option value="global">Todas as Formações (Global)</option>
                  {turmasDisponiveis.map(t => <option key={t.id} value={t.id}>{t.nome_treinamento}</option>)}
                </select>
              </div>
            )}
          </div>

          {abaAtiva === 'painel' && isMobile && (
            <div style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '12px', backgroundColor: '#fff', padding: '12px 16px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
              <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '800', textTransform: 'uppercase' }}>Filtro:</span>
              <select value={filtroTurma} onChange={(e) => setFiltroTurma(e.target.value)} style={{ flex: 1, padding: '4px', border: 'none', backgroundColor: 'transparent', color: '#0f172a', fontSize: '14px', fontWeight: '700', outline: 'none' }}>
                <option value="global">Todos</option>
                {turmasDisponiveis.map(t => <option key={t.id} value={t.id}>{t.nome_treinamento}</option>)}
              </select>
            </div>
          )}
        </div>

        {/* --- TELA 1: DASHBOARD --- */}
        {abaAtiva === 'painel' && (
          <>
            {filtroTurma === 'global' ? (
              <>
                <div style={Estilos.cardGrid(isMobile)}>
                  <div style={{...Estilos.card, position: 'relative', overflow: 'hidden'}}>
                    <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '100px', height: '100px', background: 'radial-gradient(circle, rgba(59,130,246,0.1) 0%, rgba(255,255,255,0) 70%)', borderRadius: '50%' }}></div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                      <div style={{ width: '40px', height: '40px', borderRadius: '12px', backgroundColor: '#eff6ff', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                         <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                      </div>
                      <div style={{fontSize: '13px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px'}}>Avaliações Processadas</div>
                    </div>
                    <div style={{fontSize: '36px', fontWeight: '800', color: '#0f172a', letterSpacing: '-1px'}}>{kpis.total}</div>
                  </div>
                  <div style={{...Estilos.card, position: 'relative', overflow: 'hidden'}}>
                    <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '100px', height: '100px', background: 'radial-gradient(circle, rgba(245,158,11,0.1) 0%, rgba(255,255,255,0) 70%)', borderRadius: '50%' }}></div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                      <div style={{ width: '40px', height: '40px', borderRadius: '12px', backgroundColor: '#fffbeb', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                         <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
                      </div>
                      <div style={{fontSize: '13px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px'}}>Jornadas Ativas</div>
                    </div>
                    <div style={{fontSize: '36px', fontWeight: '800', color: '#0f172a', letterSpacing: '-1px'}}>{kpis.treinosAtivos}</div>
                  </div>
                  <div style={{...Estilos.card, background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: '#fff', position: 'relative', overflow: 'hidden', border: 'none', boxShadow: '0 10px 40px -10px rgba(16,185,129,0.5)'}}>
                    <div style={{ position: 'absolute', top: 0, right: 0, width: '150px', height: '150px', background: 'linear-gradient(135deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0) 100%)', borderRadius: '50%', transform: 'translate(30%, -30%)' }}></div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                      <div style={{ width: '40px', height: '40px', borderRadius: '12px', backgroundColor: 'rgba(255,255,255,0.2)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
                         <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                      </div>
                      <div style={{fontSize: '13px', color: 'rgba(255,255,255,0.9)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px'}}>ROI da IA</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                       <div style={{fontSize: '36px', fontWeight: '800', letterSpacing: '-1px'}}>{kpis.horasPoupadas}h</div>
                       <div style={{fontSize: '14px', color: 'rgba(255,255,255,0.8)', fontWeight: '500'}}>poupadas</div>
                    </div>
                  </div>
                </div>

                <div style={Estilos.chartGrid(isMobile)}>
                 <div style={Estilos.card}>
                    <h3 style={{ marginTop: 0, fontSize: '16px', color: '#0f172a', marginBottom: '8px' }}>Saúde Geral das Formações</h3>
                    <span style={{ fontSize: '13px', color: '#64748b' }}>Análise de sentimento baseada nos textos (IA)</span>
                    
                    {dadosTermometro.length > 0 ? (
                      <ResponsiveContainer width="100%" height={260}>
                        <PieChart>
                          <Pie data={dadosTermometro} nameKey="name" dataKey="value" cx="50%" cy="50%" innerRadius={70} outerRadius={90} paddingAngle={2}>
                            {dadosTermometro.map((entry, index) => <Cell key={`cell-${index}`} fill={CORES_TERMOMETRO[entry.name]} stroke="none" /> )}
                          </Pie>
                          <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
                          <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '13px', color: '#334155', fontWeight: '500' }} iconType="circle" />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div style={{ height: '260px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '14px', backgroundColor: '#f8fafc', borderRadius: '8px', marginTop: '16px', border: '1px dashed #cbd5e1' }}>
                        Nenhum sentimento detectado nas avaliações recentes.
                      </div>
                    )}
                  </div>

                  <div style={Estilos.card}>
                    <h3 style={{ marginTop: 0, fontSize: '16px', color: '#0f172a', marginBottom: '8px' }}>Aderência por Treinamento</h3>
                    <span style={{ fontSize: '13px', color: '#64748b' }}>Volume de avaliações recebidas</span>
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={dadosGraficoTreinamentos} margin={{ left: -20, right: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="treinamento" axisLine={false} tickLine={false} tick={{fontSize: 11, fill: '#64748b'}} />
                        <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#64748b'}} allowDecimals={false} />
                        <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
                        <Bar dataKey="volume" name="Avaliações" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={45} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </>
            ) : (
              gerarGraficosEspecificos()
            )}

            <div style={{...Estilos.card, padding: 0, overflow: 'hidden', marginTop: '40px', border: '1px solid rgba(226, 232, 240, 0.8)'}}>
              <div style={{ padding: isMobile ? '16px' : '24px 32px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#f8fafc', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? '12px' : '0' }}>
                <h3 style={{ margin: 0, fontSize: '18px', color: '#0f172a', fontWeight: '700' }}>Log Analítico de Avaliações</h3>
                <span style={{ fontSize: '12px', backgroundColor: '#e2e8f0', padding: '6px 12px', borderRadius: '20px', color: '#475569', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Últimas Entradas</span>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
                  <thead>
                    <tr>
                      <th style={{ backgroundColor: '#ffffff', color: '#64748b', fontSize: '12px', textTransform: 'uppercase', padding: isMobile ? '16px' : '20px 32px', textAlign: 'left', borderBottom: '2px solid #f1f5f9', fontWeight: '700', letterSpacing: '0.5px', width: '150px' }}>Data / Hora</th>
                      <th style={{ backgroundColor: '#ffffff', color: '#64748b', fontSize: '12px', textTransform: 'uppercase', padding: isMobile ? '16px' : '20px 16px', textAlign: 'left', borderBottom: '2px solid #f1f5f9', fontWeight: '700', letterSpacing: '0.5px' }}>Jornada</th>
                      <th style={{ backgroundColor: '#ffffff', color: '#64748b', fontSize: '12px', textTransform: 'uppercase', padding: isMobile ? '16px' : '20px 16px', textAlign: 'left', borderBottom: '2px solid #f1f5f9', fontWeight: '700', letterSpacing: '0.5px' }}>Insights Consolidados (IA)</th>
                      <th style={{ backgroundColor: '#ffffff', color: '#64748b', fontSize: '12px', textTransform: 'uppercase', padding: isMobile ? '16px' : '20px 32px', textAlign: 'center', borderBottom: '2px solid #f1f5f9', fontWeight: '700', letterSpacing: '0.5px' }}>Termômetro</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dadosBrutos
                      .filter(item => filtroTurma === 'global' || item.turmas?.id === parseInt(filtroTurma))
                      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                      .slice(0, 10)
                      .map((item) => {
                        const match = item.resumo_ia?.match(/\[(.*?)\]/);
                        const sentimento = match ? match[1] : 'Neutro';
                        const corBadge = sentimento === 'Sucesso' ? '#10b981' : sentimento === 'Crítico' ? '#ef4444' : '#f59e0b';
                        const resumoLimpo = item.resumo_ia?.replace(/\[.*?\]\s*/, '') || "Resumo não disponível";
                        const dataFormatada = new Date(item.created_at).toLocaleString('pt-BR', { 
                          day: '2-digit', month: '2-digit', year: 'numeric', 
                          hour: '2-digit', minute: '2-digit' 
                        });

                        return (
                        <tr key={item.id} style={{ transition: 'background-color 0.2s' }} onMouseOver={e => e.currentTarget.style.backgroundColor = '#f8fafc'} onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                          <td style={{...Estilos.tabelaCelula, paddingLeft: '32px', color: '#64748b', fontSize: '13px', whiteSpace: 'nowrap'}}>{dataFormatada}</td>
                          <td style={{...Estilos.tabelaCelula, fontWeight: '600', color: '#0f172a'}}>{item.turmas?.nome_treinamento}</td>
                          <td style={{...Estilos.tabelaCelula, color: '#475569', lineHeight: '1.6'}}>{resumoLimpo}</td>
                          <td style={{...Estilos.tabelaCelula, paddingRight: '32px', textAlign: 'center'}}>
                            {sentimento !== 'Neutro' ? (
                              <span style={{ border: `1px solid ${corBadge}30`, color: corBadge, padding: '6px 14px', borderRadius: '24px', fontSize: '12px', fontWeight: '700', backgroundColor: `${corBadge}10`, display: 'inline-block' }}>
                                {sentimento}
                              </span>
                            ) : <span style={{color: '#cbd5e1', fontWeight: '600'}}>-</span>}
                          </td>
                        </tr>
                      )})}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* --- TELA 2: AGENTE IA (ESTILO PREMIUM RESTAURADO) --- */}
        {abaAtiva === 'agente' && (
          <div style={{ ...Estilos.card, maxWidth: '800px', margin: '0 auto', borderTop: '4px solid #8b5cf6', padding: isMobile ? '24px' : '48px', position: 'relative' }}>
            
            {isScanning && (
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(255,255,255,0.9)', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderRadius: '24px', backdropFilter: 'blur(8px)' }}>
                <div style={{ width: '80px', height: '80px', position: 'relative', marginBottom: '24px' }}>
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, border: '4px solid #e2e8f0', borderRadius: '50%' }}></div>
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, border: '4px solid #8b5cf6', borderRadius: '50%', borderTopColor: 'transparent', animation: 'spin 1s linear infinite' }}></div>
                  <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', fontSize: '24px' }}>📄</div>
                </div>
                <h3 style={{ margin: 0, color: '#0f172a', fontSize: '18px', marginBottom: '8px', fontWeight: '800' }}>Lendo Arquivo...</h3>
                <p style={{ margin: 0, color: '#64748b', fontSize: '15px' }}>A IA está extraindo as informações e preenchendo o painel.</p>
                <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
              </div>
            )}
            
            <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '16px' : '20px', marginBottom: '16px', flexDirection: isMobile ? 'column' : 'row', textAlign: isMobile ? 'center' : 'left' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: 'linear-gradient(135deg, #ede9fe 0%, #ddd6fe 100%)', color: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', boxShadow: '0 4px 12px rgba(139, 92, 246, 0.15)' }}>
                ✨
              </div>
              <div>
                <h2 style={{ margin: 0, color: '#0f172a', fontSize: '24px', fontWeight: '800', letterSpacing: '-0.5px' }}>Processamento de Linguagem Natural</h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                   <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981', boxShadow: '0 0 0 3px rgba(16,185,129,0.2)' }}></span>
                   <span style={{ color: '#10b981', fontSize: '13px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Motor de Extração Ativo</span>
                </div>
              </div>
            </div>
            
            <p style={{ color: '#475569', fontSize: '16px', marginBottom: '40px', lineHeight: '1.6' }}>
              O Agente IA analisará textos desestruturados, identificará as métricas e preencherá automaticamente os gráficos do dashboard do treinamento selecionado.
            </p>

            <form onSubmit={enviarParaAgente} style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
              
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '700', color: '#1e293b', marginBottom: '12px' }}>
                  1. Qual template o agente deve usar como base?
                </label>
                <div style={{ position: 'relative' }}>
                  <select 
                    value={turmaSelecionada} 
                    onChange={(e) => setTurmaSelecionada(e.target.value)} 
                    style={{ width: '100%', padding: '16px 20px', borderRadius: '12px', border: '2px solid #e2e8f0', backgroundColor: '#f8fafc', fontSize: '15px', color: '#0f172a', outline: 'none', appearance: 'none', cursor: 'pointer', transition: 'border-color 0.2s', fontWeight: '500' }} 
                    onFocus={(e) => e.target.style.borderColor = '#8b5cf6'}
                    onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                    required
                  >
                    <option value="">Selecione um treinamento...</option>
                    {turmasParaSelect.map(t => <option key={t.id} value={t.id}>{t.nome_treinamento}</option>)}
                  </select>
                  <div style={{ position: 'absolute', right: '20px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#64748b', fontSize: '12px' }}>▼</div>
                </div>
              </div>

              <div>
                <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '14px', fontWeight: '700', color: '#1e293b', marginBottom: '12px' }}>
                  <span>2. Cole os dados brutos OU anexe um arquivo</span>
                  <span style={{ color: '#8b5cf6', backgroundColor: '#f5f3ff', padding: '6px 12px', borderRadius: '20px', fontSize: '12px', border: '1px solid #ede9fe', fontWeight: '600' }}>Suporta PDF/Word</span>
                </label>
                
                <div style={{ display: 'flex', gap: '16px', marginBottom: '16px', flexDirection: isMobile ? 'column' : 'row' }}>
                   <div style={{ flex: 1, position: 'relative' }}>
                     <input 
                       type="file" 
                       accept=".pdf,.doc,.docx"
                       onChange={(e) => {
                         if (e.target.files && e.target.files[0]) {
                           setArquivoUpload(e.target.files[0]);
                           setTextoAvaliacao(''); // Limpa o texto se anexar arquivo
                         }
                       }}
                       style={{ opacity: 0, position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', cursor: 'pointer' }}
                     />
                     <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', backgroundColor: '#f8fafc', border: '2px dashed #cbd5e1', borderRadius: '12px', color: '#475569', fontSize: '15px', fontWeight: '600', transition: 'all 0.2s' }} onMouseOver={e => e.currentTarget.style.borderColor = '#8b5cf6'} onMouseOut={e => e.currentTarget.style.borderColor = '#cbd5e1'}>
                       {arquivoUpload ? `📁 ${arquivoUpload.name}` : '📎 Clique para anexar arquivo PDF ou Word'}
                     </div>
                   </div>
                   {arquivoUpload && (
                     <button type="button" onClick={() => setArquivoUpload(null)} style={{ padding: '0 24px', backgroundColor: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: '12px', fontWeight: '700', cursor: 'pointer', transition: '0.2s' }} onMouseOver={e => e.currentTarget.style.backgroundColor='#fca5a5'} onMouseOut={e => e.currentTarget.style.backgroundColor='#fee2e2'}>
                       Remover
                     </button>
                   )}
                </div>

                {!arquivoUpload && (
                  <div style={{ border: '2px solid #e2e8f0', borderRadius: '12px', backgroundColor: '#ffffff', transition: 'all 0.2s', overflow: 'hidden' }} onFocusCapture={(e) => e.currentTarget.style.borderColor = '#8b5cf6'} onBlurCapture={(e) => e.currentTarget.style.borderColor = '#e2e8f0'}>
                    <textarea 
                      rows="8" 
                      value={textoAvaliacao} 
                      onChange={(e) => setTextoAvaliacao(e.target.value)} 
                      placeholder="Exemplo: Na turma de hoje tivemos 5 avaliações. 3 pessoas disseram que o conhecimento do gestor foi nota 10..." 
                      style={{ width: '100%', padding: '20px', border: 'none', backgroundColor: 'transparent', resize: 'vertical', fontSize: '15px', color: '#334155', outline: 'none', boxSizing: 'border-box', lineHeight: '1.6' }} 
                    />
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', paddingTop: '32px', borderTop: '1px solid #f1f5f9', flexWrap: 'wrap', gap: '16px' }}>
                <span style={{ fontSize: '14px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '10px', fontWeight: '500' }}>
                  <span style={{ position: 'relative', display: 'flex', width: '12px', height: '12px' }}>
                    <span style={{ position: 'absolute', width: '100%', height: '100%', borderRadius: '50%', backgroundColor: '#10b981', opacity: '0.7', animation: 'ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite' }}></span>
                    <span style={{ position: 'relative', width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#10b981' }}></span>
                  </span>
                  Sistema Operacional Conectado
                </span>
                
                <button 
                  type="submit" 
                  disabled={processando} 
                  style={{ 
                    width: isMobile ? '100%' : 'auto',
                    padding: '16px 40px', 
                    background: processando ? '#cbd5e1' : 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)', 
                    color: 'white', 
                    border: 'none', 
                    borderRadius: '12px', 
                    fontWeight: '700', 
                    fontSize: '16px', 
                    cursor: processando ? 'not-allowed' : 'pointer',
                    boxShadow: processando ? 'none' : '0 8px 20px -4px rgba(139, 92, 246, 0.4)',
                    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '12px'
                  }}
                  onMouseOver={(e) => { if(!processando) e.currentTarget.style.transform = 'translateY(-2px)' }}
                  onMouseOut={(e) => { if(!processando) e.currentTarget.style.transform = 'translateY(0)' }}
                >
                  {processando ? '⏳ Extraindo Dados...' : '✨ Executar Agente IA'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* --- TELA 3: CRIAR FORMULÁRIOS (ESTILO PREMIUM RESTAURADO) --- */}
        {abaAtiva === 'criar' && (
          <div style={{ ...Estilos.card, maxWidth: '850px', margin: '0 auto', borderTop: '4px solid #10b981', padding: isMobile ? '24px' : '48px' }}>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '16px' : '20px', marginBottom: '40px', flexDirection: isMobile ? 'column' : 'row', textAlign: isMobile ? 'center' : 'left' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.15)' }}>📋</div>
              <div>
                <h2 style={{ margin: 0, color: '#0f172a', fontSize: '24px', fontWeight: '800', letterSpacing: '-0.5px' }}>Construtor de Templates</h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                   <span style={{ color: '#64748b', fontSize: '14px', fontWeight: '500' }}>Defina as métricas que a IA irá extrair e analisar</span>
                </div>
              </div>
            </div>

            <form onSubmit={salvarTurma} style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
              <div style={{ backgroundColor: '#ffffff', padding: '24px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '800', color: '#64748b', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Nome da Jornada / Treinamento
                </label>
                <input type="text" value={nomeTurma} onChange={(e) => setNomeTurma(e.target.value)} placeholder="Ex: Formação de Liderança 2026" style={{ width: '100%', padding: '16px 20px', border: '2px solid #e2e8f0', backgroundColor: '#f8fafc', borderRadius: '12px', fontSize: '16px', color: '#0f172a', fontWeight: '500', outline: 'none', transition: 'all 0.2s ease', boxSizing: 'border-box' }} onFocus={(e) => { e.target.style.borderColor = '#10b981'; e.target.style.backgroundColor = '#ffffff'; }} onBlur={(e) => { e.target.style.borderColor = '#e2e8f0'; e.target.style.backgroundColor = '#f8fafc'; }} required />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <h3 style={{ margin: 0, fontSize: '18px', color: '#0f172a', fontWeight: '800' }}>Estrutura de Perguntas</h3>
                  <span style={{ fontSize: '13px', color: '#10b981', backgroundColor: '#ecfdf5', padding: '4px 12px', borderRadius: '20px', fontWeight: '700' }}>{perguntas.length} critério(s)</span>
                </div>

                {perguntas.map((p, pIndex) => (
                  <div key={pIndex} style={{ backgroundColor: '#ffffff', padding: '24px', borderRadius: '16px', border: '1px solid #e2e8f0', marginBottom: '24px', boxShadow: '0 4px 12px rgba(0,0,0,0.02)', position: 'relative', transition: 'all 0.3s ease' }} onMouseOver={e => e.currentTarget.style.borderColor = '#cbd5e1'} onMouseOut={e => e.currentTarget.style.borderColor = '#e2e8f0'}>
                    
                    <div style={{ display: 'flex', gap: '16px', marginBottom: '16px', alignItems: 'flex-start', flexDirection: isMobile ? 'column' : 'row' }}>
                      <div style={{ flex: 1, width: '100%' }}>
                        <input type="text" value={p.texto} onChange={(e) => {const n=[...perguntas]; n[pIndex].texto=e.target.value; setPerguntas(n);}} placeholder="Digite a pergunta ou critério de avaliação..." style={{ width: '100%', padding: '12px 0', border: 'none', borderBottom: '2px solid #e2e8f0', backgroundColor: 'transparent', fontSize: '16px', color: '#1e293b', fontWeight: '600', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s' }} onFocus={(e) => e.target.style.borderBottomColor = '#10b981'} onBlur={(e) => e.target.style.borderBottomColor = '#e2e8f0'} required />
                      </div>
                      <div style={{ display: 'flex', gap: '12px', width: isMobile ? '100%' : 'auto' }}>
                        <select value={p.tipo} onChange={(e) => {const n=[...perguntas]; n[pIndex].tipo=e.target.value; if(e.target.value!=='texto' && n[pIndex].opcoes.length===0) n[pIndex].opcoes=['Opção 1']; setPerguntas(n);}} style={{ flex: 1, padding: '12px 16px', borderRadius: '10px', border: '2px solid #e2e8f0', backgroundColor: '#f8fafc', color: '#475569', fontWeight: '600', cursor: 'pointer', outline: 'none', fontSize: '13px', transition: 'border-color 0.2s' }} onFocus={(e) => e.target.style.borderColor = '#10b981'} onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}>
                          <option value="texto">Texto Curto</option>
                          <option value="unica_escolha">Única Escolha</option>
                          <option value="multipla_escolha">Múltipla Escolha</option>
                        </select>
                        <button type="button" onClick={() => setPerguntas(perguntas.filter((_, i) => i !== pIndex))} style={{ width: '44px', height: '44px', background: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: '0.2s' }} onMouseOver={e=>e.currentTarget.style.backgroundColor='#fca5a5'} onMouseOut={e=>e.currentTarget.style.backgroundColor='#fee2e2'} title="Remover pergunta">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                        </button>
                      </div>
                    </div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: '500', color: '#64748b', marginTop: '16px', cursor: 'pointer' }}>
                      <input 
                        type="checkbox" 
                        checked={p.obrigatoria || false} 
                        onChange={(e) => {const n=[...perguntas]; n[pIndex].obrigatoria=e.target.checked; setPerguntas(n);}} 
                        style={{ accentColor: '#10b981', width: '18px', height: '18px', cursor: 'pointer' }}
                      />
                      Campo obrigatório
                    </label>

                    {p.tipo !== 'texto' && (
                      <div style={{ paddingLeft: '24px', borderLeft: '2px solid #10b981', marginTop: '24px' }}>
                        {p.opcoes.map((opcao, oIdx) => (
                          <div key={oIdx} style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                            <span style={{ color: '#cbd5e1', fontSize: '16px' }}>{p.tipo === 'unica_escolha' ? '○' : '☐'}</span>
                            <input type="text" value={opcao} onChange={(e) => {const n=[...perguntas]; n[pIndex].opcoes[oIdx]=e.target.value; setPerguntas(n);}} style={{ padding: '10px 16px', border: '2px solid #e2e8f0', backgroundColor: '#f8fafc', borderRadius: '8px', fontSize: '14px', color: '#334155', fontWeight: '500', width: isMobile ? '100%' : '320px', outline: 'none', transition: 'border-color 0.2s' }} onFocus={(e) => e.target.style.borderColor = '#10b981'} onBlur={(e) => e.target.style.borderColor = '#e2e8f0'} required />
                            {p.opcoes.length > 1 && (<button type="button" onClick={() => {const n=[...perguntas]; n[pIndex].opcoes.splice(oIdx, 1); setPerguntas(n);}} style={{ border: 'none', background: 'transparent', color: '#94a3b8', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }} onMouseOver={e=>e.currentTarget.style.color='#ef4444'} onMouseOut={e=>e.currentTarget.style.color='#94a3b8'}>Remover</button>)}
                          </div>
                        ))}
                        <button type="button" onClick={() => {const n=[...perguntas]; n[pIndex].opcoes.push(`Opção ${n[pIndex].opcoes.length+1}`); setPerguntas(n);}} style={{ marginTop: '12px', padding: '8px 16px', fontSize: '13px', background: '#ecfdf5', color: '#10b981', border: '1px solid #dcfce7', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', transition: '0.2s' }} onMouseOver={e=>e.currentTarget.style.backgroundColor='#d1fae5'} onMouseOut={e=>e.currentTarget.style.backgroundColor='#ecfdf5'}>+ Adicionar Opção</button>
                      </div>
                    )}
                  </div>
                ))}

                <button type="button" onClick={() => setPerguntas([...perguntas, { texto: '', tipo: 'texto', opcoes: [], obrigatoria: false }])} style={{ width: '100%', padding: '20px', background: '#f8fafc', color: '#10b981', border: '2px dashed #a7f3d0', borderRadius: '16px', cursor: 'pointer', fontWeight: '700', fontSize: '15px', transition: '0.2s' }} onMouseOver={(e) => { e.target.style.backgroundColor = '#ecfdf5'; e.target.style.borderColor = '#10b981'; }} onMouseOut={(e) => { e.target.style.backgroundColor = '#f8fafc'; e.target.style.borderColor = '#a7f3d0'; }}>+ Adicionar Novo Critério de Avaliação</button>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '32px', borderTop: '1px solid #e2e8f0' }}>
                <button type="submit" disabled={processando} style={{ width: isMobile ? '100%' : 'auto', padding: '16px 48px', background: processando ? '#94a3b8' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: 'white', border: 'none', borderRadius: '12px', fontWeight: '800', fontSize: '16px', cursor: processando ? 'not-allowed' : 'pointer', boxShadow: '0 8px 20px -4px rgba(16, 185, 129, 0.4)', transition: 'transform 0.2s ease, box-shadow 0.2s ease' }} onMouseOver={(e) => { if(!processando) e.currentTarget.style.transform = 'translateY(-2px)' }} onMouseOut={(e) => { if(!processando) e.currentTarget.style.transform = 'translateY(0)' }}>
                  {processando ? 'Gerando Formulário...' : 'Publicar Template e Gerar Link'}
                </button>
              </div>

            </form>
            {/* SEÇÃO REDESENHADA: GRID DE TEMPLATES CADASTRADOS */}
            <div style={{ marginTop: '56px', paddingTop: '40px', borderTop: '2px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                <h3 style={{ margin: 0, color: '#0f172a', fontSize: '20px', fontWeight: '800' }}>Gerenciamento de Templates</h3>
                <span style={{ fontSize: '13px', color: '#64748b', background: '#f1f5f9', padding: '6px 14px', borderRadius: '24px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  {turmasParaSelect.length} templates
                </span>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(280px, 1fr))', gap: '24px' }}>
                {turmasParaSelect.map(t => (
                  <div key={t.id} style={{ backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '24px', transition: 'all 0.3s ease', boxShadow: '0 4px 12px rgba(0,0,0,0.03)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', opacity: t.ativo === false ? 0.6 : 1 }} onMouseOver={e=>e.currentTarget.style.transform='translateY(-2px)'} onMouseOut={e=>e.currentTarget.style.transform='translateY(0)'}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                        <h4 style={{ margin: 0, color: '#0f172a', fontSize: '16px', lineHeight: '1.4', fontWeight: '800', paddingRight: '12px' }}>{t.nome_treinamento}</h4>
                        
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: '700', padding: '6px 12px', borderRadius: '24px', backgroundColor: t.ativo === false ? '#fee2e2' : '#dcfce7', color: t.ativo === false ? '#ef4444' : '#16a34a', whiteSpace: 'nowrap' }}>
                           <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: t.ativo === false ? '#ef4444' : '#16a34a', boxShadow: `0 0 0 2px ${t.ativo === false ? 'rgba(239,68,68,0.2)' : 'rgba(22,163,74,0.2)'}` }}></span>
                           {t.ativo === false ? 'Inativo' : 'Ativo'}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 24px 0', fontSize: '13px', color: '#64748b', fontWeight: '500' }}>
                        <span style={{ background: '#f8fafc', padding: '4px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: '700', border: '1px solid #e2e8f0' }}>ID: {t.id}</span>
                        <span>•</span>
                        <span>{t.perguntas_json ? t.perguntas_json.length : 0} critérios mapeados</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '12px', borderTop: '2px dashed #f1f5f9', paddingTop: '20px' }}>
                      <a href={`/responder/${t.slug || t.id}`} target="_blank" rel="noopener noreferrer" style={{ flex: 1, textAlign: 'center', padding: '12px', backgroundColor: '#f0f9ff', color: '#0284c7', textDecoration: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: '700', transition: '0.2s', border: '1px solid #e0f2fe' }} onMouseOver={e=>e.currentTarget.style.backgroundColor='#e0f2fe'} onMouseOut={e=>e.currentTarget.style.backgroundColor='#f0f9ff'}>Acessar Link</a>
                      <button onClick={() => alternarStatusTemplate(t.id, t.ativo !== false)} style={{ flex: 1, padding: '12px', backgroundColor: t.ativo === false ? '#10b981' : '#ffffff', color: t.ativo === false ? '#ffffff' : '#64748b', border: t.ativo === false ? 'none' : '2px solid #e2e8f0', borderRadius: '10px', fontSize: '14px', fontWeight: '700', cursor: 'pointer', transition: '0.2s' }} onMouseOver={e=>{if(t.ativo !== false) e.currentTarget.style.backgroundColor='#f8fafc'}} onMouseOut={e=>{if(t.ativo !== false) e.currentTarget.style.backgroundColor='#ffffff'}}>
                        {t.ativo === false ? 'Reativar' : 'Desativar'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

export default Dashboard;