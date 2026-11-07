import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { ArrowUpRight, LogOut, Menu, Shield, User as UserIcon, X } from "lucide-react";
import { useAuth, useSite } from "./lib";
import { Logo } from "./ui";

const NAV = [
  { to: "/categorias", label: "Categorias" },
  { to: "/profissionais", label: "Profissionais" },
  { to: "/parcerias", label: "Parcerias" },
  { to: "/como-funciona", label: "Como funciona" },
  { to: "/contato", label: "Contato" },
];

function Header() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const loc = useLocation();
  const nav = useNavigate();
  useEffect(() => {
    setOpen(false);
  }, [loc.pathname]);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  const doLogout = async () => {
    await logout();
    nav("/");
  };
  const linkCls = ({ isActive }: { isActive: boolean }) =>
    `text-[13px] font-medium transition hover:text-brand ${isActive ? "text-brand" : "text-ink-soft"}`;

  return (
    <header className={`sticky top-0 z-40 bg-cream/95 backdrop-blur transition-shadow ${scrolled ? "shadow-[0_1px_0_#E7E2D8]" : ""}`}>
      <div className="container-x flex h-[60px] items-center justify-between gap-4">
        <Logo />
        <nav className="hidden items-center gap-6 lg:flex" aria-label="Principal">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} className={linkCls}>
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="hidden items-center gap-3 lg:flex">
          {user ? (
            <>
              {user.is_admin && (
                <Link to="/admin" className="inline-flex items-center gap-1.5 text-[13px] font-bold text-ink hover:text-brand">
                  <Shield size={14} /> Admin
                </Link>
              )}
              <Link to="/minha-conta" className="btn-primary btn-sm !px-4 !py-2">
                <UserIcon size={14} /> {user.name.split(" ")[0]}
              </Link>
              <button onClick={doLogout} className="rounded-full p-2 text-ink-soft hover:bg-cream-2" aria-label="Sair" title="Sair">
                <LogOut size={16} />
              </button>
            </>
          ) : (
            <>
              <Link to="/entrar" className="px-2 text-[13px] font-bold text-ink hover:text-brand">
                Entrar
              </Link>
              <Link to="/cadastro" className="btn-primary btn-sm !px-4 !py-2">
                Criar conta
              </Link>
            </>
          )}
        </div>
        <button className="rounded-full p-2 lg:hidden" onClick={() => setOpen((o) => !o)} aria-label={open ? "Fechar menu" : "Abrir menu"} aria-expanded={open}>
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>
      {open && (
        <div className="border-t border-line bg-cream lg:hidden">
          <nav className="container-x flex flex-col py-3" aria-label="Menu móvel">
            {NAV.map((n) => (
              <NavLink key={n.to} to={n.to} className={({ isActive }) => `rounded-lg px-2 py-3 text-[15px] font-medium ${isActive ? "text-brand" : "text-ink"}`}>
                {n.label}
              </NavLink>
            ))}
            <div className="mt-2 flex flex-col gap-2 border-t border-line pt-4">
              {user ? (
                <>
                  {user.is_admin && <Link to="/admin" className="btn-ghost">Administração</Link>}
                  <Link to="/minha-conta" className="btn-primary">Minha conta</Link>
                  <button onClick={doLogout} className="btn-ghost">Sair</button>
                </>
              ) : (
                <>
                  <Link to="/cadastro" className="btn-primary">Criar conta</Link>
                  <Link to="/entrar" className="btn-ghost">Entrar</Link>
                </>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}

function Footer() {
  const { school } = useSite();
  const schoolName = school?.name || "escola";
  return (
    <footer className="mt-auto border-t border-line bg-cream-2/60">
      <div className="container-x grid gap-10 py-12 sm:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <Logo />
          <p className="mt-4 max-w-sm text-xs leading-relaxed text-ink-soft">
            Um espaço para famílias e profissionais da {schoolName} se encontrarem e colaborarem.
          </p>
        </div>
        <div>
          <p className="eyebrow mb-4 !text-[10px]">Explore</p>
          <ul className="space-y-2.5 text-xs font-medium text-ink-soft">
            <li><Link to="/categorias" className="hover:text-brand">Categorias</Link></li>
            <li><Link to="/profissionais" className="hover:text-brand">Profissionais</Link></li>
            <li><Link to="/parcerias" className="hover:text-brand">Parcerias</Link></li>
          </ul>
        </div>
        <div>
          <p className="eyebrow mb-4 !text-[10px]">Conecta Escola</p>
          <ul className="space-y-2.5 text-xs font-medium text-ink-soft">
            <li><Link to="/como-funciona" className="hover:text-brand">Como funciona</Link></li>
            <li><Link to="/contato" className="inline-flex items-center gap-1 hover:text-brand">Fale com a equipe <ArrowUpRight size={11} /></Link></li>
            <li><Link to="/cadastro" className="hover:text-brand">Criar conta</Link></li>
            <li><Link to="/privacidade" className="hover:text-brand">Termos e privacidade</Link></li>
          </ul>
        </div>
      </div>
      <div className="container-x flex flex-col gap-1 border-t border-line py-5 text-[11px] text-ink-mute sm:flex-row sm:justify-between">
        <span>© {new Date().getFullYear()} Conecta Escola</span>
        <span>Uma rede comunitária da {schoolName}</span>
      </div>
    </footer>
  );
}

export default function Layout() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return (
    <div className="flex min-h-screen flex-col">
      <a href="#conteudo" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2">
        Pular para o conteúdo
      </a>
      <Header />
      <main id="conteudo" className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
