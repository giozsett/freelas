import { createContext, useEffect, useMemo, useContext } from 'react';
import { useAuth } from './ContextoAutenticacao';

const RoleContext = createContext();

function aplicarFavicon(role) {
  const link = document.getElementById('favicon');
  if (link) link.href = role === 'contractor' ? '/favicon-contractor.svg' : '/favicon-freelancer.svg';
}

export const RoleProvider = ({ children }) => {
  const { user } = useAuth();

  // Fonte única do papel: user.profile.papel (backend). 'empresa' -> 'contractor'
  const papel = user?.profile?.papel || null;
  const role = useMemo(
    () => (papel === 'empresa' ? 'contractor' : papel === 'freelancer' ? 'freelancer' : null),
    [papel],
  );

  useEffect(() => {
    if (role) {
      document.documentElement.setAttribute('data-role', role);
      aplicarFavicon(role);
    } else {
      // Ainda não escolheu papel: volta para o visual padrão (freelancer)
      document.documentElement.removeAttribute('data-role');
      aplicarFavicon(null);
    }
  }, [role]);

  return (
    <RoleContext.Provider value={{ role }}>
      {children}
    </RoleContext.Provider>
  );
};

export const useRole = () => useContext(RoleContext);