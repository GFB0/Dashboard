import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Formulario from './pages/Formulario';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* ROTA DO ADMIN: Onde você vai colar aquele código gigante que tínhamos antes */}
        <Route path="/" element={<Dashboard />} />
        
        {/* ROTA PÚBLICA: O link que você vai mandar no WhatsApp para responderem */}
        <Route path="/responder/:id" element={<Formulario />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
