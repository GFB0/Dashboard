import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

function Dashboard() {
  const [abaAtiva, setAbaAtiva] = useState('painel'); 
  const [filtroTurma, setFiltroTurma] = useState('global'); 
  
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

  const CORES = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#14b8a6', '#f43f5e'];
  const CORES_TERMOMETRO = { 'Sucesso': '#10b981', 'Atenção': '#f59e0b', 'Crítico': '#ef4444' };

  const carregarDados = async () => {
    try {
      const resTurmas = await fetch('http://localhost:8000/api/turmas');
      const jsonTurmas = await resTurmas.json();
      if (jsonTurmas.sucesso) setTurmasParaSelect(jsonTurmas.turmas);

      if (abaAtiva === 'painel') {
        const resDash = await fetch('http://localhost:8000/api/dashboard');
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

  useEffect(() => { carregarDados(); }, [abaAtiva]);

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
        <div style={Estilos.chartGrid}>
         {perguntasFechadas.map((pergunta, index) => {
            const contagem = {};
            
            dadosDestaTurma.forEach(av => {
              let resposta = av.respostas_ia[pergunta.texto];
              
              // NOVO: Filtro inteligente para forçar a formatação exata da opção original
              const normalizar = (texto) => {
                 if (typeof texto !== 'string') return texto;
                 const limpo = texto.trim().toLowerCase(); // Tira espaços extras e joga pra minúsculo
                 // Procura nas opções originais se existe uma igualzinha
                 const encontrada = (pergunta.opcoes || []).find(op => op.trim().toLowerCase() === limpo);
                 return encontrada || texto.trim(); // Se achar, usa a original oficial. Se não, usa a limpa.
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

            // O restante continua igual...x
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
          <div style={{ marginTop: '32px' }}>
            <h3 style={{ color: '#0f172a', fontSize: '18px', borderBottom: '2px solid #e2e8f0', paddingBottom: '8px', marginBottom: '24px' }}>
              Comentários e Observações (Texto Livre)
            </h3>
            <div style={Estilos.cardGrid}>
              {perguntasAbertas.map((pergunta, index) => (
                <div key={`aberta-${index}`} style={{...Estilos.card, backgroundColor: '#f8fafc'}}>
                  <h4 style={{ margin: '0 0 16px 0', fontSize: '14px', color: '#334155' }}>{pergunta.texto}</h4>
                  <ul style={{ margin: 0, paddingLeft: '20px', color: '#475569', fontSize: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {dadosDestaTurma
                      .filter(av => av.respostas_ia[pergunta.texto])
                      .slice(-5) 
                      .map((av, idx) => (
                        <li key={idx} style={{ paddingBottom: '8px', borderBottom: '1px dashed #cbd5e1' }}>
                          {av.respostas_ia[pergunta.texto]}
                        </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}
      </>
    );
  };

  const alternarStatusTemplate = async (id, statusAtual) => {
    try {
      await fetch(`http://localhost:8000/api/turmas/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ativo: !statusAtual })
      });
      carregarDados(); // Atualiza a tela instantaneamente
    } catch (err) { alert("Erro ao alterar status."); }
  };

  const salvarTurma = async (e) => {
    e.preventDefault(); setProcessando(true);
    const validas = perguntas.filter(p => p.texto.trim() !== '');
    try {
      await fetch('http://localhost:8000/api/turmas', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nome_treinamento: nomeTurma, perguntas: validas }) });
      alert("Sucesso!"); setNomeTurma(''); setPerguntas([{ texto: '', tipo: 'texto', opcoes: [] }]); carregarDados();
    } catch (err) { alert("Erro."); } finally { setProcessando(false); }
  };

  const enviarParaAgente = async (e) => {
    e.preventDefault(); setProcessando(true);
    try {
      await fetch('http://localhost:8000/api/avaliar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ turma_id: parseInt(turmaSelecionada), texto_avaliacao: textoAvaliacao }) });
      alert("Sucesso!"); setTextoAvaliacao(''); setAbaAtiva('painel'); carregarDados();
    } catch (err) { alert("Erro na IA."); } finally { setProcessando(false); }
  };

  // --- ESTILOS MODERNOS ---
  const Estilos = {
    layout: { display: 'flex', minHeight: '100vh', backgroundColor: '#f1f5f9', fontFamily: "'Inter', sans-serif" },
    sidebar: { width: '260px', backgroundColor: '#0f172a', color: '#fff', display: 'flex', flexDirection: 'column' },
    logo: { padding: '24px', fontSize: '20px', fontWeight: '800', borderBottom: '1px solid #1e293b', display: 'flex', alignItems: 'center', gap: '12px' },
    menuItem: (ativo) => ({ padding: '16px 24px', cursor: 'pointer', backgroundColor: ativo ? '#1e293b' : 'transparent', borderLeft: ativo ? '4px solid #3b82f6' : '4px solid transparent', color: ativo ? '#fff' : '#94a3b8', fontSize: '14px', transition: '0.2s' }),
    main: { flex: 1, padding: '32px', overflowY: 'auto', height: '100vh', boxSizing: 'border-box' },
    cardGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '24px', marginBottom: '32px' },
    chartGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px', marginBottom: '32px' },
    card: { backgroundColor: '#fff', padding: '24px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' },
    tabelaCelula: { padding: '16px', color: '#334155', fontSize: '14px', borderBottom: '1px solid #e2e8f0' }
  };

  return (
    <div style={Estilos.layout}>
      
      <div style={Estilos.sidebar}>
        <div style={Estilos.logo}><div style={{ width: '28px', height: '28px', background: '#3b82f6', borderRadius: '6px' }}></div> Training Intelligence</div>
        <div style={{ padding: '24px 0' }}>
          <div style={Estilos.menuItem(abaAtiva === 'painel')} onClick={() => setAbaAtiva('painel')}>📊 Visão Global / Relatórios</div>
          <div style={Estilos.menuItem(abaAtiva === 'agente')} onClick={() => setAbaAtiva('agente')}>🤖 Agente de Extração (IA)</div>
          <div style={Estilos.menuItem(abaAtiva === 'criar')} onClick={() => setAbaAtiva('criar')}>⚙️ Construtor de Templates</div>
        </div>
      </div>

      <div style={Estilos.main}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
          <div>
            <h1 style={{ fontSize: '24px', color: '#0f172a', margin: 0 }}>Hub de Treinamentos</h1>
            {abaAtiva === 'painel' && (
              <select 
                value={filtroTurma} 
                onChange={(e) => setFiltroTurma(e.target.value)}
                style={{ marginTop: '12px', padding: '10px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '15px', color: '#0f172a', outline: 'none', backgroundColor: '#fff', cursor: 'pointer', fontWeight: '500', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
              >
                <option value="global">🌍 Metamétricas Globais (Todos os Treinamentos)</option>
                {turmasDisponiveis.map(t => (
                  <option key={t.id} value={t.id}>📌 Aprofundar em: {t.nome_treinamento}</option>
                ))}
              </select>
            )}
          </div>
          <div style={{ padding: '8px 16px', background: '#fff', borderRadius: '20px', border: '1px solid #e2e8f0', color: '#334155', fontWeight: '600' }}>Coordenação AD</div>
        </div>

        {/* --- TELA 1: DASHBOARD --- */}
        {abaAtiva === 'painel' && (
          <>
            {filtroTurma === 'global' ? (
              <>
                <div style={Estilos.cardGrid}>
                  <div style={{...Estilos.card, borderLeft: '4px solid #3b82f6'}}>
                    <div style={{fontSize: '13px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase'}}>Avaliações Processadas</div>
                    <div style={{fontSize: '32px', fontWeight: '800', marginTop: '8px', color: '#0f172a'}}>{kpis.total}</div>
                  </div>
                  <div style={{...Estilos.card, borderLeft: '4px solid #f59e0b'}}>
                    <div style={{fontSize: '13px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase'}}>Jornadas/Treinamentos Ativos</div>
                    <div style={{fontSize: '32px', fontWeight: '800', marginTop: '8px', color: '#0f172a'}}>{kpis.treinosAtivos}</div>
                  </div>
                  <div style={{...Estilos.card, borderLeft: '4px solid #10b981', backgroundColor: '#f0fdf4'}}>
                    <div style={{fontSize: '13px', color: '#059669', fontWeight: '700', textTransform: 'uppercase'}}>ROI da Inteligência Artificial</div>
                    <div style={{fontSize: '32px', fontWeight: '800', marginTop: '8px', color: '#047857'}}>{kpis.horasPoupadas}h</div>
                    <div style={{fontSize: '12px', color: '#10b981', marginTop: '4px'}}>de análise poupadas</div>
                  </div>
                </div>

                <div style={Estilos.chartGrid}>
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

            {/* TABELA DE FEED */}
            <div style={{...Estilos.card, padding: 0, overflow: 'hidden', marginTop: '32px'}}>
              <div style={{ padding: '24px', borderBottom: '1px solid #e2e8f0' }}>
                <h3 style={{ margin: 0, fontSize: '16px' }}>Log Analítico de Avaliações</h3>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ backgroundColor: '#f8fafc', color: '#64748b', fontSize: '12px', textTransform: 'uppercase', padding: '16px', textAlign: 'left', borderBottom: '1px solid #e2e8f0', fontWeight: '600' }}>Jornada</th>
                    <th style={{ backgroundColor: '#f8fafc', color: '#64748b', fontSize: '12px', textTransform: 'uppercase', padding: '16px', textAlign: 'left', borderBottom: '1px solid #e2e8f0', fontWeight: '600' }}>Insights Consolidados (IA)</th>
                    <th style={{ backgroundColor: '#f8fafc', color: '#64748b', fontSize: '12px', textTransform: 'uppercase', padding: '16px', textAlign: 'center', borderBottom: '1px solid #e2e8f0', fontWeight: '600' }}>Termômetro</th>
                  </tr>
                </thead>
                <tbody>
                  {dadosBrutos
                    .filter(item => filtroTurma === 'global' || item.turmas?.id === parseInt(filtroTurma))
                    .slice(-10).reverse().map((item) => {
                      const match = item.resumo_ia?.match(/\[(.*?)\]/);
                      const sentimento = match ? match[1] : 'Neutro';
                      const corBadge = sentimento === 'Sucesso' ? '#10b981' : sentimento === 'Crítico' ? '#ef4444' : '#f59e0b';
                      const resumoLimpo = item.resumo_ia?.replace(/\[.*?\]\s*/, '') || "Resumo não disponível";

                      return (
                      <tr key={item.id}>
                        <td style={{...Estilos.tabelaCelula, fontWeight: '600', color: '#0f172a'}}>{item.turmas?.nome_treinamento}</td>
                        <td style={{...Estilos.tabelaCelula, color: '#475569', lineHeight: '1.5'}}>{resumoLimpo}</td>
                        <td style={{...Estilos.tabelaCelula, textAlign: 'center'}}>
                          {sentimento !== 'Neutro' ? (
                            <span style={{ border: `1px solid ${corBadge}`, color: corBadge, padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '700', backgroundColor: `${corBadge}10` }}>
                              {sentimento}
                            </span>
                          ) : <span style={{color: '#cbd5e1'}}>-</span>}
                        </td>
                      </tr>
                    )})}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* --- TELA 2: AGENTE IA (ESTILO PREMIUM RESTAURADO) --- */}
        {abaAtiva === 'agente' && (
          <div style={{ ...Estilos.card, maxWidth: '800px', margin: '0 auto', borderTop: '4px solid #8b5cf6', padding: '32px' }}>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '12px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#ede9fe', color: '#8b5cf6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', boxShadow: '0 2px 4px rgba(139, 92, 246, 0.1)' }}>
                ✨
              </div>
              <div>
                <h2 style={{ marginTop: 0, marginBottom: '4px', color: '#0f172a', fontSize: '22px' }}>Processamento de Linguagem Natural</h2>
                <span style={{ color: '#64748b', fontSize: '14px' }}>Motor de Extração Ativo</span>
              </div>
            </div>
            
            <p style={{ color: '#475569', fontSize: '15px', marginBottom: '32px', lineHeight: '1.6' }}>
              O Agente IA analisará textos desestruturados, identificará as métricas e preencherá automaticamente os gráficos do dashboard do treinamento selecionado.
            </p>

            <form onSubmit={enviarParaAgente} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#1e293b', marginBottom: '8px' }}>
                  1. Qual template o agente deve usar como base?
                </label>
                <div style={{ position: 'relative' }}>
                  <select 
                    value={turmaSelecionada} 
                    onChange={(e) => setTurmaSelecionada(e.target.value)} 
                    style={{ width: '100%', padding: '14px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', fontSize: '15px', color: '#0f172a', outline: 'none', appearance: 'none', cursor: 'pointer', transition: 'border-color 0.2s' }} 
                    required
                  >
                    <option value="">Selecione um treinamento...</option>
                    {turmasParaSelect.map(t => <option key={t.id} value={t.id}>{t.nome_treinamento}</option>)}
                  </select>
                  <div style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#64748b', fontSize: '12px' }}>▼</div>
                </div>
              </div>

              <div>
                <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '14px', fontWeight: '600', color: '#1e293b', marginBottom: '8px' }}>
                  <span>2. Cole os dados brutos (Degravações, Feedbacks, etc)</span>
                  <span style={{ color: '#8b5cf6', backgroundColor: '#ede9fe', padding: '4px 10px', borderRadius: '20px', fontSize: '12px' }}>Aceita lotes</span>
                </label>
                
                <div style={{ border: '2px dashed #cbd5e1', borderRadius: '12px', padding: '4px', backgroundColor: '#fcfcfd', transition: 'all 0.2s' }}>
                  <textarea 
                    rows="10" 
                    value={textoAvaliacao} 
                    onChange={(e) => setTextoAvaliacao(e.target.value)} 
                    placeholder="Exemplo: Na turma de hoje tivemos 5 avaliações. 3 pessoas disseram que o conhecimento do gestor foi nota 10, mas 2 reclamaram da aptidão para o cargo..." 
                    style={{ width: '100%', padding: '16px', border: 'none', backgroundColor: 'transparent', resize: 'vertical', fontSize: '15px', color: '#334155', outline: 'none', boxSizing: 'border-box', lineHeight: '1.6' }} 
                    required 
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px', paddingTop: '24px', borderTop: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '13px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ position: 'relative', display: 'flex', width: '10px', height: '10px' }}>
                    <span style={{ position: 'absolute', width: '100%', height: '100%', borderRadius: '50%', backgroundColor: '#10b981', opacity: '0.7', animation: 'ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite' }}></span>
                    <span style={{ position: 'relative', width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#10b981' }}></span>
                  </span>
                  Sistema Operacional Conectado
                </span>
                
                <button 
                  type="submit" 
                  disabled={processando} 
                  style={{ 
                    padding: '14px 32px', 
                    background: processando ? '#cbd5e1' : 'linear-gradient(135deg, #8b5cf6 0%, #3b82f6 100%)', 
                    color: 'white', 
                    border: 'none', 
                    borderRadius: '8px', 
                    fontWeight: '600', 
                    fontSize: '15px', 
                    cursor: processando ? 'not-allowed' : 'pointer',
                    boxShadow: processando ? 'none' : '0 4px 12px rgba(139, 92, 246, 0.3)',
                    transition: 'all 0.3s ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px'
                  }}
                >
                  {processando ? '⏳ Extraindo Dados...' : '✨ Executar Agente IA'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* --- TELA 3: CRIAR FORMULÁRIOS (ESTILO PREMIUM RESTAURADO) --- */}
        {abaAtiva === 'criar' && (
          <div style={{ ...Estilos.card, maxWidth: '850px', margin: '0 auto', borderTop: '4px solid #10b981', padding: '32px' }}>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#d1fae5', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>📋</div>
              <div>
                <h2 style={{ marginTop: 0, marginBottom: '4px', color: '#0f172a', fontSize: '22px' }}>Construtor de Templates</h2>
                <span style={{ color: '#64748b', fontSize: '14px' }}>Defina as métricas que a IA irá extrair</span>
              </div>
            </div>

            <form onSubmit={salvarTurma} style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
              <div style={{ backgroundColor: '#f8fafc', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '700', color: '#334155', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Nome da Jornada / Treinamento
                </label>
                <input type="text" value={nomeTurma} onChange={(e) => setNomeTurma(e.target.value)} placeholder="Ex: Formação de Liderança 2026" style={{ width: '100%', padding: '12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '16px', outline: 'none', transition: '0.2s' }} onFocus={(e) => e.target.style.borderColor = '#10b981'} onBlur={(e) => e.target.style.borderColor = '#cbd5e1'} required />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h3 style={{ margin: 0, fontSize: '16px', color: '#0f172a' }}>Estrutura de Perguntas</h3>
                  <span style={{ fontSize: '12px', color: '#64748b' }}>{perguntas.length} critério(s) adicionado(s)</span>
                </div>

                {perguntas.map((p, pIndex) => (
                  <div key={pIndex} style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '20px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', position: 'relative' }}>
                    
                    <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', alignItems: 'flex-start' }}>
                      <div style={{ flex: 1 }}>
                        <input type="text" value={p.texto} onChange={(e) => {const n=[...perguntas]; n[pIndex].texto=e.target.value; setPerguntas(n);}} placeholder="Digite a pergunta ou critério de avaliação..." style={{ width: '100%', padding: '10px', border: 'none', borderBottom: '2px solid #f1f5f9', fontSize: '15px', fontWeight: '500', outline: 'none' }} onFocus={(e) => e.target.style.borderBottomColor = '#10b981'} onBlur={(e) => e.target.style.borderBottomColor = '#f1f5f9'} required />
                      </div>
                      <select value={p.tipo} onChange={(e) => {const n=[...perguntas]; n[pIndex].tipo=e.target.value; if(e.target.value!=='texto' && n[pIndex].opcoes.length===0) n[pIndex].opcoes=['Opção 1']; setPerguntas(n);}} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', cursor: 'pointer', outline: 'none', fontSize: '13px' }}>
                        <option value="texto">Texto Curto</option>
                        <option value="unica_escolha">Única Escolha (Radio)</option>
                        <option value="multipla_escolha">Múltipla Escolha (Check)</option>
                      </select>
                      <button type="button" onClick={() => setPerguntas(perguntas.filter((_, i) => i !== pIndex))} style={{ padding: '10px', background: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }} title="Remover pergunta">✕</button>
                    </div>
                    {/* NOVO: CHECKBOX DE OBRIGATORIEDADE */}
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#64748b', marginTop: '12px', cursor: 'pointer' }}>
                      <input 
                        type="checkbox" 
                        checked={p.obrigatoria || false} 
                        onChange={(e) => {const n=[...perguntas]; n[pIndex].obrigatoria=e.target.checked; setPerguntas(n);}} 
                        style={{ accentColor: '#10b981', width: '16px', height: '16px', cursor: 'pointer' }}
                      />
                      Marcar esta pergunta como obrigatória
                    </label>

                    {p.tipo !== 'texto' && (
                      <div style={{ paddingLeft: '24px', borderLeft: '2px solid #10b981', marginTop: '16px' }}>
                        {p.opcoes.map((opcao, oIdx) => (
                          <div key={oIdx} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                            <span style={{ color: '#cbd5e1' }}>{p.tipo === 'unica_escolha' ? '○' : '☐'}</span>
                            <input type="text" value={opcao} onChange={(e) => {const n=[...perguntas]; n[pIndex].opcoes[oIdx]=e.target.value; setPerguntas(n);}} style={{ padding: '6px 12px', border: '1px solid #f1f5f9', borderRadius: '4px', fontSize: '14px', width: '280px', outline: 'none' }} onFocus={(e) => e.target.style.borderColor = '#10b981'} onBlur={(e) => e.target.style.borderColor = '#f1f5f9'} required />
                            {p.opcoes.length > 1 && (<button type="button" onClick={() => {const n=[...perguntas]; n[pIndex].opcoes.splice(oIdx, 1); setPerguntas(n);}} style={{ border: 'none', background: 'transparent', color: '#94a3b8', cursor: 'pointer', fontSize: '12px' }}>remover</button>)}
                          </div>
                        ))}
                        <button type="button" onClick={() => {const n=[...perguntas]; n[pIndex].opcoes.push(`Opção ${n[pIndex].opcoes.length+1}`); setPerguntas(n);}} style={{ marginTop: '8px', padding: '6px 12px', fontSize: '12px', background: '#f0fdf4', color: '#16a34a', border: '1px solid #dcfce7', borderRadius: '4px', cursor: 'pointer', fontWeight: '600' }}>+ Adicionar Opção</button>
                      </div>
                    )}
                  </div>
                ))}

                <button type="button" onClick={() => setPerguntas([...perguntas, { texto: '', tipo: 'texto', opcoes: [], obrigatoria: false }])} style={{ width: '100%', padding: '16px', background: 'transparent', color: '#10b981', border: '2px dashed #d1fae5', borderRadius: '12px', cursor: 'pointer', fontWeight: '600', transition: '0.2s' }} onMouseOver={(e) => e.target.style.backgroundColor = '#f0fdf4'} onMouseOut={(e) => e.target.style.backgroundColor = 'transparent'}>+ Adicionar Novo Critério de Avaliação</button>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '24px', borderTop: '1px solid #f1f5f9' }}>
                <button type="submit" disabled={processando} style={{ padding: '14px 40px', background: processando ? '#94a3b8' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '700', fontSize: '16px', cursor: processando ? 'not-allowed' : 'pointer', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)' }}>
                  {processando ? 'Gerando Formulário...' : 'Publicar Template e Gerar Link'}
                </button>
              </div>

            </form>
            {/* NOVA SEÇÃO: LISTA DE TEMPLATES CRIADOS */}
            <div style={{ marginTop: '48px', paddingTop: '32px', borderTop: '2px solid #e2e8f0' }}>
              <h3 style={{ margin: '0 0 24px 0', color: '#0f172a', fontSize: '18px' }}>Templates Cadastrados</h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {turmasParaSelect.map(t => (
                  <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', opacity: t.ativo === false ? 0.6 : 1 }}>
                    <div>
                      <div style={{ fontWeight: '600', color: '#0f172a', fontSize: '15px' }}>
                        {t.nome_treinamento} 
                        {t.ativo === false && <span style={{ marginLeft: '8px', fontSize: '11px', backgroundColor: '#ef4444', color: '#fff', padding: '2px 6px', borderRadius: '4px' }}>Inativo</span>}
                      </div>
                      <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
                        ID: {t.id} • {t.perguntas_json ? t.perguntas_json.length : 0} critérios mapeados
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                      
                      {/* NOVO BOTÃO: ACESSAR LINK DO FORMULÁRIO */}
                      <a 
                        href={`/responder/${t.id}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        style={{ padding: '8px 16px', backgroundColor: '#e0f2fe', color: '#0284c7', textDecoration: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: '600', display: 'flex', alignItems: 'center', transition: '0.2s' }}
                        title="Abrir formulário em uma nova aba"
                        onMouseOver={(e) => e.target.style.backgroundColor = '#bae6fd'}
                        onMouseOut={(e) => e.target.style.backgroundColor = '#e0f2fe'}
                      >
                        🔗 Acessar Link
                      </a>

                      {/* BOTÃO EXISTENTE DE ATIVAR/DESATIVAR */}
                      <button 
                        onClick={() => alternarStatusTemplate(t.id, t.ativo !== false)}
                        style={{ padding: '8px 16px', backgroundColor: t.ativo === false ? '#10b981' : '#f1f5f9', color: t.ativo === false ? '#fff' : '#64748b', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', transition: '0.2s' }}
                      >
                        {t.ativo === false ? 'Ativar' : 'Desativar'}
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