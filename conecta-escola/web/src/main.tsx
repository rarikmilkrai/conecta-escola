import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import "./index.css";
import { AuthProvider, SiteProvider, useAuth } from "./lib";
import { Spinner } from "./ui";
import Layout from "./Layout";
import Home from "./pages/Home";
import Categorias from "./pages/Categorias";
import Profissionais from "./pages/Profissionais";
import Perfil from "./pages/Perfil";
import ComoFunciona from "./pages/ComoFunciona";
import Parcerias from "./pages/Parcerias";
import Contato from "./pages/Contato";
import { Cadastro, Entrar, RecuperarSenha } from "./pages/Auth";
import MinhaConta from "./pages/MinhaConta";
import Admin from "./pages/Admin";
import Privacidade from "./pages/Privacidade";
import QrPage from "./pages/Qr";
import NotFound from "./pages/NotFound";

function Private({ children, admin = false }: { children: React.ReactElement; admin?: boolean }) {
  const { user, ready } = useAuth();
  if (!ready) return <Spinner />;
  if (!user) return <Navigate to={`/entrar?voltar=${encodeURIComponent(location.pathname)}`} replace />;
  if (admin && !user.is_admin) return <NotFound />;
  return children;
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <SiteProvider>
        <AuthProvider>
          <Routes>
            <Route path="/qr" element={<QrPage />} />
            <Route element={<Layout />}>
              <Route path="/" element={<Home />} />
              <Route path="/categorias" element={<Categorias />} />
              <Route path="/profissionais" element={<Profissionais />} />
              <Route path="/profissionais/:slug" element={<Perfil />} />
              <Route path="/como-funciona" element={<ComoFunciona />} />
              <Route path="/parcerias" element={<Parcerias />} />
              <Route path="/contato" element={<Contato />} />
              <Route path="/cadastro" element={<Cadastro />} />
              <Route path="/entrar" element={<Entrar />} />
              <Route path="/recuperar-senha" element={<RecuperarSenha />} />
              <Route path="/privacidade" element={<Privacidade />} />
              <Route path="/minha-conta" element={<Private><MinhaConta /></Private>} />
              <Route path="/admin" element={<Private admin><Admin /></Private>} />
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </AuthProvider>
      </SiteProvider>
    </BrowserRouter>
  </React.StrictMode>
);
