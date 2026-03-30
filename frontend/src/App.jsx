import { useState } from 'react'

function App() {
  const [texto, setTexto] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [erro, setErro] = useState(null);

  const enviarAvaliacao = async (e) => {
    e.preventDefault(); // Evita que a página recarregue
    setCarregando(true);
    setErro(null);
    setResultado(null);

    try {
      const resposta = await fetch('http://localhost:8000/api/avaliar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ texto_avaliacao: texto }),
      });

      if (!resposta.ok) {
        throw new Error('Falha ao processar a avaliação.');
      }

      const dados = await resposta.json();
      setResultado(dados);
      setTexto(''); // Limpa o campo após o sucesso
      
    } catch (err) {
      setErro(err.message);
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div style={{ maxWidth: '600px', margin: '40px auto', fontFamily: 'sans-serif', padding: '20px' }}>
      <h2>Desafio: Análise de Avaliações com IA</h2>
      
      <form onSubmit={enviarAvaliacao} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <label>
          <strong>Digite o texto da avaliação:</strong>
        </label>
        <textarea 
          rows="5" 
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Ex: O funcionário não foi resolutivo e explicou de forma complexa..."
          style={{ padding: '10px', borderRadius: '5px', border: '1px solid #ccc', resize: 'vertical' }}
          required
        />
        
        <button 
          type="submit" 
          disabled={carregando}
          style={{ 
            padding: '12px', 
            backgroundColor: carregando ? '#ccc' : '#007bff', 
            color: 'white', 
            border: 'none', 
            borderRadius: '5px',
            cursor: carregando ? 'not-allowed' : 'pointer',
            fontWeight: 'bold'
          }}
        >
          {carregando ? 'Analisando com IA...' : 'Enviar Avaliação'}
        </button>
      </form>

      {erro && (
        <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#ffebee', color: '#c62828', borderRadius: '5px' }}>
          Erro: {erro}
        </div>
      )}

      {resultado && (
        <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#e8f5e9', border: '1px solid #4caf50', borderRadius: '5px' }}>
          <h3 style={{ marginTop: 0, color: '#2e7d32' }}>Avaliação Salva com Sucesso!</h3>
          <p><strong>Resolutividade:</strong> {resultado.dados_extraidos_ia.resolutividade}</p>
          <p><strong>Simples:</strong> {resultado.dados_extraidos_ia.simplicidade ? 'Sim' : 'Não'}</p>
          <p><strong>Resumo:</strong> {resultado.dados_extraidos_ia.resumo}</p>
        </div>
      )}
    </div>
  )
}

export default App